import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Search, X, Clock, Sparkles, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import type { PredictionTicker } from '../../services/marketService';
import type { RecentSearchEntry } from '../../services/userActivityService';

export interface StockSearchBarProps {
  tickers: PredictionTicker[];
  recentSearches: RecentSearchEntry[];
  onSelectStock: (symbol: string, searchQueryUsed?: string) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

export const StockSearchBar: React.FC<StockSearchBarProps> = ({
  tickers,
  recentSearches,
  onSelectStock,
  onRemoveHistoryItem,
  onClearHistory,
}) => {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmed) {
      // Show high-conviction / top movers as quick suggestions alongside recent searches
      return [...tickers]
        .sort((a, b) => Math.abs(b.forecast_delta_pct) - Math.abs(a.forecast_delta_pct))
        .slice(0, 6);
    }
    return tickers
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(trimmed) ||
          t.name.toLowerCase().includes(trimmed) ||
          t.sector.toLowerCase().includes(trimmed) ||
          t.bse_code.includes(trimmed)
      )
      .slice(0, 8);
  }, [tickers, trimmed]);

  const tickerBySymbol = useMemo(
    () => new Map(tickers.map((t) => [t.symbol.toUpperCase(), t])),
    [tickers]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  // Global Cmd+K / '/' keyboard shortcut to jump to stock search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (!isEditable && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const selectSymbol = (symbol: string, explicitQuery?: string) => {
    onSelectStock(symbol, explicitQuery ?? (query.trim() || undefined));
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && matches[activeIndex]) {
      selectSymbol(matches[activeIndex].symbol);
      return;
    }
    if (matches.length > 0 && trimmed) {
      selectSymbol(matches[0].symbol, query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((prev) => (matches.length ? (prev + 1) % matches.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        matches.length ? (prev <= 0 ? matches.length - 1 : prev - 1) : -1
      );
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const activeDescendantId =
    isOpen && activeIndex >= 0 && matches[activeIndex]
      ? `${listboxId}-opt-${matches[activeIndex].symbol}`
      : undefined;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <search>
        <form
          role="search"
          aria-label="Search BSE Sensex 30 stocks"
          onSubmit={handleSubmit}
          className="relative"
        >
          <label htmlFor={inputId} className="sr-only">
            Search Sensex 30 stocks by name, ticker symbol, or sector
          </label>
          <Search
            className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={inputId}
            name="stockQuery"
            type="search"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendantId}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Search Naytra (e.g. Reliance, TCS, Banking)..."
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[44px] pl-10 pr-16 py-2 text-sm rounded-xl bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-marigold/70 focus-visible:border-brand-marigold transition-colors shadow-sm"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-inset transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-text-tertiary bg-surface-inset border border-surface-border rounded-md absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              ⌘K
            </kbd>
          )}
        </form>
      </search>

      {/* Live region for screen readers when filtering */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOpen && trimmed
          ? `${matches.length} ${matches.length === 1 ? 'stock' : 'stocks'} matched ${query}`
          : ''}
      </div>

      {/* Autocomplete + Recent Searches Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-surface-raised border border-surface-border shadow-xl z-40 overflow-hidden max-h-[420px] overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Recent Searches Section when query is empty */}
          {!trimmed && recentSearches.length > 0 && (
            <div className="p-3.5 border-b border-surface-border bg-surface-inset/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-tertiary hover:text-brand-down transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => {
                  const sym = item.symbol?.toUpperCase();
                  const live = sym ? tickerBySymbol.get(sym) : undefined;
                  return (
                    <div
                      key={item.id}
                      className="inline-flex items-center rounded-full bg-surface-raised border border-surface-border text-xs overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (sym) {
                            selectSymbol(sym, item.query);
                          } else {
                            setQuery(item.query);
                            setActiveIndex(0);
                          }
                        }}
                        className="px-2.5 py-1 flex items-center gap-1.5 hover:bg-surface-inset transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-text-primary">{sym || item.query}</span>
                        {live && (
                          <span
                            className={`font-mono text-[10px] font-bold ${
                              live.change_pct >= 0 ? 'text-brand-up' : 'text-brand-down'
                            }`}
                          >
                            {live.change_pct >= 0 ? '+' : ''}
                            {live.change_pct.toFixed(2)}%
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistoryItem(item.id);
                        }}
                        aria-label={`Remove ${item.symbol || item.query} from search history`}
                        className="pr-2 pl-0.5 py-1 text-text-tertiary hover:text-brand-down transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section header */}
          <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
            <span>{trimmed ? `Results (${matches.length})` : 'AI High-Conviction & Movers'}</span>
            <span className="inline-flex items-center gap-1 text-purple-400">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              ML Targets
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-text-tertiary">
              No Sensex 30 stock found for &ldquo;{query}&rdquo;. Try Reliance, TCS, HDFC, or a sector like Banking.
            </div>
          ) : (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Stock search suggestions"
              className="divide-y divide-surface-border/60"
            >
              {matches.map((t, idx) => {
                const isUp = t.change_pct >= 0;
                const isAiUp = t.forecast_delta_pct >= 0;
                const highlighted = idx === activeIndex;
                return (
                  <button
                    key={t.symbol}
                    id={`${listboxId}-opt-${t.symbol}`}
                    type="button"
                    role="option"
                    aria-selected={highlighted}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectSymbol(t.symbol)}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      highlighted ? 'bg-surface-inset' : 'hover:bg-surface-inset/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-inset border border-surface-border flex items-center justify-center font-mono font-bold text-xs text-text-primary shrink-0">
                        {t.symbol.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary truncate">
                            {t.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-base border border-surface-border text-text-tertiary shrink-0">
                            {t.symbol}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-tertiary flex items-center gap-2 mt-0.5">
                          <span>{t.sector}</span>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-0.5 font-semibold ${
                              isAiUp ? 'text-purple-400' : 'text-amber-400'
                            }`}
                          >
                            AI {isAiUp ? '↑' : '↓'} {isAiUp ? '+' : ''}
                            {t.forecast_delta_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-xs font-bold text-text-primary tabular-nums">
                        ₹{t.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-[11px] font-semibold inline-flex items-center justify-end tabular-nums ${
                          isUp ? 'text-brand-up' : 'text-brand-down'
                        }`}
                      >
                        {isUp ? (
                          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
                        )}
                        {isUp ? '+' : ''}
                        {t.change_pct.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
