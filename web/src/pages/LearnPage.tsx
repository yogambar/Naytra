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
      desc: 'Open, High, Low, Close (OHLC). Identifying bullish green and bearish red candles with price momentum.',
      duration: '7 min',
      progress: 100,
      completed: true,
    },
    {
      id: 3,
      title: 'Module 3: ML Purple Forecast Candles (#8A2BE2)',
      desc: 'Deep PyTorch LSTM time-series projection. How remaining candles of today’s session are forecasted and replaced by real candles in real-time.',
      duration: '8 min',
      progress: 60,
      completed: false,
    },
    {
      id: 4,
      title: 'Module 4: Gemini Market Reasoning & Catalysts',
      desc: 'How multimodal LLM synthesis parses news sentiment, moving averages, and support/resistance into structured causal rationales.',
      duration: '6 min',
      progress: 40,
      completed: false,
    },
    {
      id: 5,
      title: 'Module 5: Double-Entry Ledger & Integer Currency',
      desc: 'Why financial engineering requires zero-sum debits and credits stored strictly in integer paise, preventing precision bugs.',
      duration: '8 min',
      progress: 25,
      completed: false,
    },
    {
      id: 6,
      title: 'Module 6: Paper Trading & Order Matching',
      desc: 'Simulated market orders, limit orders, and slippage mechanics without risking real capital.',
      duration: '6 min',
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
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40">
            ML & Gemini Enabled
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">
          Master stock market fundamentals, ML time-series forecasting, and risk management
        </p>
      </div>

      {/* AI Forecasting Feature Highlight */}
      <Card3D elevation="e2" className="p-5 bg-purple-950/20 border border-purple-800/40 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-purple-900/40 border border-purple-700/50 text-purple-300 shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            AI Forecasting is coming in Phase 2 for automated auto-traders; interactive ML purple candles and Gemini reasoning are now active!
            <span className="w-2 h-2 rounded-full bg-[#8A2BE2] animate-pulse" />
          </h2>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Naytra projects the remaining candles for today’s session in <strong>Purple (<span className="text-purple-400 font-mono">#8A2BE2</span>)</strong>. Each purple candle is dynamically replaced by the real green or red candle as time passes. Gemini 2.5 Flash explains the causal forces behind every projected price move.
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
