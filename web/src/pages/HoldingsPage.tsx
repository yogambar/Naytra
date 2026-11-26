import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card3D } from '../design/Card3D';
import { Tabs } from '../design/Tabs';
import { Skeleton } from '../design/Skeleton';
import { Eye, EyeOff, Briefcase, TrendingDown } from 'lucide-react';
import { useSyncedWallet } from '../context/WalletContext';
import { fetchMarketTickers, MarketTicker } from '../services/marketService';
import { HoldingsTable, type HoldingsRowData } from '../components/holdings/HoldingsTable';
import { OrderTicketPanel } from '../components/holdings/OrderTicketPanel';
import { StockChartModal } from '../components/market/StockChartModal';

type HoldingsSegment = 'all' | 'delivery' | 'intraday';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function signedINR(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatINR(value)}`;
}

function signedPct(pct: number): string {
  const prefix = pct >= 0 ? '+' : '';
  return `${prefix}${pct.toFixed(2)}%`;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export const HoldingsPage: React.FC = () => {
  const {
    wallet,
    portfolio,
    refreshFinancials,
    executeTrade,
  } = useSyncedWallet();

  /* Local UI & market ticker state */
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [loadingTickers, setLoadingTickers] = useState(true);
  const [segment, setSegment] = useState<HoldingsSegment>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedOrderMode, setSelectedOrderMode] = useState<'Delivery' | 'Intraday' | undefined>(
    undefined
  );
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [hideValues, setHideValues] = useState(false);

  /* ── Fetch live market prices & refresh synced wallet ───────────────────── */

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMarketTickers(), refreshFinancials()])
      .then(([tickerData]) => {
        if (!cancelled && tickerData?.length) setTickers(tickerData);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoadingTickers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshFinancials]);

  /* ── Ticker lookup map ──────────────────────────────────────────────────── */

  const tickerMap = useMemo(() => {
    const map = new Map<string, MarketTicker>();
    tickers.forEach((t) => map.set(t.symbol.toUpperCase(), t));
    return map;
  }, [tickers]);

  /* ── Computed portfolio metrics ─────────────────────────────────────────── */

  const holdings = portfolio?.holdings ?? [];

  const holdingsRows: HoldingsRowData[] = useMemo(() => {
    return holdings.map((h) => {
      const live = tickerMap.get(h.symbol.toUpperCase());
      const fallbackPrice = h.avg_price_paise / 100;
      const ticker: MarketTicker = live || {
        symbol: h.symbol,
        name: h.name || h.symbol,
        sector: 'BSE Sensex',
        bse_code: '',
        price: fallbackPrice,
        open: fallbackPrice,
        high: fallbackPrice,
        low: fallbackPrice,
        change: 0,
        change_pct: 0,
        volume: 0,
      };
      const avgPriceInr = h.avg_price_paise / 100;
      const investedInr = h.invested_paise / 100;
      const currentValueInr = ticker.price * h.quantity;
      const totalReturnInr = currentValueInr - investedInr;
      const totalReturnPct = investedInr > 0 ? (totalReturnInr / investedInr) * 100 : 0;
      return {
        symbol: h.symbol,
        name: h.name || ticker.name,
        sector: ticker.sector,
        ticker,
        quantity: h.quantity,
        avgPriceInr,
        investedInr,
        currentValueInr,
        totalReturnInr,
        totalReturnPct,
        orderMode: h.order_mode || 'Delivery',
      } satisfies HoldingsRowData;
    });
  }, [holdings, tickerMap]);

  const deliveryRows = useMemo(
    () => holdingsRows.filter((r) => (r.orderMode || 'Delivery') === 'Delivery'),
    [holdingsRows]
  );

  const intradayRows = useMemo(
    () => holdingsRows.filter((r) => r.orderMode === 'Intraday'),
    [holdingsRows]
  );

  const visibleRows = useMemo(() => {
    if (segment === 'delivery') return deliveryRows;
    if (segment === 'intraday') return intradayRows;
    return holdingsRows;
  }, [segment, holdingsRows, deliveryRows, intradayRows]);

  const totalCurrentValueInr = visibleRows.reduce((s, r) => s + (r.currentValueInr ?? 0), 0);
  const totalInvestedInr = visibleRows.reduce((s, r) => s + (r.investedInr ?? 0), 0);
  const totalReturnInr = totalCurrentValueInr - totalInvestedInr;
  const totalReturnPct = totalInvestedInr > 0 ? (totalReturnInr / totalInvestedInr) * 100 : 0;

  /* 1D returns: sum of (day_change * quantity) for each holding in active segment */
  const oneDayReturnInr = visibleRows.reduce(
    (s, r) => s + (r.ticker.change ?? 0) * (r.quantity ?? 0),
    0
  );
  const oneDayReturnPct =
    totalCurrentValueInr > 0 && totalCurrentValueInr - oneDayReturnInr !== 0
      ? (oneDayReturnInr / (totalCurrentValueInr - oneDayReturnInr)) * 100
      : 0;

  /* ── Selected ticker for OrderTicketPanel ────────────────────────────────── */

  const selectedTicker = selectedSymbol ? tickerMap.get(selectedSymbol.toUpperCase()) ?? null : null;

  /* ── Callbacks ──────────────────────────────────────────────────────────── */

  const handleSelectStock = useCallback((symbol: string, mode?: 'Delivery' | 'Intraday') => {
    setSelectedSymbol(symbol);
    setSelectedOrderMode(mode || (segment === 'intraday' ? 'Intraday' : segment === 'delivery' ? 'Delivery' : undefined));
  }, [segment]);

  const handleOpenChart = useCallback((symbol: string) => {
    setChartSymbol(symbol);
  }, []);

  const handleExecuteOrder = useCallback(
    async (payload: {
      symbol: string;
      name: string;
      side: 'BUY' | 'SELL';
      orderMode: 'Delivery' | 'Intraday';
      priceType: 'Market' | 'Limit';
      quantity: number;
      executionPriceInr: number;
    }) => {
      await executeTrade(payload);
    },
    [executeTrade]
  );

  const cashPaise = wallet.balance_paise;
  const segmentHeadingLabel =
    segment === 'delivery'
      ? `Delivery (${visibleRows.length})`
      : segment === 'intraday'
        ? `Intraday (${visibleRows.length})`
        : `Holdings (${visibleRows.length})`;

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
          Holdings
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Track and manage your Delivery and Intraday stock positions
        </p>
      </div>

      {/* ── Two-Column Layout ────────────────────────────────────────────── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        {/* ━━ LEFT COLUMN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="space-y-4 min-w-0 w-full">
          {/* ── Portfolio Summary Card (Groww-style, consistent height across segments) */}
          <Card3D elevation="e2" interactive={false} className="w-full p-5 sm:p-6 border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{segmentHeadingLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setHideValues((v) => !v)}
                aria-label={hideValues ? 'Show portfolio values' : 'Hide portfolio values'}
                className="p-2 rounded-lg border border-surface-border text-text-tertiary hover:text-text-primary hover:bg-surface-inset transition-colors cursor-pointer"
              >
                {hideValues ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="text-2xl sm:text-[26px] font-extrabold font-mono text-text-primary tracking-tight tabular-nums">
              {hideValues ? '₹••••••' : formatINR(totalCurrentValueInr)}
            </div>

            <div className="border-t border-dashed border-surface-border my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start text-xs">
              <div className="text-left">
                <span className="text-text-tertiary font-medium">Invested value</span>
                <p className="text-sm font-mono font-bold text-text-primary mt-1 tabular-nums">
                  {hideValues ? '₹••••' : formatINR(totalInvestedInr)}
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-text-tertiary font-medium">1D returns</span>
                <p
                  className={`text-sm font-mono font-bold mt-1 tabular-nums ${
                    oneDayReturnInr >= 0 ? 'text-brand-up' : 'text-brand-down'
                  }`}
                >
                  {hideValues
                    ? '₹••••'
                    : `${signedINR(oneDayReturnInr)} (${signedPct(oneDayReturnPct)})`}
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-text-tertiary font-medium">Total returns</span>
                <p
                  className={`text-sm font-mono font-bold mt-1 tabular-nums ${
                    totalReturnInr >= 0 ? 'text-brand-up' : 'text-brand-down'
                  }`}
                >
                  {hideValues
                    ? '₹••••'
                    : `${signedINR(totalReturnInr)} (${signedPct(totalReturnPct)})`}
                </p>
              </div>
            </div>
          </Card3D>

          {/* ── Position Segments: All | Delivery | Intraday ─────────────── */}
          <Tabs
            items={[
              { id: 'all', label: `All (${holdingsRows.length})` },
              { id: 'delivery', label: `Delivery (${deliveryRows.length})` },
              { id: 'intraday', label: `Intraday (${intradayRows.length})` },
            ]}
            value={segment}
            onValueChange={(val) => setSegment(val as HoldingsSegment)}
          />

          {/* ── Holdings Table ───────────────────────────────────────────── */}
          {loadingTickers && tickers.length === 0 ? (
            <Skeleton width="100%" height="260px" className="rounded-xl" />
          ) : visibleRows.length > 0 ? (
            <HoldingsTable
              mode="holdings"
              rows={visibleRows}
              selectedSymbol={selectedSymbol}
              hideValues={hideValues}
              onSelectStock={handleSelectStock}
              onOpenChart={handleOpenChart}
            />
          ) : (
            <Card3D elevation="e1" className="w-full p-10 text-center border border-surface-border">
              <TrendingDown className="w-8 h-8 text-text-tertiary mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-text-secondary">
                {segment === 'intraday'
                  ? 'No intraday positions open'
                  : segment === 'delivery'
                    ? 'No delivery holdings yet'
                    : 'Your portfolio is empty'}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Explore live stocks and AI forecasts on the{' '}
                <Link
                  to="/dashboard"
                  className="text-brand-up font-bold underline underline-offset-2"
                >
                  Market Dashboard
                </Link>{' '}
                to place an order.
              </p>
            </Card3D>
          )}
        </div>

        {/* ━━ RIGHT COLUMN (Order Ticket) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div
          data-testid="holdings-sticky-panel"
          className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:p-1 lg:-m-1"
        >
          <OrderTicketPanel
            selectedTicker={selectedTicker}
            preferredOrderMode={selectedOrderMode}
            availableCashPaise={cashPaise}
            holdings={holdings}
            onClearSelection={() => {
              setSelectedSymbol(null);
              setSelectedOrderMode(undefined);
            }}
            onExecuteOrder={handleExecuteOrder}
          />
        </div>
      </div>

      {/* ── Stock Chart Modal ────────────────────────────────────────────── */}
      {chartSymbol && (
        <StockChartModal
          symbol={chartSymbol}
          isOpen={!!chartSymbol}
          onClose={() => setChartSymbol(null)}
          onTradeSuccess={refreshFinancials}
        />
      )}
    </div>
  );
};
