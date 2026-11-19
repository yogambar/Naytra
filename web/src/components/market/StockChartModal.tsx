import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '../../design/Dialog';
import { Button } from '../../design/Button';
import { Card3D } from '../../design/Card3D';
import {
  fetchStockChart,
  fetchStockInsight,
  ChartResponse,
  CandleData,
  MarketInsight,
} from '../../services/marketService';
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFirestoreWallet, recordTransactionInLedger } from '../../services/firestoreService';

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
  const [interval, setInterval] = useState<'1m' | '5m' | '15m' | '1D'>('5m');
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
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

  useEffect(() => {
    if (!isOpen || !symbol) return;
    setLoading(true);
    setOrderSuccessMsg(null);

    // Fetch user wallet
    if (user?.uid) {
      getFirestoreWallet(user.uid).then((w) => {
        if (w) setWalletBalancePaise(w.total_cash_paise);
      });
    }

    // Load Chart & Insights in parallel
    Promise.all([
      fetchStockChart(symbol, interval, showForecast),
      fetchStockInsight(symbol),
    ]).then(([chart, ins]) => {
      setChartData(chart);
      setInsight(ins);
      setLoading(false);
    });
  }, [isOpen, symbol, interval, showForecast, user?.uid]);

  // Canvas drawing
  useEffect(() => {
    if (!canvasRef.current || !chartData || chartData.candles.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

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
    const pad = priceRange * 0.05;
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

    // Draw Candles
    const count = candles.length;
    const candleW = Math.max(3, (chartW / count) * 0.7);
    const stepX = chartW / count;

    candles.forEach((c, idx) => {
      const x = paddingLeft + idx * stepX + stepX / 2;
      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);
      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);

      // Confidence envelope
      if (c.is_forecast && c.upper_bound && c.lower_bound) {
        const yUp = priceToY(c.upper_bound);
        const yDown = priceToY(c.lower_bound);
        ctx.fillStyle = 'rgba(138, 43, 226, 0.12)';
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
        ctx.shadowBlur = 4;
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
      }

      (c as any)._x = x;
    });
  }, [chartData]);

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
    const latestPrice = chartData.candles.find((c) => !c.is_forecast)?.close || 1500;
    const totalCostPaise = Math.round(latestPrice * quantity * 100);

    if (orderSide === 'BUY' && totalCostPaise > walletBalancePaise) {
      alert('Insufficient virtual balance to execute this trade.');
      return;
    }

    setOrderSubmitting(true);
    try {
      // 1. Record in double-entry ledger in integer paise
      await recordTransactionInLedger(user.uid, {
        type: orderSide === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
        amount_paise: totalCostPaise,
        balance_after_paise:
          orderSide === 'BUY'
            ? walletBalancePaise - totalCostPaise
            : walletBalancePaise + totalCostPaise,
        description: `Virtual ${orderSide} ${quantity} ${symbol} @ ₹${latestPrice.toFixed(2)}`,
        reference_id: `ord_${Date.now()}_${symbol}`,
      });

      setWalletBalancePaise((prev) =>
        orderSide === 'BUY' ? prev - totalCostPaise : prev + totalCostPaise
      );
      setOrderSuccessMsg(
        `Successfully executed virtual ${orderSide} of ${quantity} shares of ${symbol}!`
      );
      if (onTradeSuccess) onTradeSuccess();
    } catch (err) {
      console.error('Trade error:', err);
      alert('Failed to record virtual trade.');
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
          </div>
        </div>

        {/* Chart Viewport & Interval Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg border border-surface-border bg-surface-inset p-0.5 text-xs">
              {(['1m', '5m', '15m', '1D'] as const).map((intVal) => (
                <button
                  key={intVal}
                  onClick={() => setInterval(intVal)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    interval === intVal
                      ? 'bg-brand-marigold-bg text-brand-marigold-text font-bold'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {intVal}
                </button>
              ))}
            </div>

            <label className="flex items-center text-xs text-purple-400 gap-1.5 cursor-pointer bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-800/40">
              <input
                type="checkbox"
                checked={showForecast}
                onChange={(e) => setShowForecast(e.target.checked)}
                className="rounded text-purple-600 focus:ring-0"
              />
              <span className="font-semibold">Purple Forecast Candles (#8A2BE2)</span>
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
                  {hoveredCandle.is_forecast ? 'ML Forecast' : 'Actual Candle'}
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
                <span className="w-2 h-2 rounded-sm bg-[#00C805]" /> Bullish
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#FF3B30]" /> Bearish
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#8A2BE2]" /> ML Purple Forecast
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
    </Dialog>
  );
};
