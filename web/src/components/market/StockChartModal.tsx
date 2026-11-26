import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '../../design/Dialog';
import { Button } from '../../design/Button';
import { Card3D } from '../../design/Card3D';
import {
  fetchStockChart,
  fetchStockInsight,
  fetchStockNews,
  ChartResponse,
  CandleData,
  MarketInsight,
  StockNewsArticle,
} from '../../services/marketService';
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Newspaper,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFirestoreWallet, executePaperTradeInFirestore } from '../../services/firestoreService';

function getSafeExternalUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

function getSentimentMeta(score?: number): { label: string; badgeClass: string } {
  if (typeof score === 'number' && score >= 0.2) {
    return {
      label: 'Positive',
      badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
    };
  }
  if (typeof score === 'number' && score <= -0.15) {
    return {
      label: 'Caution',
      badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-800/50',
    };
  }
  return {
    label: 'Neutral',
    badgeClass: 'bg-surface-inset text-text-tertiary border-surface-border',
  };
}

interface StockChartModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
  onTradeSuccess?: () => void;
}

export const StockChartModal: React.FC<StockChartModalProps> = ({
  symbol,
  isOpen,
  onClose,
  onTradeSuccess,
}) => {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<'1D' | '1W' | '1M' | '1Y' | '5Y'>('1D');
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [news, setNews] = useState<StockNewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState<boolean>(true);
  const [selectedArticle, setSelectedArticle] = useState<StockNewsArticle | null>(null);
  const [, setLoading] = useState<boolean>(true);
  const [showForecast, setShowForecast] = useState<boolean>(true);

  // Trade ticket state
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(1);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [walletBalancePaise, setWalletBalancePaise] = useState<number>(1000000); // Default ₹10,000

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const animPhaseRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || !symbol) return;
    let cancelled = false;
    setNewsLoading(true);
    setSelectedArticle(null);
    setOrderSuccessMsg(null);

    if (user?.uid) {
      getFirestoreWallet(user.uid).then((w) => {
        if (!cancelled && w) setWalletBalancePaise(w.total_cash_paise);
      });
    }

    Promise.all([fetchStockInsight(symbol), fetchStockNews(symbol)]).then(
      ([ins, stockNews]) => {
        if (cancelled) return;
        setInsight(ins);
        setNews(stockNews || []);
        setNewsLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isOpen, symbol, user?.uid]);

  // Fetch chart series per timeline (always request 1D forecasts so toggling visibility never scales the graph)
  useEffect(() => {
    if (!isOpen || !symbol) return;
    let cancelled = false;
    setLoading(true);
    setHoveredCandle(null);

    fetchStockChart(symbol, '5m', timeline === '1D', timeline).then((chart) => {
      if (cancelled) return;
      setChartData(chart);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, symbol, timeline]);

  // Continuous animation loop for glowing AI forecast candles
  useEffect(() => {
    if (!isOpen || !chartData) return;
    let animId: number;

    const render = () => {
      animPhaseRef.current += 0.05;
      drawCanvas();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, chartData, showForecast, timeline]);

  const drawCanvas = () => {
    if (!canvasRef.current || !chartData || chartData.candles.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const candles = chartData.candles;
    const paddingLeft = 8;
    const paddingRight = 55;
    const paddingTop = 20;
    const paddingBottom = 30;
    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.lower_bound && c.lower_bound < minPrice) minPrice = c.lower_bound;
      if (c.upper_bound && c.upper_bound > maxPrice) maxPrice = c.upper_bound;
    });

    const priceRange = maxPrice - minPrice || 1;
    const pad = priceRange * 0.08;
    const yMin = minPrice - pad;
    const yMax = maxPrice + pad;
    const totalYRange = yMax - yMin;

    const priceToY = (p: number) => paddingTop + chartH - ((p - yMin) / totalYRange) * chartH;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      const pVal = yMax - (totalYRange / 4) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(`₹${pVal.toFixed(1)}`, w - paddingRight + 6, y + 3);
    }

    // Draw Candles with Pulsing Glow Animation (keep X & Y scale locked across full 1D series)
    const shouldRenderForecast = timeline === '1D' && showForecast;
    const pulseBlur = 3 + 4 * Math.abs(Math.sin(animPhaseRef.current));
    const count = candles.length;
    const candleW = Math.max(3, (chartW / count) * 0.72);
    const stepX = chartW / count;

    candles.forEach((c, idx) => {
      if (c.is_forecast && !shouldRenderForecast) {
        (c as any)._x = null;
        return;
      }

      const x = paddingLeft + idx * stepX + stepX / 2;
      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);
      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);

      // Confidence envelope
      if (c.is_forecast && c.upper_bound && c.lower_bound) {
        const yUp = priceToY(c.upper_bound);
        const yDown = priceToY(c.lower_bound);
        ctx.fillStyle = 'rgba(138, 43, 226, 0.10)';
        ctx.fillRect(x - stepX / 2, yUp, stepX, yDown - yUp);
      }

      // Wick
      ctx.strokeStyle = c.color;
      ctx.lineWidth = c.is_forecast ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const topY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));

      ctx.fillStyle = c.color;
      if (c.is_forecast) {
        ctx.shadowColor = '#8A2BE2';
        ctx.shadowBlur = pulseBlur;
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
      }

      (c as any)._x = x;
    });
  };

  // Handle canvas mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !chartData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let found: CandleData | null = null;
    for (const c of chartData.candles) {
      const cx = (c as any)._x;
      if (cx && Math.abs(cx - mouseX) < 10) {
        found = c;
        break;
      }
    }
    setHoveredCandle(found);
  };

  // Place paper order
  const handleExecuteTrade = async () => {
    if (!user?.uid || !chartData) return;
    const actualCandles = chartData.candles.filter((c) => !c.is_forecast);
    const latestPrice = actualCandles[actualCandles.length - 1]?.close || 1500;
    const totalCostPaise = Math.round(latestPrice * quantity * 100);

    if (orderSide === 'BUY' && totalCostPaise > walletBalancePaise) {
      alert('Insufficient virtual balance to execute this trade.');
      return;
    }

    setOrderSubmitting(true);
    try {
      const result = await executePaperTradeInFirestore(user.uid, {
        symbol,
        name: insight?.company_name || symbol,
        side: orderSide,
        orderMode: 'Delivery',
        priceType: 'Market',
        quantity,
        executionPriceInr: latestPrice,
      });

      setWalletBalancePaise(result.wallet.total_cash_paise);
      setOrderSuccessMsg(
        `Successfully executed virtual ${orderSide} of ${quantity} shares of ${symbol}!`
      );
      if (onTradeSuccess) onTradeSuccess();
    } catch (err: any) {
      console.error('Trade error:', err);
      alert(err?.message || 'Failed to record virtual trade.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const latestActual = chartData?.candles.filter((c) => !c.is_forecast).slice(-1)[0];
  const currentPrice = latestActual?.close || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} title="" className="max-w-4xl">
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-inset flex items-center justify-center font-bold text-sm text-text-primary font-mono border border-surface-border">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-text-primary">{symbol}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-text-secondary">
                  {insight?.sector || 'BSE Sensex 30'}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">{insight?.company_name || 'BSE Constituent'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-2xl font-black font-mono text-text-primary">
                ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div
                className={`text-xs font-bold inline-flex items-center gap-0.5 ${
                  (insight?.change_pct || 0) >= 0 ? 'text-brand-up' : 'text-brand-down'
                }`}
              >
                {(insight?.change_pct || 0) >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {(insight?.change_pct || 0) >= 0 ? '+' : ''}
                {insight?.change_pct || 0}%
              </div>
            </div>
            {chartData?.market && (
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  chartData.market.is_open
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                    : 'bg-rose-950 text-rose-400 border-rose-800/60'
                }`}
              >
                {chartData.market.is_open ? 'MARKET OPEN' : 'MARKET CLOSED'}
              </span>
            )}
          </div>
        </div>

        {/* Chart Viewport & Timeline Selector (1D, 1W, 1M, 1Y, 5Y) */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 min-h-[34px]">
            <div
              role="group"
              aria-label="Chart timeline"
              className="inline-flex rounded-lg border border-surface-border bg-surface-inset p-0.5 text-xs"
            >
              {(['1D', '1W', '1M', '1Y', '5Y'] as const).map((tl) => (
                <button
                  key={tl}
                  type="button"
                  aria-pressed={timeline === tl}
                  onClick={() => setTimeline(tl)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    timeline === tl
                      ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-700/50'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {tl}
                </button>
              ))}
            </div>

            <label
              title="Show or hide AI intraday closing predictions (1D view only)"
              className={`flex items-center text-xs gap-1.5 px-2.5 py-1 rounded-lg border select-none transition-opacity ${
                timeline === '1D'
                  ? 'text-purple-300 cursor-pointer bg-purple-950/30 border-purple-800/40 opacity-100'
                  : 'text-text-tertiary cursor-not-allowed bg-surface-inset border-surface-border opacity-40'
              }`}
            >
              <input
                type="checkbox"
                checked={showForecast}
                disabled={timeline !== '1D'}
                onChange={(e) => {
                  setShowForecast(e.target.checked);
                  if (!e.target.checked && hoveredCandle?.is_forecast) {
                    setHoveredCandle(null);
                  }
                }}
                className="rounded text-purple-600 focus:ring-0 disabled:cursor-not-allowed"
              />
              <span className="w-2 h-2 rounded-full bg-[#8A2BE2] shrink-0" aria-hidden="true" />
              <span className="font-semibold">AI Price Forecast</span>
            </label>
          </div>

          {/* Canvas Box */}
          <div className="relative h-64 sm:h-72 w-full bg-gray-950/60 rounded-xl border border-surface-border p-2 overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredCandle(null)}
              className="w-full h-full block cursor-crosshair"
            />

            {/* Hover Tooltip Overlay */}
            {hoveredCandle && (
              <div className="absolute top-3 left-3 bg-gray-900/90 border border-surface-border p-2 rounded-lg text-[11px] font-mono shadow-lg backdrop-blur pointer-events-none">
                <div className="flex items-center gap-1.5 mb-1 text-xs font-sans font-bold">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: hoveredCandle.color }}
                  />
                  {hoveredCandle.is_forecast ? 'AI Forecast' : 'Actual Candle'}
                </div>
                <div>O: ₹{hoveredCandle.open} | H: ₹{hoveredCandle.high}</div>
                <div>L: ₹{hoveredCandle.low} | C: ₹{hoveredCandle.close}</div>
                {hoveredCandle.confidence && (
                  <div className="text-purple-400 font-sans mt-0.5">
                    Confidence: {Math.round(hoveredCandle.confidence * 100)}%
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#00C805]" aria-hidden="true" /> Bullish
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#FF3B30]" aria-hidden="true" /> Bearish
              </span>
              <span
                className={`flex items-center gap-1 transition-opacity ${
                  timeline === '1D' && showForecast ? 'opacity-100' : 'opacity-35'
                }`}
              >
                <span className="w-2 h-2 rounded-sm bg-[#8A2BE2]" aria-hidden="true" /> AI Intraday Forecast
              </span>
            </div>
            <span>Replaced in real-time as actual ticks arrive</span>
          </div>
        </div>

        {/* Gemini Market Reasoning Card */}
        {insight && (
          <Card3D elevation="e2" className="p-4 space-y-3 bg-purple-950/20 border-purple-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Gemini Market Reasoning
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/60 text-purple-200 border border-purple-700/50">
                {insight.technical_stance} • {insight.confidence_pct}% CONFIDENCE
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">{insight.summary}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-800/30 text-xs">
              <div>
                <span className="text-[10px] text-text-tertiary block">Primary Catalyst</span>
                <span className="font-semibold text-text-primary text-[11px]">
                  {insight.primary_catalyst}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-tertiary block">ML Forecast Target</span>
                <span className="font-bold font-mono text-purple-400">
                  ₹{insight.forecast_target.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-tertiary block">Support / Resistance</span>
                <span className="font-mono text-text-secondary">
                  ₹{insight.key_levels.support} / ₹{insight.key_levels.resistance}
                </span>
              </div>
            </div>
          </Card3D>
        )}

        {/* Stock-Specific Financial News Feed */}
        <section aria-labelledby="stock-news-heading" className="bg-surface-inset p-4 rounded-xl border border-surface-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <h3
                id="stock-news-heading"
                className="text-xs font-bold uppercase tracking-wider text-text-primary"
              >
                {symbol} Market News
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50 font-semibold">
                Today
              </span>
            </div>
            <span className="text-[11px] font-mono text-text-tertiary">
              {news.length} {news.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {newsLoading && news.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">
              Loading latest coverage for {symbol}...
            </p>
          ) : news.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">
              No recent articles available for {symbol} today.
            </p>
          ) : (
            <div className="space-y-2.5">
              {news.map((item) => {
                const safeUrl = getSafeExternalUrl(item.url);
                const sentiment = getSentimentMeta(item.sentiment_score);
                const publishedTime = item.published_at
                  ? new Date(item.published_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <article
                    key={item.uuid}
                    className="rounded-xl bg-surface-raised border border-surface-border p-3 space-y-1.5 hover:border-purple-500/40 transition-colors"
                  >
                    <header className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-400">{item.source}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${sentiment.badgeClass}`}
                        >
                          {sentiment.label}
                        </span>
                      </div>
                      {publishedTime && (
                        <time dateTime={item.published_at} className="font-mono text-text-tertiary">
                          {publishedTime} IST
                        </time>
                      )}
                    </header>

                    <h4 className="text-xs font-bold text-text-primary leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
                      {item.summary || item.description}
                    </p>

                    <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedArticle(item)}
                        className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        Quick Summary →
                      </button>

                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <span>Read on {item.source}</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Paper Trade Execution Ticket */}
        <div className="bg-surface-inset p-4 rounded-xl border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Simulated Paper Order Ticket
            </span>
            <span className="text-xs text-text-secondary">
              Virtual Cash: <strong className="font-mono text-text-primary">₹{(walletBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>

          {orderSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{orderSuccessMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="inline-flex rounded-lg border border-surface-border bg-surface-raised p-0.5 text-xs w-full sm:w-auto">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md font-bold transition-colors ${
                  orderSide === 'BUY'
                    ? 'bg-brand-up text-white'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md font-bold transition-colors ${
                  orderSide === 'SELL'
                    ? 'bg-brand-down text-white'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                SELL
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-text-tertiary">Qty:</span>
              <input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1.5 bg-surface-raised border border-surface-border rounded-lg text-xs font-mono font-bold text-text-primary text-center focus:outline-none focus:border-brand-marigold"
              />
            </div>

            <div className="flex-1 text-right text-xs">
              <span className="text-text-tertiary">Est. Order Value: </span>
              <span className="font-bold font-mono text-text-primary">
                ₹{((currentPrice * quantity) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <Button
              variant={orderSide === 'BUY' ? 'primary' : 'danger'}
              size="sm"
              loading={orderSubmitting}
              onClick={handleExecuteTrade}
              className="w-full sm:w-auto"
            >
              Execute Paper {orderSide}
            </Button>
          </div>
        </div>
      </div>

      {/* Article Detail Summary Modal */}
      {selectedArticle && (
        <Dialog
          open={!!selectedArticle}
          onOpenChange={(open) => !open && setSelectedArticle(null)}
          title={selectedArticle.title}
          description={`${selectedArticle.source}${
            selectedArticle.published_at
              ? ` • ${new Date(selectedArticle.published_at).toLocaleString('en-IN')}`
              : ''
          }`}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface-inset border border-surface-border space-y-2">
              <p className="text-xs text-text-primary leading-relaxed">
                {selectedArticle.summary}
              </p>
              {selectedArticle.description &&
                selectedArticle.description !== selectedArticle.summary && (
                  <p className="text-xs text-text-secondary leading-relaxed pt-2 border-t border-surface-border">
                    {selectedArticle.description}
                  </p>
                )}
            </div>

            {selectedArticle.entities && selectedArticle.entities.length > 0 && (
              <ul aria-label="Related entities" className="flex flex-wrap gap-1.5">
                {selectedArticle.entities.map((entity) => (
                  <li
                    key={entity}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/50 text-purple-300 border border-purple-800/40"
                  >
                    {entity}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-surface-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedArticle(null)}
              >
                Close
              </Button>
              {(() => {
                const safeUrl = getSafeExternalUrl(selectedArticle.url);
                return safeUrl ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-900/60 text-purple-200 border border-purple-700/50 hover:bg-purple-800/70 transition-colors"
                  >
                    <span>Visit Original Source</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                ) : null;
              })()}
            </div>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
};
