import React, { useState } from 'react';
import { Newspaper, ExternalLink, Sparkles } from 'lucide-react';
import type { PersonalizedNewsArticle } from '../../services/marketService';

export interface PersonalizedNewsFeedProps {
  articles: PersonalizedNewsArticle[];
  heldSymbols: Set<string>;
  searchedSymbols: Set<string>;
  onSelectStock: (symbol: string) => void;
}

type NewsFilter = 'ALL' | 'FOR_YOU' | 'POSITIVE' | 'CAUTION';

function getSafeUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {
    // invalid url
  }
  return null;
}

function getSentimentBadge(score?: number) {
  if (typeof score === 'number' && score >= 0.2) {
    return {
      label: 'Positive',
      cls: 'bg-brand-up-bg text-brand-up border-brand-up/30',
    };
  }
  if (typeof score === 'number' && score <= -0.15) {
    return {
      label: 'Caution',
      cls: 'bg-brand-down-bg text-brand-down border-brand-down/30',
    };
  }
  return {
    label: 'Neutral',
    cls: 'bg-surface-inset text-text-tertiary border-surface-border',
  };
}

export const PersonalizedNewsFeed: React.FC<PersonalizedNewsFeedProps> = ({
  articles,
  heldSymbols,
  searchedSymbols,
  onSelectStock,
}) => {
  const [filter, setFilter] = useState<NewsFilter>('ALL');

  const filtered = React.useMemo(() => {
    return articles.filter((a) => {
      const sym = (a.symbol || '').toUpperCase();
      if (filter === 'FOR_YOU') {
        return a.is_personalized || heldSymbols.has(sym) || searchedSymbols.has(sym);
      }
      if (filter === 'POSITIVE') return (a.sentiment_score ?? 0) >= 0.2;
      if (filter === 'CAUTION') return (a.sentiment_score ?? 0) <= -0.15;
      return true;
    });
  }, [articles, filter, heldSymbols, searchedSymbols]);

  const shown = (filtered.length > 0 ? filtered : articles).slice(0, 6);

  return (
    <section aria-labelledby="news-today-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="news-today-heading" className="text-lg font-extrabold text-text-primary tracking-tight">
            Stocks in news today
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/50 text-purple-300 border border-purple-800/40 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            Personalized Feed
          </span>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Filter stock news">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'FOR_YOU', label: 'For You' },
              { id: 'POSITIVE', label: 'Positive' },
              { id: 'CAUTION', label: 'Caution' },
            ] as const
          ).map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-surface-raised border-text-primary text-text-primary'
                    : 'border-surface-border text-text-tertiary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-raised p-8 text-center text-xs text-text-tertiary">
          <Newspaper className="w-7 h-7 mx-auto mb-2 opacity-60" aria-hidden="true" />
          Loading latest Sensex news catalysts...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {shown.map((article) => {
            const sym = (article.symbol || '').toUpperCase();
            const isUp = (article.change_pct ?? 0) >= 0;
            const sentiment = getSentimentBadge(article.sentiment_score);
            const safeUrl = getSafeUrl(article.url);
            const isHeld = heldSymbols.has(sym);
            const isSearched = searchedSymbols.has(sym);

            return (
              <article
                key={article.uuid || `${sym}_${article.title}`}
                className="rounded-xl border border-surface-border bg-surface-raised p-4 flex flex-col justify-between gap-3 hover:border-brand-marigold/40 transition-colors shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => sym && onSelectStock(sym)}
                      className="flex items-center gap-2 min-w-0 text-left group cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-lg bg-surface-inset border border-surface-border flex items-center justify-center font-mono font-bold text-[10px] text-text-primary shrink-0">
                        {sym.slice(0, 3) || 'BSE'}
                      </span>
                      <span className="text-xs font-extrabold text-text-primary group-hover:text-brand-up transition-colors truncate">
                        {sym || 'SENSEX'}
                      </span>
                      {isHeld && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-up/15 text-brand-up font-semibold shrink-0">
                          Held
                        </span>
                      )}
                      {!isHeld && isSearched && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-marigold/15 text-brand-marigold-text font-semibold shrink-0">
                          Searched
                        </span>
                      )}
                    </button>

                    {typeof article.change_pct === 'number' && (
                      <span
                        className={`text-xs font-mono font-bold shrink-0 tabular-nums ${
                          isUp ? 'text-brand-up' : 'text-brand-down'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {article.change_pct.toFixed(2)}%
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-text-primary leading-snug line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">
                    {article.summary || article.description}
                  </p>
                </div>

                <footer className="pt-2 border-t border-surface-border/70 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 min-w-0 text-text-tertiary">
                    <span className="truncate font-semibold">{article.source || 'Market Feed'}</span>
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${sentiment.cls}`}>
                      {sentiment.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sym && (
                      <button
                        type="button"
                        onClick={() => onSelectStock(sym)}
                        className="font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                      >
                        Chart &amp; AI
                      </button>
                    )}
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Read source article on ${article.source || 'publisher'}`}
                        className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
