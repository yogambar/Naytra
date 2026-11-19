import React, { useState, useEffect } from 'react';
import { Card3D } from '../design/Card3D';
import { DataModeBadge } from '../design/Badge';
import { Skeleton } from '../design/Skeleton';
import { Sparkline } from '../design/Sparkline';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const { idToken } = useAuth();
  const [totalValue, setTotalValue] = useState<number>(10000.0);

  useEffect(() => {
    if (!idToken) return;
    fetch(`${API_BASE}/api/v1/wallet`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.ok && json.data?.total_cash_inr) {
          setTotalValue(json.data.total_cash_inr);
        }
      })
      .catch(() => null);
  }, [idToken]);

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
              Total Virtual Portfolio
            </span>
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-text-primary">
                {formatINR(totalValue)}
              </span>
              <span className="inline-flex items-center text-xs font-bold text-brand-up bg-brand-up-bg px-2 py-0.5 rounded-full border border-brand-up/30">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +2.41% (+₹240.50)
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Virtual paper-trading funds • Non-withdrawable
            </p>
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
              <p className="text-xl font-bold font-mono text-text-primary mt-0.5">₹4,820.00</p>
            </div>
            <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-surface-inset text-text-secondary">
              2 Open
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-down">
            <ArrowDownRight className="w-4 h-4" />
            -₹35.00 (-0.72%) unrealized P&L
          </div>
        </Card3D>
      </div>

      {/* Watchlist & Top Movers (Skeleton state while market stream connects) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">Sensex 30 Watchlist</h2>
          <Link to="/holdings" className="text-xs font-bold text-brand-marigold-text hover:underline">
            View All 30 Stocks →
          </Link>
        </div>

        <div className="space-y-2.5">
          {[
            { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: '₹2,940.20', change: '+1.45%', up: true },
            { symbol: 'TCS', name: 'Tata Consultancy Services', price: '₹4,120.00', change: '-0.32%', up: false },
            { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: '₹1,530.80', change: '+0.88%', up: true },
          ].map((stock) => (
            <Card3D
              key={stock.symbol}
              elevation="e1"
              className="p-4 flex items-center justify-between cursor-pointer hover:border-brand-marigold/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-inset flex items-center justify-center font-bold text-xs text-text-primary font-mono border border-surface-border">
                  {stock.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="font-bold text-sm text-text-primary">{stock.symbol}</div>
                  <div className="text-xs text-text-tertiary">{stock.name}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold font-mono text-sm text-text-primary">{stock.price}</div>
                <div
                  className={`text-xs font-semibold ${
                    stock.up ? 'text-brand-up' : 'text-brand-down'
                  }`}
                >
                  {stock.change}
                </div>
              </div>
            </Card3D>
          ))}

          {/* Skeleton Loaders for incoming live feed */}
          <div className="p-4 rounded-xl bg-surface-raised border border-surface-border space-y-2 opacity-60">
            <div className="flex items-center justify-between">
              <Skeleton width="120px" height="16px" />
              <Skeleton width="80px" height="16px" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton width="160px" height="12px" />
              <Skeleton width="50px" height="12px" />
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Skeleton */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <History className="w-4 h-4 text-text-tertiary" />
          Recent Paper Orders
        </div>
        <Card3D elevation="e1" className="p-4 text-center py-8">
          <p className="text-xs text-text-tertiary">
            No executed orders in this session yet. Explore stocks to place your first virtual order.
          </p>
        </Card3D>
      </section>
    </div>
  );
};
