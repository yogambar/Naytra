import React from 'react';
import { TrendingUp, TrendingDown, Sparkles, BarChart3, ChevronRight } from 'lucide-react';
import type { MoverFilterTab } from './TopMoversSection';
import type { PredictionTicker } from '../../services/marketService';

export interface TradingScreensSidebarProps {
  predictions: PredictionTicker[];
  activeTab: MoverFilterTab;
  onApplyScreen: (tab: MoverFilterTab, symbolToInspect?: string) => void;
}

export const TradingScreensSidebar: React.FC<TradingScreensSidebarProps> = ({
  predictions,
  activeTab,
  onApplyScreen,
}) => {
  const aiBullishCount = predictions.filter((p) => p.stance === 'BULLISH').length;
  const gainersCount = predictions.filter((p) => p.change_pct > 0).length;
  const losersCount = predictions.filter((p) => p.change_pct < 0).length;
  const topAi = [...predictions].sort((a, b) => b.forecast_delta_pct - a.forecast_delta_pct)[0];
  const topGainer = [...predictions].sort((a, b) => b.change_pct - a.change_pct)[0];
  const topLoser = [...predictions].sort((a, b) => a.change_pct - b.change_pct)[0];
  const topVolume = [...predictions].sort((a, b) => b.volume - a.volume)[0];

  const screens = [
    {
      id: 'ai_bullish' as const,
      sentiment: 'Bullish',
      sentimentCls: 'bg-brand-up-bg text-brand-up',
      title: 'AI High-Conviction Forecasts',
      meta: `${aiBullishCount} stocks • Top: ${topAi?.symbol || 'RELIANCE'}`,
      icon: Sparkles,
      iconCls: 'text-purple-400',
    },
    {
      id: 'gainers' as const,
      sentiment: 'Bullish',
      sentimentCls: 'bg-brand-up-bg text-brand-up',
      title: 'Momentum Breakouts',
      meta: `${gainersCount} advancing • Top: ${topGainer?.symbol || 'TCS'}`,
      icon: TrendingUp,
      iconCls: 'text-brand-up',
    },
    {
      id: 'losers' as const,
      sentiment: 'Bearish',
      sentimentCls: 'bg-brand-down-bg text-brand-down',
      title: 'Intraday Pullback Watch',
      meta: `${losersCount} sliding • Near support: ${topLoser?.symbol || 'ITC'}`,
      icon: TrendingDown,
      iconCls: 'text-brand-down',
    },
    {
      id: 'volume' as const,
      sentiment: 'Active',
      sentimentCls: 'bg-brand-marigold/15 text-brand-marigold-text',
      title: 'Volume Shockers',
      meta: `Institutional flow • Lead: ${topVolume?.symbol || 'HDFCBANK'}`,
      icon: BarChart3,
      iconCls: 'text-brand-marigold',
    },
  ];

  return (
    <section aria-labelledby="trading-screens-heading" className="space-y-2.5">
      <h2 id="trading-screens-heading" className="text-sm font-extrabold text-text-primary tracking-tight">
        Trading screens
      </h2>

      <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden shadow-sm divide-y divide-surface-border">
        {screens.map((scr) => {
          const Icon = scr.icon;
          const active = activeTab === scr.id;
          return (
            <button
              key={scr.id}
              type="button"
              aria-pressed={active}
              onClick={() => onApplyScreen(scr.id)}
              className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                active ? 'bg-surface-inset' : 'hover:bg-surface-inset/50'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${scr.sentimentCls}`}>
                  {scr.sentiment}
                </span>
                <div className="text-xs font-bold text-text-primary truncate">{scr.title}</div>
                <div className="text-[11px] text-text-tertiary truncate font-mono">{scr.meta}</div>
              </div>
              <div className="w-11 h-9 rounded-lg bg-surface-inset border border-surface-border flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${scr.iconCls}`} aria-hidden="true" />
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onApplyScreen('personal')}
          className="w-full px-4 py-2.5 text-center text-xs font-bold text-brand-up hover:bg-surface-inset/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          View Personalized Screener <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
