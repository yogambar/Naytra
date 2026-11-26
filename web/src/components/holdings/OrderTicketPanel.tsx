import React, { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  BarChart2,
  Wallet,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  MousePointerClick,
} from 'lucide-react';
import { Card3D } from '../../design/Card3D';
import { Button } from '../../design/Button';
import type { MarketTicker } from '../../services/marketService';
import type { HoldingPositionDoc } from '../../services/firestoreService';

export interface OrderTicketPanelProps {
  selectedTicker: MarketTicker | null;
  preferredOrderMode?: 'Delivery' | 'Intraday';
  availableCashPaise: number;
  holdings: HoldingPositionDoc[];
  onClearSelection: () => void;
  onOpenChart: (symbol: string) => void;
  onExecuteOrder: (payload: {
    symbol: string;
    name: string;
    side: 'BUY' | 'SELL';
    orderMode: 'Delivery' | 'Intraday';
    priceType: 'Market' | 'Limit';
    quantity: number;
    executionPriceInr: number;
  }) => Promise<void>;
}

const QUICK_QTY_PRESETS = [1, 5, 10, 25];

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const OrderTicketPanel: React.FC<OrderTicketPanelProps> = ({
  selectedTicker,
  preferredOrderMode,
  availableCashPaise,
  holdings,
  onClearSelection,
  onOpenChart,
  onExecuteOrder,
}) => {
  const qtyId = useId();
  const priceTypeId = useId();
  const limitPriceId = useId();
  const errorId = useId();

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderMode, setOrderMode] = useState<'Delivery' | 'Intraday'>('Delivery');
  const [priceType, setPriceType] = useState<'Market' | 'Limit'>('Market');
  const [qtyText, setQtyText] = useState<string>('1');
  const [limitPriceText, setLimitPriceText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    setStatusMsg(null);
    if (selectedTicker) {
      setLimitPriceText(selectedTicker.price.toFixed(2));
      if (preferredOrderMode) {
        setOrderMode(preferredOrderMode);
      }
      const held = holdings.find(
        (h) => h.symbol.toUpperCase() === selectedTicker.symbol.toUpperCase()
      );
      if (!held && side === 'SELL') {
        setSide('BUY');
      }
      setQtyText('1');
    }
  }, [selectedTicker?.symbol, preferredOrderMode]);

  const cashInr = availableCashPaise / 100;

  // ── Empty State (matches Groww "Select a stock to get started") ─────────────
  if (!selectedTicker) {
    return (
      <Card3D
        elevation="e2"
        interactive={false}
        className="overflow-hidden border border-surface-border bg-surface-raised"
      >
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-28 space-y-2.5" aria-hidden="true">
            <div className="h-2.5 rounded-full bg-surface-inset border border-surface-border" />
            <div className="h-5 rounded-md bg-brand-up/15 border border-brand-up/30 relative flex items-center justify-end pr-2">
              <MousePointerClick className="w-5 h-5 text-text-primary translate-x-2 translate-y-2" />
            </div>
            <div className="h-2.5 rounded-full bg-surface-inset border border-surface-border w-3/4 mx-auto" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-bold text-text-primary">Select a stock to get started</h2>
            <p className="text-xs text-text-tertiary max-w-[220px]">
              Choose any holding from the table to buy or sell.
            </p>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-surface-border bg-surface-inset/50 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-2 text-text-secondary font-medium">
            <Wallet className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
            <span>
              Balance:{' '}
              <strong className="font-mono font-bold text-text-primary">
                {formatINR(cashInr)}
              </strong>
            </span>
          </span>
          <Link
            to="/wallet"
            className="font-bold text-text-primary underline underline-offset-4 hover:text-brand-marigold-text transition-colors"
          >
            Manage funds
          </Link>
        </div>
      </Card3D>
    );
  }

  // ── Selected Stock Order Form ────────────────────────────────────────────────
  const matchingHolding = holdings.find(
    (h) =>
      h.symbol.toUpperCase() === selectedTicker.symbol.toUpperCase() &&
      (h.order_mode || 'Delivery') === orderMode
  );
  const availableShares = matchingHolding?.quantity || 0;

  const parsedQty = Math.floor(Number(qtyText));
  const validQty = Number.isFinite(parsedQty) && parsedQty >= 1 ? parsedQty : 0;
  const parsedLimit = Number(limitPriceText);
  const effectivePriceInr =
    priceType === 'Limit' && Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : selectedTicker.price;

  const estimatedTotalInr = validQty * effectivePriceInr;
  const estimatedTotalPaise = Math.round(estimatedTotalInr * 100);
  const isUp = (selectedTicker.change_pct ?? 0) >= 0;

  const handleValidate = (): string | null => {
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      return 'Enter at least 1 share.';
    }
    if (priceType === 'Limit' && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
      return 'Enter a valid limit price above ₹0.';
    }
    if (side === 'BUY' && estimatedTotalPaise > availableCashPaise) {
      return `Insufficient balance. Needed ${formatINR(estimatedTotalInr)}.`;
    }
    if (side === 'SELL' && parsedQty > availableShares) {
      return `You only hold ${availableShares} ${orderMode.toLowerCase()} shares of ${selectedTicker.symbol}.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const err = handleValidate();
    if (err) {
      setFormError(err);
      document.getElementById(qtyId)?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onExecuteOrder({
        symbol: selectedTicker.symbol,
        name: selectedTicker.name,
        side,
        orderMode,
        priceType,
        quantity: parsedQty,
        executionPriceInr: effectivePriceInr,
      });
      setStatusMsg(
        `Executed ${side} ${parsedQty} ${selectedTicker.symbol} @ ${formatINR(effectivePriceInr)}`
      );
      setQtyText('1');
    } catch (submitErr: any) {
      setFormError(submitErr?.message || 'Unable to execute order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card3D
      elevation="e2"
      interactive={false}
      className="overflow-hidden border border-surface-border bg-surface-raised"
    >
      {/* Stock Header */}
      <div className="px-5 pt-4 pb-3 border-b border-surface-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary truncate">
              {selectedTicker.name}
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-inset text-text-tertiary border border-surface-border shrink-0">
              {selectedTicker.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="font-mono text-text-secondary">
              BSE {formatINR(selectedTicker.price)}
            </span>
            <span
              className={`font-mono font-semibold ${
                isUp ? 'text-brand-up' : 'text-brand-down'
              }`}
            >
              ({isUp ? '+' : ''}
              {selectedTicker.change_pct}%)
            </span>
            <button
              type="button"
              onClick={() => onOpenChart(selectedTicker.symbol)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2 cursor-pointer"
            >
              <BarChart2 className="w-3 h-3" aria-hidden="true" />
              Chart
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Close order panel"
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-inset transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* BUY / SELL Segmented Tabs */}
      <div
        role="tablist"
        aria-label="Order side"
        className="grid grid-cols-2 border-b border-surface-border px-5 gap-6"
      >
        <button
          type="button"
          role="tab"
          aria-selected={side === 'BUY'}
          onClick={() => {
            setSide('BUY');
            setFormError(null);
            setStatusMsg(null);
          }}
          className={`py-3 text-xs font-extrabold tracking-wide border-b-2 transition-colors ${
            side === 'BUY'
              ? 'border-brand-up text-brand-up'
              : 'border-transparent text-text-tertiary hover:text-text-primary'
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={side === 'SELL'}
          onClick={() => {
            setSide('SELL');
            setFormError(null);
            setStatusMsg(null);
          }}
          className={`py-3 text-xs font-extrabold tracking-wide border-b-2 transition-colors ${
            side === 'SELL'
              ? 'border-brand-down text-brand-down'
              : 'border-transparent text-text-tertiary hover:text-text-primary'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
        {/* Order Mode Fieldset + Quick Qty Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Order mode</legend>
            {(['Delivery', 'Intraday'] as const).map((mode) => {
              const checked = orderMode === mode;
              return (
                <label
                  key={mode}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
                    checked
                      ? 'border-text-primary bg-surface-inset text-text-primary'
                      : 'border-surface-border text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  <input
                    type="radio"
                    name="orderMode"
                    value={mode}
                    checked={checked}
                    onChange={() => {
                      setOrderMode(mode);
                      setFormError(null);
                    }}
                    className="sr-only"
                  />
                  {mode}
                </label>
              );
            })}
          </fieldset>

          {/* Quick Qty Preset Strip (Groww dark popover style adapted) */}
          <div className="inline-flex items-center rounded-lg bg-surface-inset border border-surface-border px-1.5 py-1 gap-1">
            {QUICK_QTY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setQtyText(String(preset));
                  setFormError(null);
                }}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  validQty === preset
                    ? 'bg-surface-raised text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Qty Row */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={qtyId} className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <span>Qty</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-inset text-text-tertiary border border-surface-border">
                BSE
              </span>
            </label>
            <input
              id={qtyId}
              name="quantity"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              required
              aria-invalid={!!formError}
              aria-describedby={formError ? errorId : undefined}
              value={qtyText}
              onChange={(e) => {
                setQtyText(e.target.value);
                if (formError) setFormError(null);
              }}
              className="w-32 px-3 py-2 text-right font-mono font-bold text-sm rounded-lg bg-surface-inset border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-marigold/60"
            />
          </div>

          <div className="min-h-[18px] flex justify-end">
            {side === 'SELL' && (
              <button
                type="button"
                onClick={() => {
                  if (availableShares > 0) {
                    setQtyText(String(availableShares));
                    setFormError(null);
                  }
                }}
                className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors"
              >
                Qty available <strong className="font-mono text-text-primary">{availableShares}</strong>
              </button>
            )}
          </div>
        </div>

        {/* Price Type Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor={priceTypeId} className="text-xs font-semibold text-text-secondary">
              Price
            </label>
            <select
              id={priceTypeId}
              name="priceType"
              value={priceType}
              onChange={(e) => {
                setPriceType(e.target.value as 'Market' | 'Limit');
                setFormError(null);
              }}
              className="text-xs font-bold bg-surface-inset border border-surface-border rounded-md px-2 py-1 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-marigold/60"
            >
              <option value="Market">Market</option>
              <option value="Limit">Limit</option>
            </select>
          </div>

          {priceType === 'Market' ? (
            <div className="w-32 h-[38px] px-3 rounded-lg bg-surface-inset/70 border border-surface-border text-xs font-semibold text-text-tertiary flex items-center justify-center select-none">
              At market
            </div>
          ) : (
            <input
              id={limitPriceId}
              name="limitPrice"
              aria-label="Limit price in INR"
              type="number"
              min={0.05}
              step={0.05}
              inputMode="decimal"
              value={limitPriceText}
              onChange={(e) => {
                setLimitPriceText(e.target.value);
                if (formError) setFormError(null);
              }}
              className="w-32 h-[38px] px-3 text-right font-mono font-bold text-sm rounded-lg bg-surface-inset border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-marigold/60"
            />
          )}
        </div>

        {/* Notice Banner */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-[11px] text-amber-200">
          <span className="text-text-secondary">
            {priceType} order executes against live BSE price marks.
          </span>
          <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
        </div>

        {/* Validation / Execution Messages */}
        {formError && (
          <div
            id={errorId}
            role="alert"
            className="p-2.5 rounded-lg bg-brand-down-bg border border-brand-down/30 text-xs text-brand-down flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {statusMsg && (
          <div
            role="status"
            aria-live="polite"
            className="p-2.5 rounded-lg bg-brand-up-bg border border-brand-up/30 text-xs text-brand-up flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Balance & Estimate Footer + Primary CTA */}
        <div className="pt-2 border-t border-surface-border space-y-3">
          <div className="flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
            <span className="truncate">
              Balance:{' '}
              <strong className="font-mono text-text-primary">{formatINR(cashInr)}</strong>
            </span>
            <span className="shrink-0">
              {side === 'BUY' ? 'Approx req.: ' : 'Sell value: '}
              <strong className="font-mono text-text-primary underline decoration-dotted underline-offset-4">
                {formatINR(estimatedTotalInr)}
              </strong>
            </span>
          </div>

          <Button
            type="submit"
            variant={side === 'BUY' ? 'primary' : 'danger'}
            size="md"
            loading={submitting}
            className={`w-full font-extrabold text-sm ${
              side === 'BUY' ? '!bg-brand-up hover:opacity-95 !text-white' : '!bg-brand-down hover:opacity-95 !text-white'
            }`}
          >
            {side === 'BUY' ? 'Buy' : 'Sell'}
          </Button>
        </div>
      </form>
    </Card3D>
  );
};
