import React from 'react';
import { Card3D } from '../design/Card3D';
import { ProgressRing } from '../design/ProgressRing';
import { CheckCircle, Clock, Sparkles } from 'lucide-react';

export const LearnPage: React.FC = () => {
  const modules = [
    {
      id: 1,
      title: 'Module 1: The BSE Sensex 30 Explained',
      desc: 'Free-float market capitalization, constituent weights, and how India’s benchmark index is computed.',
      duration: '5 min',
      progress: 100,
      completed: true,
    },
    {
      id: 2,
      title: 'Module 2: Anatomy of a Candlestick',
      desc: 'Open, High, Low, Close (OHLC). Identifying bullish and bearish sentiment without crystal-ball predictions.',
      duration: '7 min',
      progress: 45,
      completed: false,
    },
    {
      id: 3,
      title: 'Module 3: Order Execution & Market Mechanics',
      desc: 'Market orders vs limit orders, order books, and execution slippage in active equity markets.',
      duration: '6 min',
      progress: 0,
      completed: false,
    },
    {
      id: 4,
      title: 'Module 4: Double-Entry Ledger Accounting',
      desc: 'Why financial integrity requires debits and credits in paise, eliminating floating-point math bugs.',
      duration: '8 min',
      progress: 0,
      completed: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Market Academy
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-inset text-text-tertiary border border-surface-border">
            Phase 1 Free
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">
          Master stock market fundamentals before risking real capital
        </p>
      </div>

      {/* AI Forecasting Notice (Rule: Phase 1 has no ML / LLM) */}
      <Card3D elevation="e2" className="p-4 bg-brand-marigold-bg border border-brand-marigold/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-brand-marigold-text shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold text-text-primary">
            AI forecasting is coming in Phase 2.
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Phase 1 is 100% focused on authentic market fundamentals, realistic order matching, and zero financial risk. No fake predictions or paid LLM calls.
          </p>
        </div>
      </Card3D>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod) => (
          <Card3D
            key={mod.id}
            elevation="e2"
            className="p-5 flex flex-col justify-between hover:border-brand-marigold/40 transition-colors cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  {mod.duration}
                </div>
                {mod.completed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-up bg-brand-up-bg px-2 py-0.5 rounded-full border border-brand-up/30">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                  </span>
                ) : mod.progress > 0 ? (
                  <span className="text-[11px] font-bold text-brand-marigold-text bg-brand-marigold-bg px-2 py-0.5 rounded-full border border-brand-marigold/30">
                    In Progress ({mod.progress}%)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-text-tertiary px-2 py-0.5 rounded-full bg-surface-inset">
                    Not Started
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-text-primary">{mod.title}</h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{mod.desc}</p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-surface-border">
              <span className="text-xs font-bold text-brand-marigold-text hover:underline">
                {mod.completed ? 'Review Lesson →' : mod.progress > 0 ? 'Resume Lesson →' : 'Start Lesson →'}
              </span>
              <ProgressRing progress={mod.progress} size={32} strokeWidth={3} label={`Progress for ${mod.title}`} />
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
};
