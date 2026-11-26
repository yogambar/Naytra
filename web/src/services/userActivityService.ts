/**
 * Per-user Personalization & Search Activity Service.
 * Tracks each user's stock search history, recently viewed tickers, and sector affinity
 * with instant local persistence and best-effort Cloud Firestore synchronization.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { HoldingPositionDoc, OrderHistoryItem } from './firestoreService';
import type { PredictionTicker } from './marketService';

export interface RecentSearchEntry {
  id: string;
  query: string;
  symbol?: string;
  name?: string;
  sector?: string;
  timestamp: string;
}

export interface UserActivityState {
  recentSearches: RecentSearchEntry[];
  recentViewed: string[];
  sectorAffinity: Record<string, number>;
}

export interface PersonalizedStockPick {
  ticker: PredictionTicker;
  reason: string;
  score: number;
  tag: 'Portfolio' | 'Recently Searched' | 'Sector Match' | 'AI High Conviction';
}

const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_VIEWED = 8;

const DEFAULT_ACTIVITY: UserActivityState = {
  recentSearches: [],
  recentViewed: [],
  sectorAffinity: {},
};

function storageKey(userId: string): string {
  return `naytra_activity_${userId}`;
}

function canUseFirestore(userId: string): boolean {
  return Boolean(userId && auth.currentUser && auth.currentUser.uid === userId);
}

/** Read cached user search/view history synchronously for instant dashboard paint. */
export function getCachedUserActivity(userId: string): UserActivityState {
  if (!userId || typeof window === 'undefined') return { ...DEFAULT_ACTIVITY };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_ACTIVITY };
    const parsed = JSON.parse(raw) as Partial<UserActivityState>;
    return {
      recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
      recentViewed: Array.isArray(parsed.recentViewed) ? parsed.recentViewed : [],
      sectorAffinity:
        parsed.sectorAffinity && typeof parsed.sectorAffinity === 'object'
          ? parsed.sectorAffinity
          : {},
    };
  } catch {
    return { ...DEFAULT_ACTIVITY };
  }
}

function saveUserActivity(userId: string, state: UserActivityState): void {
  if (!userId) return;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }

  if (canUseFirestore(userId)) {
    setDoc(
      doc(db, 'users', userId),
      {
        recent_searches: state.recentSearches,
        recent_views: state.recentViewed,
        sector_affinity: state.sectorAffinity,
        activity_updated_at: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => null);
  }
}

/** Pull any cross-device search history saved on the user's Firestore profile. */
export async function syncUserActivityFromFirestore(userId: string): Promise<UserActivityState> {
  const local = getCachedUserActivity(userId);
  if (!canUseFirestore(userId)) return local;

  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'users', userId)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (!snap || !snap.exists()) return local;
    const data = snap.data() as {
      recent_searches?: RecentSearchEntry[];
      recent_views?: string[];
      sector_affinity?: Record<string, number>;
    };

    const mergedSearches =
      Array.isArray(data.recent_searches) && data.recent_searches.length > local.recentSearches.length
        ? data.recent_searches.slice(0, MAX_RECENT_SEARCHES)
        : local.recentSearches;
    const mergedViewed = Array.from(
      new Set([...local.recentViewed, ...(Array.isArray(data.recent_views) ? data.recent_views : [])])
    ).slice(0, MAX_RECENT_VIEWED);
    const mergedAffinity = { ...(data.sector_affinity || {}), ...local.sectorAffinity };

    const merged: UserActivityState = {
      recentSearches: mergedSearches,
      recentViewed: mergedViewed,
      sectorAffinity: mergedAffinity,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(merged));
      } catch {
        // ignore
      }
    }
    return merged;
  } catch {
    return local;
  }
}

