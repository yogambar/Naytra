import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card3D } from '../design/Card3D';
import { Tabs } from '../design/Tabs';
import { Skeleton } from '../design/Skeleton';
import { Eye, EyeOff, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMarketTickers, MarketTicker } from '../services/marketService';
import {
  getFirestoreWallet,
  getFirestorePortfolio,
  getFirestoreWatchlist,
  toggleWatchlistSymbol,
  executePaperTradeInFirestore,
  type WalletDoc,
  type PortfolioDoc,
} from '../services/firestoreService';
import { HoldingsTable, type HoldingsRowData } from '../components/holdings/HoldingsTable';
import { OrderTicketPanel } from '../components/holdings/OrderTicketPanel';
import { StockChartModal } from '../components/market/StockChartModal';

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
  const { user } = useAuth();
  const uid = user?.uid;

  /* State */
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [wallet, setWallet] = useState<WalletDoc | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioDoc | null>(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('holdings');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [hideValues, setHideValues] = useState(false);

  /* ── Data fetching ──────────────────────────────────────────────────────── */

  const refreshData = useCallback(async () => {
    if (!uid) return;
    try {
      const [tickerData, walletData, portfolioData, watchlistData] = await Promise.all([
        fetchMarketTickers(),
        getFirestoreWallet(uid),
        getFirestorePortfolio(uid),
        getFirestoreWatchlist(uid),
      ]);
      if (tickerData?.length) setTickers(tickerData);
      setWallet(walletData);
      setPortfolio(portfolioData);
      setWatchlistSymbols(watchlistData);
    } catch (err) {
      console.warn('HoldingsPage data refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  /* ── Ticker lookup map ──────────────────────────────────────────────────── */

  const tickerMap = useMemo(() => {
    const map = new Map<string, MarketTicker>();
    tickers.forEach((t) => map.set(t.symbol.toUpperCase(), t));
    return map;
  }, [tickers]);

  /* ── Computed portfolio metrics ─────────────────────────────────────────── */

  const holdings = portfolio?.holdings ?? [];

  const holdingsRows: HoldingsRowData[] = useMemo(() => {
    return holdings
      .map((h) => {
        const ticker = tickerMap.get(h.symbol.toUpperCase());
        if (!ticker) return null;
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
          orderMode: h.order_mode,
        } satisfies HoldingsRowData;
      })
      .filter(Boolean) as HoldingsRowData[];
  }, [holdings, tickerMap]);

  const exploreRows: HoldingsRowData[] = useMemo(() => {
    return tickers.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      sector: t.sector,
      ticker: t,
    }));
  }, [tickers]);

  const totalCurrentValueInr = holdingsRows.reduce((s, r) => s + (r.currentValueInr ?? 0), 0);
  const totalInvestedInr = holdingsRows.reduce((s, r) => s + (r.investedInr ?? 0), 0);
  const totalReturnInr = totalCurrentValueInr - totalInvestedInr;
  const totalReturnPct = totalInvestedInr > 0 ? (totalReturnInr / totalInvestedInr) * 100 : 0;

  /* 1D returns: sum of (day_change * quantity) for each holding */
  const oneDayReturnInr = holdingsRows.reduce(
    (s, r) => s + (r.ticker.change ?? 0) * (r.quantity ?? 0),
    0,
  );
  const oneDayReturnPct =
    totalCurrentValueInr > 0
      ? (oneDayReturnInr / (totalCurrentValueInr - oneDayReturnInr)) * 100
      : 0;

  /* ── Selected ticker for OrderTicketPanel ────────────────────────────────── */

  const selectedTicker = selectedSymbol ? tickerMap.get(selectedSymbol.toUpperCase()) ?? null : null;

  /* ── Callbacks ──────────────────────────────────────────────────────────── */

  const handleSelectStock = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
  }, []);

  const handleOpenChart = useCallback((symbol: string) => {
    setChartSymbol(symbol);
  }, []);

  const handleToggleWatchlist = useCallback(
    async (symbol: string) => {
      if (!uid) return;
      const next = await toggleWatchlistSymbol(uid, symbol);
      setWatchlistSymbols(next);
    },
    [uid],
  );

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
      if (!uid) return;
      const result = await executePaperTradeInFirestore(uid, payload);
      setWallet(result.wallet);
      setPortfolio(result.portfolio);
    },
    [uid],
  );

  /* ── Loading state ──────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Holdings & Sensex 30
          </h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-4">
            <Skeleton width="100%" height="120px" className="rounded-xl" />
            <Skeleton width="100%" height="320px" className="rounded-xl" />
          </div>
          <Skeleton width="100%" height="460px" className="rounded-xl" />
        </div>
      </div>
    );
  }

  const cashPaise = wallet?.balance_paise ?? 0;
  const hasHoldings = holdingsRows.length > 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
          Holdings & Sensex 30
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Track virtual portfolio positions and explore all 30 constituent stocks
        </p>
      </div>

      {/* ── Two-Column Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* ━━ LEFT COLUMN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="space-y-4 min-w-0">
          {/* ── Portfolio Summary Card (Groww-style) ─────────────────────── */}
          <Card3D elevation="e2" className="p-5 border border-surface-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-text-tertiary uppercase tracking-wide">
                <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Holdings ({holdingsRows.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setHideValues((v) => !v)}
                aria-label={hideValues ? 'Show portfolio values' : 'Hide portfolio values'}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-inset transition-colors"
              >
                {hideValues ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {hasHoldings ? (
              <>
                {/* Total Current Value (large) */}
                <div className="text-2xl font-extrabold font-mono text-text-primary mb-3">
                  {hideValues ? '₹••••••' : formatINR(totalCurrentValueInr)}
                </div>

                {/* Metrics Row */}
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                  <div>
                    <span className="text-text-tertiary">Invested value</span>
                    <p className="font-mono font-bold text-text-secondary mt-0.5">
                      {hideValues ? '₹••••' : formatINR(totalInvestedInr)}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">1D returns</span>
                    <p
                      className={`font-mono font-bold mt-0.5 ${
                        oneDayReturnInr >= 0 ? 'text-brand-up' : 'text-brand-down'
                      }`}
                    >
                      {hideValues
                        ? '₹••••'
                        : `${signedINR(oneDayReturnInr)} (${signedPct(oneDayReturnPct)})`}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Total returns</span>
                    <p
                      className={`font-mono font-bold mt-0.5 ${
                        totalReturnInr >= 0 ? 'text-brand-up' : 'text-brand-down'
                      }`}
                    >
                      {hideValues
                        ? '₹••••'
                        : `${signedINR(totalReturnInr)} (${signedPct(totalReturnPct)})`}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-2">
                <TrendingUp className="w-8 h-8 text-text-tertiary mx-auto" aria-hidden="true" />
                <p className="text-sm font-semibold text-text-secondary">No virtual holdings yet</p>
                <p className="text-xs text-text-tertiary max-w-xs mx-auto">
                  Switch to the "Sensex 30" tab and buy your first stock to start paper trading!
                </p>
              </div>
            )}
          </Card3D>

          {/* ── Holdings / Sensex 30 Tabs ────────────────────────────────── */}
          <Tabs
            items={[
              { id: 'holdings', label: 'My Holdings' },
              { id: 'explore', label: 'Sensex 30' },
            ]}
            value={activeTab}
            onValueChange={setActiveTab}
          />

          {/* ── Table ────────────────────────────────────────────────────── */}
          {activeTab === 'holdings' ? (
            hasHoldings ? (
              <HoldingsTable
                mode="holdings"
                rows={holdingsRows}
                selectedSymbol={selectedSymbol}
                hideValues={hideValues}
                watchlistSymbols={watchlistSymbols}
                onSelectStock={handleSelectStock}
                onOpenChart={handleOpenChart}
                onToggleWatchlist={handleToggleWatchlist}
              />
            ) : (
              <Card3D elevation="e1" className="p-10 text-center border border-surface-border">
                <TrendingDown className="w-8 h-8 text-text-tertiary mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm font-semibold text-text-secondary">Your portfolio is empty</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Explore the{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('explore')}
                    className="text-brand-up font-bold underline underline-offset-2 cursor-pointer"
                  >
                    Sensex 30
                  </button>{' '}
                  tab to pick your first stock.
                </p>
              </Card3D>
            )
          ) : (
            <HoldingsTable
              mode="explore"
              rows={exploreRows}
              selectedSymbol={selectedSymbol}
              hideValues={false}
              watchlistSymbols={watchlistSymbols}
              onSelectStock={handleSelectStock}
              onOpenChart={handleOpenChart}
              onToggleWatchlist={handleToggleWatchlist}
            />
          )}
        </div>

        {/* ━━ RIGHT COLUMN (Order Ticket) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="lg:sticky lg:top-6">
          <OrderTicketPanel
            selectedTicker={selectedTicker}
            availableCashPaise={cashPaise}
            holdings={holdings}
            onClearSelection={() => setSelectedSymbol(null)}
            onOpenChart={handleOpenChart}
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
        />
      )}
    </div>
  );
};
