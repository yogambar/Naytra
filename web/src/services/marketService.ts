/**
 * Abstracted Market Data & Trading Service for Naytra Client App.
 * Implements Tier-1 Client-Side Caching with Stale-While-Revalidate (SWR),
 * ETag caching, and integer-paise paper trade execution.
 * The client communicates only with the abstracted API Gateway.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface MarketTicker {
  symbol: string;
  name: string;
  sector: string;
  bse_code: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  change_pct: number;
  volume: number;
}

export interface CandleData {
  timestamp: number;
  datetime_iso: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_forecast: boolean;
  color: string;
  confidence?: number;
  upper_bound?: number;
  lower_bound?: number;
}

export interface ChartResponse {
  symbol: string;
  interval: string;
  timeline?: string;
  market?: {
    is_open: boolean;
    status_text: string;
    current_time_ist: string;
  };
  total_candles: number;
  actual_candles_count: number;
  forecast_candles_count: number;
  color_legend: {
    bullish_actual: string;
    bearish_actual: string;
    forecast: string;
  };
  candles: CandleData[];
}

export interface MarketInsight {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number;
  change_pct: number;
  forecast_target: number;
  technical_stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'ACCUMULATION';
  summary: string;
  primary_catalyst: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  confidence_pct: number;
  key_levels: {
    support: number;
    resistance: number;
  };
  source: string;
  generated_at: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

// In-memory L1 cache
const memoryCache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string, maxAgeSec: number): { data: T | null; isStale: boolean; etag?: string } {
  // 1. Check memory cache
  let entry = memoryCache.get(key);
  if (!entry) {
    // 2. Check localStorage fallback
    try {
      const raw = localStorage.getItem(`naytra_swr_${key}`);
      if (raw) {
        entry = JSON.parse(raw);
        if (entry) memoryCache.set(key, entry);
      }
    } catch {
      // ignore
    }
  }

  if (!entry) return { data: null, isStale: true };

  const ageSec = (Date.now() - entry.timestamp) / 1000;
  const isStale = ageSec > maxAgeSec;
  return { data: entry.data, isStale, etag: entry.etag };
}

function saveToCache<T>(key: string, data: T, etag?: string) {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    etag,
  };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(`naytra_swr_${key}`, JSON.stringify(entry));
  } catch {
    // ignore quota
  }
}

/**
 * Fetches all BSE Sensex 30 tickers with SWR caching.
 */
export async function fetchMarketTickers(): Promise<MarketTicker[]> {
  const cacheKey = 'tickers_all';
  const { data, isStale, etag } = getFromCache<MarketTicker[]>(cacheKey, 30);

  // Background revalidation
  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {};
      if (etag) headers['If-None-Match'] = etag;

      const res = await fetch(`${API_BASE}/api/v1/market/tickers`, { headers });
      if (res.status === 304 && data) {
        return data;
      }
      if (res.ok) {
        const json = await res.json();
        const tickers = json.data as MarketTicker[];
        saveToCache(cacheKey, tickers, res.headers.get('etag') || undefined);
        return tickers;
      }
    } catch {
      // Network failure, use cached
    }
    return data || [];
  })();

  if (data && !isStale) {
    return data;
  }

  // If stale but present, trigger background fetch and return stale
  if (data) {
    fetchPromise.catch(() => null);
    return data;
  }

  // No cache at all, await fetch
  return await fetchPromise;
}

/**
 * Fetches Candlestick Chart series (Green/Red actuals + Purple forecasts) with SWR.
 */
export async function fetchStockChart(
  symbol: string,
  interval: string = '5m',
  includeForecast: boolean = true,
  timeline: string = '1D'
): Promise<ChartResponse | null> {
  const cacheKey = `chart_${symbol}_${interval}_${timeline}_${includeForecast}`;
  const { data, isStale, etag } = getFromCache<ChartResponse>(cacheKey, 60);

  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {};
      if (etag) headers['If-None-Match'] = etag;

      const res = await fetch(
        `${API_BASE}/api/v1/market/charts/${symbol}?interval=${interval}&timeline=${timeline}&include_forecast=${includeForecast}`,
        { headers }
      );
      if (res.status === 304 && data) {
        return data;
      }
      if (res.ok) {
        const chart = (await res.json()) as ChartResponse;
        saveToCache(cacheKey, chart, res.headers.get('etag') || undefined);
        return chart;
      }
    } catch {
      // Network failure
    }
    return data;
  })();

  if (data && !isStale) {
    return data;
  }
  if (data) {
    fetchPromise.catch(() => null);
    return data;
  }
  return await fetchPromise;
}

/**
 * Fetches Gemini LLM Market Reasoning with SWR.
 */
export async function fetchStockInsight(symbol: string): Promise<MarketInsight | null> {
  const cacheKey = `insight_${symbol}`;
  const { data, isStale } = getFromCache<MarketInsight>(cacheKey, 180);

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/market/insights/${symbol}`);
      if (res.ok) {
        const insight = (await res.json()) as MarketInsight;
        saveToCache(cacheKey, insight);
        return insight;
      }
    } catch {
      // Network failure
    }
    return data;
  })();

  if (data && !isStale) {
    return data;
  }
  if (data) {
    fetchPromise.catch(() => null);
    return data;
  }
  return await fetchPromise;
}
