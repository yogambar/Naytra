import React, { useState, useEffect, useCallback } from 'react';
import { Card3D } from '../design/Card3D';
import { DataModeBadge } from '../design/Badge';
import { Sparkline } from '../design/Sparkline';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, History, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFirestoreWallet, getFirestorePortfolio, getFirestoreOrders, PortfolioDoc } from '../services/firestoreService';
import { fetchMarketTickers, MarketTicker } from '../services/marketService';
import { StockChartModal } from '../components/market/StockChartModal';

const sampleSparkline = [72400, 72550, 72480, 72690, 72850, 72800, 72980, 73120];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export const DashboardPage: React.FC = () => {
  const { idToken, user } = useAuth();
  const [cashBalance, setCashBalance] = useState<number>(10000.0);
  const [portfolio, setPortfolio] = useState<PortfolioDoc | null>(null);
  const [recentOrders, setRecentOrders] = useState<Array<Record<string, any>>>([]);
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const loadUserData = useCallback(() => {
    if (!user?.uid) return;
    getFirestoreWallet(user.uid).then((w) => {
      if (w) setCashBalance(w.total_cash_inr || w.total_cash_paise / 100);
    });
    getFirestorePortfolio(user.uid).then((p) => {
      if (p) setPortfolio(p);
    });
    getFirestoreOrders(user.uid).then((ord) => {
      if (ord) setRecentOrders(ord.slice(0, 5));
    });
  }, [user?.uid]);

  useEffect(() => {
    loadUserData();

    // 2. Load live market tickers with SWR
    fetchMarketTickers()
      .then((t) => {
        if (t && t.length > 0) setTickers(t.slice(0, 6));
      })
      .catch(() => null);

    if (!idToken) return;
    fetch(`${API_BASE}/api/v1/wallet`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.ok && json.data?.total_cash_inr) {
          setCashBalance(json.data.total_cash_inr);
        }
      })
      .catch(() => null);
  }, [idToken, loadUserData]);

  // Compute portfolio metrics
  const holdings = portfolio?.holdings || [];
  let positionsValue = 0;
  let totalInvested = 0;

  holdings.forEach((h) => {
    const ticker = tickers.find((t) => t.symbol === h.symbol);
    const ltp = ticker?.price || h.avg_price_paise / 100;
    positionsValue += h.quantity * ltp;
    totalInvested += h.invested_paise / 100;
  });

  const unrealizedPnl = positionsValue - totalInvested;
  const unrealizedPnlPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;
  const totalNetWorth = cashBalance + positionsValue;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
            BSE Sensex 30 paper-trading overview
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-up animate-pulse" />
          Replay Clock: <span className="font-mono font-semibold text-text-primary">10:45:00 IST</span>
        </div>
      </div>

      {/* Portfolio Hero Card */}
      <Card3D elevation="e3" className="p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-text-tertiary">
              Total Virtual Portfolio (Net Worth)
            </span>
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-text-primary">
                {formatINR(totalNetWorth)}
              </span>
              <span
                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${
                  unrealizedPnl >= 0
                    ? 'text-brand-up bg-brand-up-bg border-brand-up/30'
                    : 'text-brand-down bg-rose-950/40 border-rose-800/30'
                }`}
              >
                {unrealizedPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {unrealizedPnl >= 0 ? '+' : ''}₹{unrealizedPnl.toFixed(2)} ({unrealizedPnlPct >= 0 ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%)
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-tertiary mt-2">
              <span>Cash: <strong className="font-mono text-text-secondary">{formatINR(cashBalance)}</strong></span>
              <span>Stocks: <strong className="font-mono text-text-secondary">{formatINR(positionsValue)}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-surface-raised border border-surface-border text-text-primary hover:border-brand-marigold/40 transition-colors shadow-sm"
            >
              <Wallet className="w-4 h-4 text-brand-marigold" />
              Manage Wallet
            </Link>
          </div>
        </div>
      </Card3D>

      {/* Market Indices Grid */}
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
            <TrendingUp className="w-4 h-4" />
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
                ₹{positionsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-surface-inset text-text-secondary">
              {holdings.length} {holdings.length === 1 ? 'Holding' : 'Holdings'}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              unrealizedPnl >= 0 ? 'text-brand-up' : 'text-brand-down'
            }`}
          >
            {unrealizedPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {unrealizedPnl >= 0 ? '+' : ''}₹{unrealizedPnl.toFixed(2)} ({unrealizedPnlPct >= 0 ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%) unrealized P&L
          </div>
        </Card3D>
      </div>

      {/* Watchlist & Top Movers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">Sensex 30 Watchlist</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              ML Forecasts Active
            </span>
          </div>
          <Link to="/holdings" className="text-xs font-bold text-brand-marigold-text hover:underline">
            View All 30 Stocks →
          </Link>
        </div>

        <div className="space-y-2.5">
          {(tickers.length > 0 ? tickers : [
            { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 2940.20, change_pct: 1.45 },
            { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4120.00, change_pct: -0.32 },
            { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1530.80, change_pct: 0.88 },
          ]).map((stock) => {
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
                  <div
                    className={`text-xs font-semibold ${
                      isUp ? 'text-brand-up' : 'text-brand-down'
                    }`}
                  >
                    {isUp ? '+' : ''}{stock.change_pct}%
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
          onTradeSuccess={loadUserData}
        />
      )}

      {/* Recent Activity: Executed Paper Orders */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <History className="w-4 h-4 text-text-tertiary" />
            Recent Executed Paper Orders
          </div>
          {recentOrders.length > 0 && (
            <span className="text-[11px] font-mono text-text-tertiary">
              {recentOrders.length} {recentOrders.length === 1 ? 'Order' : 'Orders'}
            </span>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <Card3D elevation="e1" className="p-4 text-center py-8">
            <p className="text-xs text-text-tertiary">
              No executed orders in this session yet. Click any stock above to place your first virtual trade!
            </p>
          </Card3D>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((ord) => (
              <Card3D
                key={ord.id || ord.order_id}
                elevation="e1"
                className="p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.side === 'BUY'
                        ? 'bg-brand-up/20 text-brand-up border border-brand-up/30'
                        : 'bg-brand-down/20 text-brand-down border border-brand-down/30'
                    }`}
                  >
                    {ord.side}
                  </span>
                  <div>
                    <span className="font-bold text-text-primary mr-2">{ord.symbol}</span>
                    <span className="text-text-tertiary">
                      {ord.quantity} {ord.quantity === 1 ? 'share' : 'shares'} @ ₹{(ord.price_inr || ord.price_paise / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-text-primary">
                    ₹{(ord.total_inr || ord.total_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    {new Date(ord.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </Card3D>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
