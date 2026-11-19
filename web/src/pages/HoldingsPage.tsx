import React, { useState, useEffect } from 'react';
import { Card3D } from '../design/Card3D';
import { Tabs } from '../design/Tabs';
import { Input } from '../design/Input';
import { Skeleton } from '../design/Skeleton';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchMarketTickers, MarketTicker } from '../services/marketService';
import { StockChartModal } from '../components/market/StockChartModal';

export const HoldingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketTickers()
      .then((data) => {
        if (data && data.length > 0) setTickers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter tickers based on search and tab
  const filteredTickers = tickers.filter((t) => {
    const matchesSearch =
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'gainers') return (t.change_pct ?? 0) > 0;
    if (activeTab === 'losers') return (t.change_pct ?? 0) < 0;
    if (activeTab === 'holdings') return t.symbol === 'RELIANCE' || t.symbol === 'INFY';
    return true;
  });

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
        {filteredTickers.map((item) => {
          const isUp = (item.change_pct ?? 0) >= 0;
          return (
            <Card3D
              key={item.symbol}
              elevation="e1"
              onClick={() => setSelectedStock(item.symbol)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-inset flex items-center justify-center font-bold text-xs text-text-primary font-mono border border-surface-border">
                  {item.symbol.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary">{item.symbol}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="ML Forecast Active" />
                    <span className="text-[10px] text-text-tertiary px-1.5 py-0.5 rounded bg-surface-raised border border-surface-border">
                      {item.sector}
                    </span>
                  </div>
                  <div className="text-xs text-text-tertiary">{item.name}</div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-text-primary block">
                    ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                      isUp ? 'text-brand-up' : 'text-brand-down'
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isUp ? '+' : ''}{item.change_pct}%
                  </span>
                </div>
              </div>
            </Card3D>
          );
        })}

        {/* Skeleton loading row */}
        {loading && (
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
        )}
      </div>

      {/* Stock Chart Modal with Forecasts & LLM Reasoning */}
      {selectedStock && (
        <StockChartModal
          symbol={selectedStock}
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
};
