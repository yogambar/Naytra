import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  History,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { Card3D } from '../design/Card3D';
import { DataModeBadge } from '../design/Badge';
import { Skeleton } from '../design/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useSyncedWallet } from '../context/WalletContext';
import {
  fetchMarketPulse,
  buildFallbackMarketPulse,
  type MarketPulseResponse,
} from '../services/marketService';
import {
  getCachedUserActivity,
  syncUserActivityFromFirestore,
  recordStockSearch,
  recordStockView,
  removeSearchHistoryItem,
  clearSearchHistory,
  buildPersonalizationProfile,
  type UserActivityState,
} from '../services/userActivityService';
import { StockSearchBar } from '../components/dashboard/StockSearchBar';
import { MarketTickerRibbon } from '../components/dashboard/MarketTickerRibbon';
import { PersonalizedForecastStrip } from '../components/dashboard/PersonalizedForecastStrip';
import { TopMoversSection, type MoverFilterTab } from '../components/dashboard/TopMoversSection';
import { SectorsTrendingSection } from '../components/dashboard/SectorsTrendingSection';
import { PersonalizedNewsFeed } from '../components/dashboard/PersonalizedNewsFeed';
import { TradingScreensSidebar } from '../components/dashboard/TradingScreensSidebar';
import { StockChartModal } from '../components/market/StockChartModal';

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardPage: React.FC = () => {
  const authCtx = useAuth();
  const uid = authCtx.user?.uid || authCtx.profile?.id || 'guest';
  const displayName =
    authCtx.profile?.name?.trim().split(/\s+/)[0] ||
    authCtx.user?.email?.split('@')[0] ||
    'Trader';

  const { wallet, portfolio, orders, refreshFinancials } = useSyncedWallet();

  const [activity, setActivity] = useState<UserActivityState>(() => getCachedUserActivity(uid));
  const [pulse, setPulse] = useState<MarketPulseResponse>(() => buildFallbackMarketPulse([]));
  const [loadingPulse, setLoadingPulse] = useState<boolean>(true);
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [moverTab, setMoverTab] = useState<MoverFilterTab>('gainers');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const topMoversRef = useRef<HTMLDivElement>(null);

  const holdings = portfolio?.holdings ?? [];

  // Re-load user activity when uid changes & sync with Firestore
  useEffect(() => {
    setActivity(getCachedUserActivity(uid));
    let cancelled = false;
    syncUserActivityFromFirestore(uid)
      .then((synced) => {
        if (!cancelled) setActivity(synced);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Priority symbols derived from held stocks + recent searches/views for targeted news/ML feed
  const seedSymbols = useMemo(() => {
    const held = holdings.map((h) => h.symbol.toUpperCase());
    const searched = activity.recentSearches
      .map((s) => s.symbol?.toUpperCase())
      .filter((s): s is string => Boolean(s));
    return Array.from(new Set([...activity.recentViewed, ...held, ...searched])).slice(0, 8);
  }, [holdings, activity.recentViewed, activity.recentSearches]);

  const loadPulse = useCallback(async () => {
    try {
      const [pulseData] = await Promise.all([
        fetchMarketPulse(seedSymbols),
        refreshFinancials(),
      ]);
      if (pulseData) {
        setPulse(pulseData);
      }
    } catch {
      // Fallback already set
    } finally {
      setLoadingPulse(false);
    }
  }, [seedSymbols.join(','), refreshFinancials]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPulse((prev) => (pulse.predictions.length === 0 ? prev : false));
    Promise.all([fetchMarketPulse(seedSymbols), refreshFinancials()])
      .then(([pulseData]) => {
        if (!cancelled && pulseData) {
          setPulse(pulseData);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoadingPulse(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seedSymbols.join(','), refreshFinancials]);

  const predictions = pulse.predictions;
  const predMap = useMemo(
    () => new Map(predictions.map((p) => [p.symbol.toUpperCase(), p])),
    [predictions]
  );

  // Portfolio live valuation
  const cashInr = wallet.balance_paise / 100;
  const activeInvestedInr = holdings.reduce((s, h) => s + h.invested_paise / 100, 0);
  const activePositionValueInr = holdings.reduce((s, h) => {
    const livePrice = predMap.get(h.symbol.toUpperCase())?.price ?? h.avg_price_paise / 100;
    return s + livePrice * h.quantity;
  }, 0);
  const oneDayReturnInr = holdings.reduce((s, h) => {
    const dayChange = predMap.get(h.symbol.toUpperCase())?.change ?? 0;
    return s + dayChange * h.quantity;
  }, 0);
  const oneDayReturnPct =
    activePositionValueInr > 0 && activePositionValueInr - oneDayReturnInr !== 0
      ? (oneDayReturnInr / (activePositionValueInr - oneDayReturnInr)) * 100
      : 0;

  const unrealizedPnlInr = activePositionValueInr - activeInvestedInr;
  const totalPortfolioValue = cashInr + activePositionValueInr;
  const totalPnlInr = unrealizedPnlInr + (portfolio?.realized_pnl_paise ?? 0) / 100;
  const totalReturnPct = activeInvestedInr > 0 ? (totalPnlInr / activeInvestedInr) * 100 : 0;

  const isTotalUp = totalPnlInr >= 0;
  const isDayUp = oneDayReturnInr >= 0;

  // Personalized profile & recommendations
  const personalization = useMemo(
    () =>
      buildPersonalizationProfile({
        activity,
        holdings,
        orders,
        predictions,
      }),
    [activity, holdings, orders, predictions]
  );

  // Distinct sorted categories for filters
  const sectorNames = useMemo(
    () => pulse.sectors.map((s) => s.sector),
    [pulse.sectors]
  );

  // Recently viewed strip: prioritize user's viewed/searched symbols, fall back to portfolio/personal picks
  const recentlyViewedTickers = useMemo(() => {
    const viewed = activity.recentViewed
      .map((sym) => predMap.get(sym.toUpperCase()))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    if (viewed.length >= 4) return viewed.slice(0, 4);

    const seen = new Set(viewed.map((v) => v.symbol));
    const extras = personalization.picks
      .map((p) => p.ticker)
      .filter((t) => !seen.has(t.symbol));
    return [...viewed, ...extras].slice(0, 4);
  }, [activity.recentViewed, predMap, personalization.picks]);

  const handleSearchSelect = useCallback(
    (symbol: string, searchQueryUsed?: string) => {
      const sym = symbol.toUpperCase();
      const meta = predMap.get(sym);
      const next = recordStockSearch(uid, {
        query: searchQueryUsed || meta?.name || sym,
        symbol: sym,
        name: meta?.name,
        sector: meta?.sector,
      });
      setActivity(next);
      setSelectedStock(sym);
    },
    [uid, predMap]
  );

  const handleOpenStock = useCallback(
    (symbol: string) => {
      const sym = symbol.toUpperCase();
      const meta = predMap.get(sym);
      const next = recordStockView(uid, sym, meta?.sector);
      setActivity(next);
      setSelectedStock(sym);
    },
    [uid, predMap]
  );

  const handleRemoveSearchItem = useCallback(
    (id: string) => {
      setActivity(removeSearchHistoryItem(uid, id));
    },
    [uid]
  );

  const handleClearSearchHistory = useCallback(() => {
    setActivity(clearSearchHistory(uid));
  }, [uid]);

  const handleApplyScreen = useCallback((tab: MoverFilterTab) => {
    setMoverTab(tab);
    topMoversRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const recentOrders = orders.slice(0, 4);

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto">
      {/* ── Top Header + Personalized Greeting + Global Stock Search ───────── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-brand-marigold-text">
              {getGreetingPrefix()}, {displayName}
            </span>
            <DataModeBadge mode="REPLAY" />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-tertiary">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  pulse.market.is_open ? 'bg-brand-up animate-pulse' : 'bg-brand-marigold'
                }`}
              />
              {pulse.market.status_text}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Market Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto lg:min-w-[380px]">
          <StockSearchBar
            tickers={predictions}
            recentSearches={activity.recentSearches}
            onSelectStock={handleSearchSelect}
            onRemoveHistoryItem={handleRemoveSearchItem}
            onClearHistory={handleClearSearchHistory}
          />
          <button
            type="button"
            onClick={loadPulse}
            aria-label="Refresh live prices and AI forecasts"
            title="Refresh live rates & forecasts"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary hover:border-brand-marigold/40 transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Live BSE Sensex & Sector Index Ribbon (Groww top bar) ──────────── */}
      <MarketTickerRibbon
        sensexIndex={pulse.sensex_index}
        sectors={pulse.sectors}
        selectedSector={selectedSector}
        onSelectSector={setSelectedSector}
      />

      {/* ── Two-Column Groww Explore Layout ────────────────────────────────── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* ━━ LEFT COLUMN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="space-y-7 min-w-0 w-full">
          {/* 1. Recently Viewed & Personalized Watch Strip (Groww screenshot 1) */}
          <section aria-labelledby="recently-viewed-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="recently-viewed-heading" className="text-base font-extrabold text-text-primary tracking-tight">
                {activity.recentViewed.length > 0 ? 'Recently viewed' : 'Quick explore'}
              </h2>
              {activity.recentSearches.length > 0 && (
                <span className="text-[11px] text-text-tertiary">
                  Personalized from {activity.recentSearches.length} recent{' '}
                  {activity.recentSearches.length === 1 ? 'search' : 'searches'}
                </span>
              )}
            </div>

            {loadingPulse && predictions.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <Skeleton key={idx} width="100%" height="96px" className="rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentlyViewedTickers.map((t) => {
                  const isUp = t.change_pct >= 0;
                  const isAiUp = t.forecast_delta_pct >= 0;
                  return (
                    <button
                      key={t.symbol}
                      type="button"
                      onClick={() => handleOpenStock(t.symbol)}
                      className="rounded-xl border border-surface-border bg-surface-raised p-3.5 text-left hover:border-brand-marigold/45 transition-all cursor-pointer group flex flex-col justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-8 h-8 rounded-full bg-surface-inset border border-surface-border flex items-center justify-center font-mono font-bold text-[10px] text-text-primary shrink-0">
                          {t.symbol.slice(0, 3)}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isAiUp ? 'text-purple-300 bg-purple-950/60' : 'text-amber-300 bg-amber-950/50'
                          }`}
                        >
                          AI {isAiUp ? '↑' : '↓'}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-text-primary group-hover:text-brand-up transition-colors truncate">
                          {t.symbol}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5 font-mono text-[11px] tabular-nums">
                          <span className="font-semibold text-text-secondary">
                            ₹{t.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                          <span
                            className={`font-bold ${isUp ? 'text-brand-up' : 'text-brand-down'}`}
                          >
                            {isUp ? '+' : ''}
                            {t.change_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Personalized Picks & Live ML Forecasts by Category */}
          {personalization.picks.length > 0 && (
            <PersonalizedForecastStrip
              picks={personalization.picks}
              activeCategory={selectedSector}
              categories={sectorNames}
              onCategoryChange={setSelectedSector}
              onSelectStock={handleOpenStock}
            />
          )}

          {/* 3. Top Movers Today (Gainers / Losers / Volume / AI / For You) */}
          <div ref={topMoversRef}>
            {loadingPulse && predictions.length === 0 ? (
              <Skeleton width="100%" height="320px" className="rounded-xl" />
            ) : (
              <TopMoversSection
                tickers={predictions}
                activeTab={moverTab}
                onTabChange={setMoverTab}
                selectedSector={selectedSector}
                sectors={sectorNames}
                onSectorChange={setSelectedSector}
                heldSymbols={personalization.heldSymbolsSet}
                searchedSymbols={personalization.searchedSymbolsSet}
                preferredSectors={personalization.topSectors}
                onSelectStock={handleOpenStock}
              />
            )}
          </div>

          {/* 4. Sectors Trending Today (Groww Gainers/Losers Category Breakdown) */}
          {pulse.sectors.length > 0 && (
            <SectorsTrendingSection
              sectors={pulse.sectors}
              selectedSector={selectedSector}
              onSelectSector={(sec) => {
                setSelectedSector(sec);
              }}
            />
          )}

          {/* 5. Personalized Stocks in News Today (Groww 2-column News Feed) */}
          <PersonalizedNewsFeed
            articles={pulse.news}
            heldSymbols={personalization.heldSymbolsSet}
            searchedSymbols={personalization.searchedSymbolsSet}
            onSelectStock={handleOpenStock}
          />
        </div>

        {/* ━━ RIGHT STICKY COLUMN (Your Investments + Trading Screens + History) */}
        <aside
          aria-label="Portfolio summary and personalized screens"
          className="space-y-5 lg:sticky lg:top-6 lg:self-start"
        >
          {/* Your Investments Card (matches Groww right-rail screenshot 1) */}
          <section aria-labelledby="your-investments-heading" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 id="your-investments-heading" className="text-sm font-extrabold text-text-primary tracking-tight">
                Your investments
              </h2>
              <Link
                to="/holdings"
                className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary transition-colors"
              >
                {holdings.length} Open
              </Link>
            </div>

            <Card3D elevation="e2" interactive={false} className="p-5 border border-surface-border space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Total Portfolio
                </span>
                <div className="text-2xl font-extrabold font-mono text-text-primary mt-0.5 tabular-nums">
                  {formatINR(totalPortfolioValue)}
                </div>
              </div>

              <div className="border-t border-dashed border-surface-border" />

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">1D returns</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      isDayUp ? 'text-brand-up' : 'text-brand-down'
                    }`}
                  >
                    {isDayUp ? '+' : ''}
                    {formatINR(oneDayReturnInr)} ({isDayUp ? '+' : ''}
                    {oneDayReturnPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Total returns</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      isTotalUp ? 'text-brand-up' : 'text-brand-down'
                    }`}
                  >
                    {isTotalUp ? '+' : ''}
                    {formatINR(totalPnlInr)} ({isTotalUp ? '+' : ''}
                    {totalReturnPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Invested in stocks</span>
                  <span className="font-mono font-bold text-text-primary tabular-nums">
                    {formatINR(activeInvestedInr)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Available Cash</span>
                  <span className="font-mono font-bold text-text-primary tabular-nums">
                    {formatINR(cashInr)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/wallet"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-surface-inset border border-surface-border text-text-primary hover:border-brand-marigold/50 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-brand-marigold" aria-hidden="true" />
                  Manage Wallet
                </Link>
                <Link
                  to="/holdings"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-brand-up/15 border border-brand-up/30 text-brand-up hover:bg-brand-up/25 transition-colors"
                >
                  View Holdings
                </Link>
              </div>
            </Card3D>
          </section>

          {/* Trading Screens Card (Groww right rail) */}
          <TradingScreensSidebar
            predictions={predictions}
            activeTab={moverTab}
            onApplyScreen={handleApplyScreen}
          />

          {/* Search History & Recent Orders Card */}
          <section aria-labelledby="recent-activity-heading" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 id="recent-activity-heading" className="text-sm font-extrabold text-text-primary tracking-tight">
                Your activity &amp; search history
              </h2>
              {recentOrders.length > 0 && (
                <Link to="/wallet" className="text-[11px] font-bold text-text-tertiary hover:text-text-primary">
                  All Ledger →
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-raised p-4 space-y-4 shadow-sm">
              {/* Search history chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-text-tertiary">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    Recently searched
                  </span>
                  {activity.recentSearches.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSearchHistory}
                      className="text-text-tertiary hover:text-brand-down font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {activity.recentSearches.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary">
                    Search any Sensex stock above to build your personalized history &amp; news feed.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activity.recentSearches.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.symbol && handleOpenStock(item.symbol)}
                        className="px-2.5 py-1 rounded-full bg-surface-inset border border-surface-border text-[11px] font-semibold text-text-primary hover:border-brand-marigold/50 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>{item.symbol || item.query}</span>
                        {item.symbol && predMap.get(item.symbol) && (
                          <span
                            className={`font-mono text-[10px] ${
                              (predMap.get(item.symbol)?.change_pct ?? 0) >= 0
                                ? 'text-brand-up'
                                : 'text-brand-down'
                            }`}
                          >
                            {(predMap.get(item.symbol)?.change_pct ?? 0) >= 0 ? (
                              <ArrowUpRight className="w-3 h-3 inline" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 inline" aria-hidden="true" />
                            )}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-surface-border" />

              {/* Recent Orders */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                  <History className="w-3.5 h-3.5" aria-hidden="true" />
                  Recent Orders
                </div>

                {recentOrders.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary">
                    No executed orders yet. Select any stock to trade or view AI forecast.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map((ord) => {
                      const isBuy = ord.side === 'BUY';
                      return (
                        <button
                          key={ord.order_id}
                          type="button"
                          onClick={() => handleOpenStock(ord.symbol)}
                          className="w-full p-2.5 rounded-lg bg-surface-inset/50 border border-surface-border/70 hover:border-surface-border flex items-center justify-between text-left text-xs transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] shrink-0 ${
                                isBuy
                                  ? 'bg-brand-up-bg text-brand-up border border-brand-up/30'
                                  : 'bg-brand-down-bg text-brand-down border border-brand-down/30'
                              }`}
                            >
                              {ord.side}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-text-primary truncate">{ord.symbol}</div>
                              <div className="text-[10px] text-text-tertiary font-mono truncate">
                                {ord.quantity} sh • {ord.order_mode}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-mono shrink-0 tabular-nums">
                            <div className="font-bold text-text-primary">
                              {formatINR(ord.total_paise / 100)}
                            </div>
                            <div className="text-[10px] text-text-tertiary">
                              @ {formatINR(ord.price_paise / 100)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* ── Shared Stock Chart, ML Forecast, Reasoning & News Modal ─────────── */}
      {selectedStock && (
        <StockChartModal
          symbol={selectedStock}
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
          onTradeSuccess={refreshFinancials}
        />
      )}
    </div>
  );
};
