import React from 'react';
import { Building2, Cpu, ShoppingBag, Car, Fuel, Zap, Layers, Radio, Briefcase } from 'lucide-react';
import type { SectorPulse } from '../../services/marketService';

export interface SectorsTrendingSectionProps {
  sectors: SectorPulse[];
  selectedSector: string;
  onSelectSector: (sector: string) => void;
}

function SectorIcon({ sector }: { sector: string }) {
  const s = sector.toLowerCase();
  const cls = 'w-4 h-4 text-text-secondary shrink-0';
  if (s.includes('bank') || s.includes('financ')) return <Building2 className={cls} aria-hidden="true" />;
  if (s.includes('tech')) return <Cpu className={cls} aria-hidden="true" />;
  if (s.includes('consumer')) return <ShoppingBag className={cls} aria-hidden="true" />;
  if (s.includes('auto')) return <Car className={cls} aria-hidden="true" />;
  if (s.includes('energy')) return <Fuel className={cls} aria-hidden="true" />;
  if (s.includes('util')) return <Zap className={cls} aria-hidden="true" />;
  if (s.includes('telecom')) return <Radio className={cls} aria-hidden="true" />;
  if (s.includes('metal') || s.includes('material')) return <Layers className={cls} aria-hidden="true" />;
  return <Briefcase className={cls} aria-hidden="true" />;
}

export const SectorsTrendingSection: React.FC<SectorsTrendingSectionProps> = ({
  sectors,
  selectedSector,
  onSelectSector,
}) => {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? sectors : sectors.slice(0, 6);

  return (
    <section aria-labelledby="sectors-trending-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="sectors-trending-heading" className="text-lg font-extrabold text-text-primary tracking-tight">
          Sectors trending today
        </h2>
        {sectors.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-bold text-brand-up hover:underline cursor-pointer"
          >
            {showAll ? 'Show fewer sectors' : `See all ${sectors.length} sectors →`}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-surface-border bg-surface-inset/40 grid grid-cols-[1.4fr_1fr_90px] gap-3 text-[11px] font-semibold text-text-tertiary">
          <span>Category / Sector</span>
          <span className="text-center">Gainers / Losers</span>
          <span className="text-right">1D avg change</span>
        </div>

        <div className="divide-y divide-surface-border">
          {visible.map((sec) => {
            const total = Math.max(1, sec.gainers + sec.losers + sec.neutral);
            const gainerPct = (sec.gainers / total) * 100;
            const loserPct = (sec.losers / total) * 100;
            const isUp = sec.avg_change_pct >= 0;
            const active = selectedSector === sec.sector;

            return (
              <button
                key={sec.sector}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectSector(active ? 'ALL' : sec.sector)}
                className={`w-full px-4 py-3 grid grid-cols-[1.4fr_1fr_90px] items-center gap-3 text-left transition-colors cursor-pointer ${
                  active ? 'bg-brand-up-bg/30' : 'hover:bg-surface-inset/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-inset border border-surface-border flex items-center justify-center shrink-0">
                    <SectorIcon sector={sec.sector} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-primary truncate">{sec.sector}</div>
                    <div className="text-[11px] text-text-tertiary font-mono">
                      {sec.count} {sec.count === 1 ? 'stock' : 'stocks'} • Lead: {sec.top_symbol}
                    </div>
                  </div>
                </div>

                {/* Advance/Decline Split Bar (matches Groww screenshot) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span className="text-brand-up">{sec.gainers}</span>
                    <span className="text-brand-down">{sec.losers}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-inset overflow-hidden flex">
                    <div
                      className="bg-brand-up h-full transition-all"
                      style={{ width: `${gainerPct}%` }}
                    />
                    <div
                      className="bg-brand-down h-full ml-auto transition-all"
                      style={{ width: `${loserPct}%` }}
                    />
                  </div>
                </div>

                <div
                  className={`text-right text-xs font-mono font-bold tabular-nums ${
                    isUp ? 'text-brand-up' : 'text-brand-down'
                  }`}
                >
                  {isUp ? '+' : ''}
                  {sec.avg_change_pct.toFixed(2)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
