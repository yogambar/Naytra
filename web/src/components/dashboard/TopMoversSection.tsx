import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Sparkline } from '../../design/Sparkline';
import type { PredictionTicker } from '../../services/marketService';

export type MoverFilterTab = 'gainers' | 'losers' | 'volume' | 'ai_bullish' | 'personal';

export interface TopMoversSectionProps {
  tickers: PredictionTicker[];
  activeTab: MoverFilterTab;
  onTabChange: (tab: MoverFilterTab) => void;
  selectedSector: string;
  sectors: string[];
  onSectorChange: (sector: string) => void;
  heldSymbols: Set<string>;
  searchedSymbols: Set<string>;
  preferredSectors: string[];
  onSelectStock: (symbol: string) => void;
}

const TABS: Array<{ id: MoverFilterTab; label: string }> = [
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers', label: 'Losers' },
  { id: 'volume', label: 'Volume shockers' },
  { id: 'ai_bullish', label: 'AI Bullish' },
  { id: 'personal', label: 'For You' },
];

export const TopMoversSection: React.FC<TopMoversSectionProps> = ({
  tickers,
  activeTab,
  onTabChange,
  selectedSector,
  sectors,
  onSectorChange,
  heldSymbols,
  searchedSymbols,
  preferredSectors,
  onSelectStock,
}) => {
  const sectorFiltered =
    selectedSector === 'ALL'
      ? tickers
      : tickers.filter((t) => t.sector === selectedSector);

  const visibleRows = React.useMemo(() => {
    const base = [...sectorFiltered];
    if (activeTab === 'gainers') {
      base.sort((a, b) => b.change_pct - a.change_pct);
    } else if (activeTab === 'losers') {
      base.sort((a, b) => a.change_pct - b.change_pct);
    } else if (activeTab === 'volume') {
      base.sort((a, b) => b.volume - a.volume);
    } else if (activeTab === 'ai_bullish') {
      base.sort((a, b) => b.forecast_delta_pct - a.forecast_delta_pct);
    } else {
      // 'personal': boost held, recently searched, and user's preferred sectors
      base.sort((a, b) => {
        const score = (t: PredictionTicker) => {
          let s = t.forecast_delta_pct + Math.abs(t.change_pct) * 0.4;
          if (heldSymbols.has(t.symbol.toUpperCase())) s += 20;
          if (searchedSymbols.has(t.symbol.toUpperCase())) s += 14;
          if (preferredSectors.includes(t.sector)) s += 8;
          return s;
        };
        return score(b) - score(a);
      });
    }
    return base.slice(0, 6);
  }, [sectorFiltered, activeTab, heldSymbols, searchedSymbols, preferredSectors]);

  return (
    <section aria-labelledby="top-movers-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="top-movers-heading" className="text-lg font-extrabold text-text-primary tracking-tight">
          Top movers today
        </h2>
        <Link
          to="/holdings"
          className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-up hover:underline"
        >
          See more <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Filter Pills + Sector Dropdown (matches Groww layout) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Top movers categories"
          className="flex flex-wrap items-center gap-1.5"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-surface-raised border-text-primary text-text-primary shadow-sm'
                    : 'bg-transparent border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-inset/60'
                }`}
              >
                {tab.id === 'ai_bullish' && (
                  <Sparkles className="w-3 h-3 text-purple-400" aria-hidden="true" />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-sector-filter" className="sr-only">
            Filter by sector category
          </label>
          <select
            id="dashboard-sector-filter"
            name="sectorFilter"
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="min-h-[36px] px-3 py-1.5 rounded-full text-xs font-bold bg-surface-raised border border-surface-border text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-marigold/70 cursor-pointer"
          >
            <option value="ALL">SENSEX 30 (All Sectors)</option>
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Movers Table Card */}
      <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <caption className="sr-only">Sensex 30 top movers with live rate and AI forecast</caption>
            <thead className="border-b border-surface-border bg-surface-inset/40 text-[11px] font-semibold text-text-tertiary">
              <tr>
                <th scope="col" className="px-4 py-3">Company</th>
                <th scope="col" className="px-3 py-3 text-center">1D Trend</th>
                <th scope="col" className="px-3 py-3 text-right">Market price (1D)</th>
                <th scope="col" className="px-3 py-3 text-right">AI Target</th>
                <th scope="col" className="px-4 py-3 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-xs">
              {visibleRows.map((row) => {
                const isUp = row.change_pct >= 0;
                const isAiUp = row.forecast_delta_pct >= 0;
                const isHeld = heldSymbols.has(row.symbol.toUpperCase());
                const isSearched = searchedSymbols.has(row.symbol.toUpperCase());

                return (
                  <tr
                    key={row.symbol}
                    className="hover:bg-surface-inset/50 transition-colors"
                  >
                    <td className="px-4 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => onSelectStock(row.symbol)}
                        className="flex items-center gap-3 text-left group w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-marigold rounded cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-inset border border-surface-border flex items-center justify-center font-mono font-bold text-[11px] text-text-primary shrink-0">
                          {row.symbol.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-text-primary group-hover:text-brand-up transition-colors truncate flex items-center gap-1.5">
                            <span>{row.name}</span>
                            {isHeld && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-up/15 text-brand-up border border-brand-up/30 font-semibold shrink-0">
                                Held
                              </span>
                            )}
                            {!isHeld && isSearched && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-marigold/15 text-brand-marigold-text border border-brand-marigold/30 font-semibold shrink-0">
                                Recent
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-tertiary">
                            {row.symbol} • {row.sector}
                          </div>
                        </div>
                      </button>
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <div className="flex justify-center">
                        <Sparkline
                          data={row.sparkline}
                          width={76}
                          height={24}
                          isPositive={isUp}
                        />
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right align-middle font-mono tabular-nums">
                      <div className="font-bold text-text-primary">
                        ₹{row.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          isUp ? 'text-brand-up' : 'text-brand-down'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {row.change.toFixed(2)} ({isUp ? '+' : ''}
                        {row.change_pct.toFixed(2)}%)
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right align-middle font-mono tabular-nums">
                      <div className="font-bold text-purple-400">
                        ₹{row.forecast_target.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          isAiUp ? 'text-brand-up' : 'text-brand-down'
                        }`}
                      >
                        {isAiUp ? '+' : ''}
                        {row.forecast_delta_pct.toFixed(2)}%
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right align-middle font-mono text-text-secondary tabular-nums">
                      {row.volume.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
