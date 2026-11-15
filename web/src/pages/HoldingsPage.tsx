import React, { useState } from 'react';
import { Card3D } from '../design/Card3D';
import { Tabs } from '../design/Tabs';
import { Input } from '../design/Input';
import { Skeleton } from '../design/Skeleton';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

export const HoldingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
          Holdings & Sensex 30
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Track virtual portfolio positions and explore all 30 constituent stocks
        </p>
      </div>

      {/* Holdings Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card3D elevation="e2" className="p-4">
          <span className="text-xs font-bold text-text-tertiary uppercase">Total Invested</span>
          <p className="text-xl font-bold font-mono text-text-primary mt-1">₹4,855.00</p>
          <span className="text-[11px] text-text-tertiary">2 Positions</span>
        </Card3D>
        <Card3D elevation="e2" className="p-4">
          <span className="text-xs font-bold text-text-tertiary uppercase">Current Value</span>
          <p className="text-xl font-bold font-mono text-text-primary mt-1">₹4,820.00</p>
          <span className="text-[11px] text-text-tertiary">Real-time marks</span>
        </Card3D>
        <Card3D elevation="e2" className="p-4">
          <span className="text-xs font-bold text-text-tertiary uppercase">Unrealized P&L</span>
          <p className="text-xl font-bold font-mono text-brand-down mt-1">-₹35.00 (-0.72%)</p>
          <span className="text-[11px] text-text-tertiary">Virtual return</span>
        </Card3D>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search symbol or name..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs
          items={[
            { id: 'all', label: 'All 30' },
            { id: 'holdings', label: 'My Holdings' },
            { id: 'gainers', label: 'Gainers' },
            { id: 'losers', label: 'Losers' },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        />
      </div>

      {/* Stock List Items */}
      <div className="space-y-3">
        {[
          { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', qty: 1, avg: '₹2,910.00', ltp: '₹2,940.20', pnl: '+₹30.20 (+1.04%)', up: true },
          { symbol: 'INFY', name: 'Infosys Ltd.', qty: 1, avg: '₹1,945.00', ltp: '₹1,879.80', pnl: '-₹65.20 (-3.35%)', up: false },
          { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', qty: 0, avg: '—', ltp: '₹1,180.50', pnl: '+0.45%', up: true },
          { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', qty: 0, avg: '—', ltp: '₹1,410.15', pnl: '+1.80%', up: true },
          { symbol: 'ITC', name: 'ITC Ltd.', qty: 0, avg: '—', ltp: '₹432.10', pnl: '-0.15%', up: false },
        ].map((item) => (
          <Card3D
            key={item.symbol}
            elevation="e1"
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-marigold/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-inset flex items-center justify-center font-bold text-xs text-text-primary font-mono border border-surface-border">
                {item.symbol.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text-primary">{item.symbol}</span>
                  {item.qty > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-marigold-bg text-brand-marigold-text border border-brand-marigold/30">
                      HOLDING ({item.qty})
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-tertiary">{item.name}</div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6">
              {item.qty > 0 && (
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-text-tertiary uppercase block">Avg Price</span>
                  <span className="text-xs font-mono font-semibold text-text-secondary">{item.avg}</span>
                </div>
              )}

              <div className="text-right">
                <span className="text-sm font-bold font-mono text-text-primary block">{item.ltp}</span>
                <span
                  className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                    item.up ? 'text-brand-up' : 'text-brand-down'
                  }`}
                >
                  {item.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {item.pnl}
                </span>
              </div>
            </div>
          </Card3D>
        ))}

        {/* Skeleton loading row */}
        <div className="p-4 rounded-xl bg-surface-raised border border-surface-border opacity-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton width="40px" height="40px" className="rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton width="90px" height="16px" />
              <Skeleton width="140px" height="12px" />
            </div>
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton width="70px" height="16px" />
            <Skeleton width="50px" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );
};