/** Record a stock search or selection into user's recent search history & sector affinity. */
export function recordStockSearch(
  userId: string,
  payload: { query: string; symbol?: string; name?: string; sector?: string }
): UserActivityState {
  const current = getCachedUserActivity(userId);
  const cleanQuery = payload.query.trim();
  if (!cleanQuery && !payload.symbol) return current;

  const sym = payload.symbol?.toUpperCase();
  const entry: RecentSearchEntry = {
    id: sym ? `sym_${sym}` : `q_${cleanQuery.toLowerCase()}`,
    query: cleanQuery || sym || '',
    symbol: sym,
    name: payload.name,
    sector: payload.sector,
    timestamp: new Date().toISOString(),
  };

  const nextSearches = [
    entry,
    ...current.recentSearches.filter(
      (item) =>
        !(sym && item.symbol?.toUpperCase() === sym) &&
        item.query.toLowerCase() !== entry.query.toLowerCase()
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  const nextViewed = sym
    ? [sym, ...current.recentViewed.filter((s) => s !== sym)].slice(0, MAX_RECENT_VIEWED)
    : current.recentViewed;

  const nextAffinity = { ...current.sectorAffinity };
  if (payload.sector) {
    nextAffinity[payload.sector] = (nextAffinity[payload.sector] || 0) + 2;
  }

  const next: UserActivityState = {
    recentSearches: nextSearches,
    recentViewed: nextViewed,
    sectorAffinity: nextAffinity,
  };
  saveUserActivity(userId, next);
  return next;
}

/** Record that the user inspected a stock's chart / forecast / news. */
export function recordStockView(
  userId: string,
  symbol: string,
  sector?: string
): UserActivityState {
  const current = getCachedUserActivity(userId);
  const sym = symbol.trim().toUpperCase();
  if (!sym) return current;

  const nextViewed = [sym, ...current.recentViewed.filter((s) => s !== sym)].slice(
    0,
    MAX_RECENT_VIEWED
  );
  const nextAffinity = { ...current.sectorAffinity };
  if (sector) {
    nextAffinity[sector] = (nextAffinity[sector] || 0) + 1;
  }

  const next: UserActivityState = {
    ...current,
    recentViewed: nextViewed,
    sectorAffinity: nextAffinity,
  };
  saveUserActivity(userId, next);
  return next;
}

/** Remove one entry from search history. */
export function removeSearchHistoryItem(userId: string, id: string): UserActivityState {
  const current = getCachedUserActivity(userId);
  const next: UserActivityState = {
    ...current,
    recentSearches: current.recentSearches.filter((item) => item.id !== id),
  };
  saveUserActivity(userId, next);
  return next;
}

/** Clear all recent searches and viewed history for the user. */
export function clearSearchHistory(userId: string): UserActivityState {
  const next: UserActivityState = {
    recentSearches: [],
    recentViewed: [],
    sectorAffinity: {},
  };
  saveUserActivity(userId, next);
  return next;
}

/**
 * Derive personalized sector affinities, priority symbols for the news/ML feed,
 * and ranked stock picks tailored to the user's holdings, orders, searches, and live market signals.
 */
export function buildPersonalizationProfile(params: {
  activity: UserActivityState;
  holdings: HoldingPositionDoc[];
  orders: OrderHistoryItem[];
  predictions: PredictionTicker[];
}): {
  topSectors: string[];
  prioritySymbols: string[];
  picks: PersonalizedStockPick[];
  heldSymbolsSet: Set<string>;
  searchedSymbolsSet: Set<string>;
} {
  const { activity, holdings, orders, predictions } = params;
  const predMap = new Map(predictions.map((p) => [p.symbol.toUpperCase(), p]));

  const heldSymbolsSet = new Set(holdings.map((h) => h.symbol.toUpperCase()));
  const searchedSymbolsSet = new Set(
    [
      ...activity.recentViewed,
      ...activity.recentSearches.map((s) => s.symbol).filter((s): s is string => Boolean(s)),
    ].map((s) => s.toUpperCase())
  );

  // Score each sector by holdings (weight 4), orders (weight 2), and search/view affinity (weight 1)
  const sectorScores: Record<string, number> = { ...activity.sectorAffinity };
  holdings.forEach((h) => {
    const sec = predMap.get(h.symbol.toUpperCase())?.sector;
    if (sec) sectorScores[sec] = (sectorScores[sec] || 0) + 4;
  });
  orders.slice(0, 12).forEach((o) => {
    const sec = predMap.get(o.symbol.toUpperCase())?.sector;
    if (sec) sectorScores[sec] = (sectorScores[sec] || 0) + 2;
  });

  const topSectors = Object.entries(sectorScores)
    .sort((a, b) => b[1] - a[1])
    .map(([sector]) => sector)
    .slice(0, 4);

  const prioritySymbols = Array.from(
    new Set([
      ...activity.recentViewed.map((s) => s.toUpperCase()),
      ...Array.from(heldSymbolsSet),
      ...activity.recentSearches
        .map((s) => s.symbol?.toUpperCase())
        .filter((s): s is string => Boolean(s)),
      ...orders.slice(0, 5).map((o) => o.symbol.toUpperCase()),
    ])
  ).slice(0, 8);

  const picks: PersonalizedStockPick[] = predictions
    .map((ticker): PersonalizedStockPick => {
      const sym = ticker.symbol.toUpperCase();
      let score = ticker.forecast_delta_pct * 2 + ticker.change_pct * 0.5;
      let reason = `AI projects ${ticker.forecast_delta_pct >= 0 ? '+' : ''}${ticker.forecast_delta_pct.toFixed(2)}% • ${ticker.sector}`;
      let tag: PersonalizedStockPick['tag'] = 'AI High Conviction';

      if (heldSymbolsSet.has(sym)) {
        score += 18;
        tag = 'Portfolio';
        reason = `In your portfolio • AI target ₹${ticker.forecast_target.toLocaleString('en-IN')}`;
      } else if (searchedSymbolsSet.has(sym)) {
        score += 15;
        tag = 'Recently Searched';
        reason = `From your recent search • ${ticker.sector}`;
      } else if (topSectors.includes(ticker.sector)) {
        const rank = topSectors.indexOf(ticker.sector);
        score += 10 - rank * 2;
        tag = 'Sector Match';
        reason = `Matches your ${ticker.sector} interest • ${ticker.confidence_pct}% AI confidence`;
      }

      return { ticker, reason, score, tag };
    })
    .sort((a, b) => b.score - a.score);

  return {
    topSectors,
    prioritySymbols,
    picks,
    heldSymbolsSet,
    searchedSymbolsSet,
  };
}
