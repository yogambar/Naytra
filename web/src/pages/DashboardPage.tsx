import React, { useState, useEffect, useMemo } from 'react';
import { Card3D } from '../design/Card3D';
import { DataModeBadge } from '../design/Badge';
import { Sparkline } from '../design/Sparkline';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, History, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSyncedWallet } from '../context/WalletContext';
import { fetchMarketTickers, MarketTicker } from '../services/marketService';
import { StockChartModal } from '../components/market/StockChartModal';

const sampleSparkline = [72400, 72550, 72480, 72690, 72850, 72800, 72980, 73120];

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export const DashboardPage: React.FC = () => {
  const { wallet, portfolio, orders, refreshFinancials } = useSyncedWallet();
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMarketTickers(), refreshFinancials()])
      .then(([t]) => {
        if (!cancelled && t && t.length > 0) setTickers(t);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [refreshFinancials]);

  const tickerMap = useMemo(() => {
    const map = new Map<string, MarketTicker>();
    tickers.forEach((t) => map.set(t.symbol.toUpperCase(), t));
    return map;
  }, [tickers]);

  const cashInr = wallet.balance_paise / 100;
  const holdings = portfolio?.holdings ?? [];

  const activeInvestedInr = holdings.reduce((s, h) => s + h.invested_paise / 100, 0);
  const activePositionValueInr = holdings.reduce((s, h) => {
    const livePrice = tickerMap.get(h.symbol.toUpperCase())?.price ?? h.avg_price_paise / 100;
    return s + livePrice * h.quantity;
  }, 0);
  const unrealizedPnlInr = activePositionValueInr - activeInvestedInr;
  const unrealizedPnlPct = activeInvestedInr > 0 ? (unrealizedPnlInr / activeInvestedInr) * 100 : 0;

  const totalPortfolioValue = cashInr + activePositionValueInr;
  const totalPnlInr = unrealizedPnlInr + (portfolio?.realized_pnl_paise ?? 0) / 100;
  const initialGrantInr = (wallet.initial_grant_paise ?? 0) / 100;
  const totalPnlPct = initialGrantInr > 0 ? (totalPnlInr / initialGrantInr) * 100 : 0;
  const isTotalUp = totalPnlInr >= 0;
  const isUnrealizedUp = unrealizedPnlInr >= 0;

  const watchlistPreview = tickers.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="w-full space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              Market Dashboard
            </h1>
            <DataModeBadge mode="REPLAY" />
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            BSE Sensex 30 portfolio overview
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-up animate-pulse" />
          Replay Clock: <span className="font-mono font-semibold text-text-primary">10:45:00 IST</span>
        </div>
      </div>

      {/* Portfolio Hero Card (Live Synced with Wallet & Holdings) */}
      <Card3D elevation="e3" className="p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-text-tertiary">
              Total Portfolio
            </span>
            <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-text-primary">
                {formatINR(totalPortfolioValue)}
              </span>
              <span
                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${
                  isTotalUp
                    ? 'text-brand-up bg-brand-up-bg border-brand-up/30'
                    : 'text-brand-down bg-brand-down-bg border-brand-down/30'
                }`}
              >
                {isTotalUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
                )}
                {isTotalUp ? '+' : ''}
                {totalPnlPct.toFixed(2)}% ({isTotalUp ? '+' : ''}
                {formatINR(totalPnlInr)})
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-2 font-mono">
              Available Cash: <strong className="text-text-secondary">{formatINR(cashInr)}</strong> • Holdings:{' '}
              <strong className="text-text-secondary">{formatINR(activePositionValueInr)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-surface-raised border border-surface-border text-text-primary hover:border-brand-marigold/40 transition-colors shadow-sm"
            >
              <Wallet className="w-4 h-4 text-brand-marigold" aria-hidden="true" />
              Manage Wallet
            </Link>
          </div>
        </div>
      </Card3D>

      {/* Market Indices & Live Position Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card3D elevation="e2" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                BSE SENSEX
              </span>
              <p className="text-xl font-bold font-mono text-text-primary mt-0.5">73,120.40</p>
            </div>
            <Sparkline data={sampleSparkline} width={100} height={32} isPositive={true} />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-up">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            +452.10 (+0.62%) today
          </div>
        </Card3D>

        <Card3D elevation="e2" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                ACTIVE POSITION VALUE
              </span>
              <p className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {formatINR(activePositionValueInr)}
              </p>
            </div>
            <Link
              to="/holdings"
              className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-surface-inset text-text-secondary hover:text-text-primary transition-colors"
            >
              {holdings.length} Open
            </Link>
          </div>
          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              isUnrealizedUp ? 'text-brand-up' : 'text-brand-down'
            }`}
          >
            {isUnrealizedUp ? (
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
            )}
            {isUnrealizedUp ? '+' : ''}
            {formatINR(unrealizedPnlInr)} ({isUnrealizedUp ? '+' : ''}
            {unrealizedPnlPct.toFixed(2)}%) unrealized P&amp;L
          </div>
        </Card3D>
      </div>

      {/* Watchlist & Top Movers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">Sensex 30 Watchlist</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" aria-hidden="true" />
              ML Forecasts Active
            </span>
          </div>
          <Link to="/holdings" className="text-xs font-bold text-brand-marigold-text hover:underline">
            View All 30 Stocks →
          </Link>
        </div>

        <div className="space-y-2.5">
          {(watchlistPreview.length > 0
            ? watchlistPreview
            : [
                { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 2940.2, change_pct: 1.45 },
                { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4120.0, change_pct: -0.32 },
                { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1530.8, change_pct: 0.88 },
              ]
          ).map((stock) => {
            const isUp = (stock.change_pct ?? 0) >= 0;
            return (
              <Card3D
                key={stock.symbol}
                elevation="e1"
                onClick={() => setSelectedStock(stock.symbol)}
                className="p-4 flex items-center justify-between cursor-pointer hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-inset flex items-center justify-center font-bold text-xs text-text-primary font-mono border border-surface-border">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                      {stock.symbol}
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="ML Forecast Available" />
                    </div>
                    <div className="text-xs text-text-tertiary">{stock.name}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold font-mono text-sm text-text-primary">
                    ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs font-semibold ${isUp ? 'text-brand-up' : 'text-brand-down'}`}>
                    {isUp ? '+' : ''}
                    {stock.change_pct}%
                  </div>
                </div>
              </Card3D>
            );
          })}
        </div>
      </section>

      {/* Stock Chart & Forecast Modal */}
      {selectedStock && (
        <StockChartModal
          symbol={selectedStock}
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
          onTradeSuccess={refreshFinancials}
        />
      )}

      {/* Recent Orders (Live Synced from Orders Store) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <History className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
            Recent Orders
          </div>
          {recentOrders.length > 0 && (
            <Link to="/wallet" className="text-xs font-semibold text-text-tertiary hover:text-text-primary">
              View All in Wallet →
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <Card3D elevation="e1" className="p-4 text-center py-8">
            <p className="text-xs text-text-tertiary">
              No executed orders in this session yet. Explore stocks to place your first order.
            </p>
          </Card3D>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((ord) => {
              const isBuy = ord.side === 'BUY';
              return (
                <Card3D
                  key={ord.order_id}
                  elevation="e1"
                  className="p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        isBuy
                          ? 'bg-brand-up-bg text-brand-up border border-brand-up/30'
                          : 'bg-brand-down-bg text-brand-down border border-brand-down/30'
                      }`}
                    >
                      {ord.side}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-text-primary">{ord.symbol}</span>
                      <span className="text-text-tertiary ml-2 font-mono">
                        {ord.quantity} shares • {ord.order_mode}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="font-bold text-text-primary">
                      {formatINR(ord.total_paise / 100)}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      @ {formatINR(ord.price_paise / 100)}
                    </div>
                  </div>
                </Card3D>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
