import React from 'react';
import { Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sparkline } from '../../design/Sparkline';
import type { PersonalizedStockPick } from '../../services/userActivityService';

export interface PersonalizedForecastStripProps {
  picks: PersonalizedStockPick[];
  activeCategory: string;
  categories: string[];
  onCategoryChange: (cat: string) => void;
  onSelectStock: (symbol: string) => void;
}

const TAG_BADGE_MAP: Record<PersonalizedStockPick['tag'], string> = {
  Portfolio: 'bg-brand-up-bg text-brand-up border-brand-up/30',
  'Recently Searched': 'bg-brand-marigold/15 text-brand-marigold-text border-brand-marigold/30',
  'Sector Match': 'bg-sky-950/50 text-sky-300 border-sky-700/40',
  'AI High Conviction': 'bg-purple-950/60 text-purple-300 border-purple-800/40',
};

export const PersonalizedForecastStrip: React.FC<PersonalizedForecastStripProps> = ({
  picks,
  activeCategory,
  categories,
  onCategoryChange,
  onSelectStock,
}) => {
  const filtered = React.useMemo(() => {
    const list =
      activeCategory === 'ALL'
        ? picks
        : picks.filter((p) => p.ticker.sector === activeCategory);
    return list.slice(0, 4);
  }, [picks, activeCategory]);

  return (
    <section aria-labelledby="picked-for-you-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="picked-for-you-heading" className="text-lg font-extrabold text-text-primary tracking-tight">
            Picked for you &amp; AI forecasts
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" aria-hidden="true" />
            Live ML Targets
          </span>
        </div>

        {/* Category Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <button
            type="button"
            aria-pressed={activeCategory === 'ALL'}
            onClick={() => onCategoryChange('ALL')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === 'ALL'
                ? 'bg-surface-raised border-text-primary text-text-primary'
                : 'border-surface-border text-text-tertiary hover:text-text-primary'
            }`}
          >
            For You
          </button>
          {categories.slice(0, 5).map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(active ? 'ALL' : cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-surface-raised border-text-primary text-text-primary'
                    : 'border-surface-border text-text-tertiary hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Groww-style 4-card Stock Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {filtered.map(({ ticker, reason, tag }) => {
          const isUp = ticker.change_pct >= 0;
          const isAiUp = ticker.forecast_delta_pct >= 0;
          return (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => onSelectStock(ticker.symbol)}
              className="rounded-xl border border-surface-border bg-surface-raised p-4 text-left flex flex-col justify-between gap-3 hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-inset border border-surface-border flex items-center justify-center font-mono font-bold text-xs text-text-primary">
                    {ticker.symbol.slice(0, 3)}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${TAG_BADGE_MAP[tag]}`}
                  >
                    {tag}
                  </span>
                </div>

                <div>
                  <div className="text-sm font-bold text-text-primary group-hover:text-brand-up transition-colors truncate">
                    {ticker.name}
                  </div>
                  <div className="text-[11px] text-text-tertiary truncate">{ticker.sector}</div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 w-full">
                <div className="font-mono tabular-nums">
                  <div className="text-sm font-extrabold text-text-primary">
                    ₹{ticker.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-[11px] font-semibold inline-flex items-center ${
                      isUp ? 'text-brand-up' : 'text-brand-down'
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
                    )}
                    {isUp ? '+' : ''}
                    {ticker.change_pct.toFixed(2)}%
                  </div>
                </div>

                <Sparkline data={ticker.sparkline} width={60} height={24} isPositive={isUp} />
              </div>

              <div className="pt-2 border-t border-surface-border/70 flex items-center justify-between gap-1.5 text-[10px] w-full">
                <span className="text-text-tertiary truncate" title={reason}>
                  {reason}
                </span>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    isAiUp ? 'text-purple-400' : 'text-amber-400'
                  }`}
                >
                  AI {isAiUp ? '+' : ''}
                  {ticker.forecast_delta_pct.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
