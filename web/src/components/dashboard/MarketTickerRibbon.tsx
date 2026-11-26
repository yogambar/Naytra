import React from 'react';
import type { SectorPulse } from '../../services/marketService';

export interface MarketTickerRibbonProps {
  sensexIndex: {
    price: number;
    change: number;
    change_pct: number;
    advancers: number;
    decliners: number;
  };
  sectors: SectorPulse[];
  selectedSector: string;
  onSelectSector: (sector: string) => void;
}

export const MarketTickerRibbon: React.FC<MarketTickerRibbonProps> = ({
  sensexIndex,
  sectors,
  selectedSector,
  onSelectSector,
}) => {
  const isSensexUp = sensexIndex.change_pct >= 0;
  const topSectors = sectors.slice(0, 4);

  return (
    <div
      aria-label="Live market indices and sector pulse"
      className="w-full rounded-xl border border-surface-border bg-surface-raised px-3.5 py-2.5 flex items-center gap-4 overflow-x-auto text-xs shadow-sm"
    >
      {/* BSE Sensex Index */}
      <button
        type="button"
        onClick={() => onSelectSector('ALL')}
        className={`shrink-0 flex items-center gap-2 pr-3 border-r border-surface-border cursor-pointer transition-opacity ${
          selectedSector === 'ALL' ? 'opacity-100' : 'opacity-80 hover:opacity-100'
        }`}
      >
        <span className="font-bold text-text-secondary tracking-wide">SENSEX</span>
        <span className="font-mono font-extrabold text-text-primary tabular-nums">
          {sensexIndex.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span
          className={`font-mono font-bold tabular-nums ${
            isSensexUp ? 'text-brand-up' : 'text-brand-down'
          }`}
        >
          {isSensexUp ? '+' : ''}
          {sensexIndex.change.toFixed(2)} ({isSensexUp ? '+' : ''}
          {sensexIndex.change_pct.toFixed(2)}%)
        </span>
      </button>

      {/* Advance / Decline Breadth */}
      <div className="shrink-0 flex items-center gap-1.5 pr-3 border-r border-surface-border text-[11px] font-mono">
        <span className="text-text-tertiary">Breadth</span>
        <span className="text-brand-up font-bold">{sensexIndex.advancers}↑</span>
        <span className="text-text-tertiary">/</span>
        <span className="text-brand-down font-bold">{sensexIndex.decliners}↓</span>
      </div>

      {/* Leading Sensex Sectors */}
      {topSectors.map((sec) => {
        const up = sec.avg_change_pct >= 0;
        const active = selectedSector === sec.sector;
        return (
          <button
            key={sec.sector}
            type="button"
            onClick={() => onSelectSector(active ? 'ALL' : sec.sector)}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              active
                ? 'bg-surface-inset border-brand-marigold/60 text-text-primary'
                : 'border-transparent hover:bg-surface-inset/70 text-text-secondary'
            }`}
          >
            <span className="font-bold uppercase tracking-wide text-[11px]">{sec.sector}</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                up ? 'text-brand-up' : 'text-brand-down'
              }`}
            >
              {up ? '+' : ''}
              {sec.avg_change_pct.toFixed(2)}%
            </span>
          </button>
        );
      })}
    </div>
  );
};
