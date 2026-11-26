import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { Link } from 'react-router-dom';
import { Card3D } from '../design/Card3D';
import { Button } from '../design/Button';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Banknote,
  TrendingUp,
} from 'lucide-react';
import { useSyncedWallet } from '../context/WalletContext';
import { fetchMarketTickers, type MarketTicker } from '../services/marketService';
import { hapticTick, hapticSuccess, hapticError } from '../utils/haptics';

/* ── Constants ────────────────────────────────────────────────────────────── */

const DEPOSIT_PRESETS = [100, 500, 1000, 5000];
const WITHDRAW_PRESETS = [100, 500];
type TxFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRADES' | 'SIGNUP_BONUS';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
}

/* ── Component ────────────────────────────────────────────────────────────── */

export const WalletPage: React.FC = () => {
  const {
    wallet,
    ledger,
    portfolio,
    isSyncing,
    lastSyncedAt,
    refreshFinancials,
    depositFunds,
    withdrawFunds,
  } = useSyncedWallet();

  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [activeFundTab, setActiveFundTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [txFilter, setTxFilter] = useState<TxFilter>('ALL');

  // Direct INR amount inputs (1:1 real money)
  const [depositAmountText, setDepositAmountText] = useState<string>('100');
  const [depositTouched, setDepositTouched] = useState<boolean>(false);

  const [withdrawAmountText, setWithdrawAmountText] = useState<string>('100');
  const [withdrawTouched, setWithdrawTouched] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const depositInputRef = useRef<HTMLInputElement | null>(null);
  const withdrawInputRef = useRef<HTMLInputElement | null>(null);

  const depositInputId = useId();
  const withdrawInputId = useId();
  const formErrorId = useId();

  useEffect(() => {
    let cancelled = false;
    fetchMarketTickers()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setTickers(data);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive synced wallet & portfolio metrics
  const cashInr = wallet.balance_paise / 100;
  const lockedInr = wallet.locked_paise / 100;
  const realizedGainsInr = (portfolio.realized_pnl_paise || 0) / 100;

  const tickerMap = new Map(tickers.map((t) => [t.symbol.toUpperCase(), t.price]));
  const holdingsValueInr = (portfolio.holdings || []).reduce((sum, h) => {
    const livePrice = tickerMap.get(h.symbol.toUpperCase()) ?? h.avg_price_paise / 100;
    return sum + livePrice * h.quantity;
  }, 0);

  const totalNetWorthInr = cashInr + lockedInr + holdingsValueInr;

  const parsedDeposit = Number(depositAmountText) || 0;
  const parsedWithdraw = Number(withdrawAmountText) || 0;

  const handleDepositChange = (val: string) => {
    setDepositAmountText(sanitizeAmountInput(val));
    if (depositTouched) setDepositTouched(false);
    if (formError) setFormError(null);
    if (statusMessage) setStatusMessage(null);
  };

  const handleWithdrawChange = (val: string) => {
    setWithdrawAmountText(sanitizeAmountInput(val));
    if (withdrawTouched) setWithdrawTouched(false);
    if (formError) setFormError(null);
    if (statusMessage) setStatusMessage(null);
  };

  const handleDepositPreset = (delta: number) => {
    hapticTick();
    const current = Number(depositAmountText) || 0;
    setDepositAmountText(String(current + delta));
    setDepositTouched(true);
    setFormError(null);
    setStatusMessage(null);
  };

  const handleWithdrawPreset = (delta: number | 'MAX') => {
    hapticTick();
    if (delta === 'MAX') {
      setWithdrawAmountText(String(Number(cashInr.toFixed(2))));
    } else {
      const current = Number(withdrawAmountText) || 0;
      const next = Math.min(cashInr, current + delta);
      setWithdrawAmountText(String(Number(next.toFixed(2))));
    }
    setWithdrawTouched(true);
    setFormError(null);
    setStatusMessage(null);
  };

  const validateDeposit = useCallback((amt: number): string | null => {
    if (!Number.isFinite(amt) || amt < 1) {
      return 'Minimum amount is ₹1.00.';
    }
    if (amt > 10_000_000) {
      return 'Maximum single deposit is ₹1,00,00,000.';
    }
    return null;
  }, []);

  const validateWithdraw = useCallback(
    (amt: number): string | null => {
      if (!Number.isFinite(amt) || amt < 1) {
        return 'Minimum withdrawal is ₹1.00.';
      }
      if (Math.round(amt * 100) > wallet.balance_paise) {
        return `Insufficient balance. Available: ${formatINR(cashInr)}.`;
      }
      return null;
    },
    [wallet.balance_paise, cashInr]
  );

  const inlineDepositError = depositTouched ? validateDeposit(parsedDeposit) : null;
  const inlineWithdrawError = withdrawTouched ? validateWithdraw(parsedWithdraw) : null;
  const activeError =
    formError || (activeFundTab === 'deposit' ? inlineDepositError : inlineWithdrawError);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositTouched(true);
    setStatusMessage(null);

    const err = validateDeposit(parsedDeposit);
    if (err) {
      setFormError(err);
      hapticError();
      depositInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await depositFunds(parsedDeposit);
      hapticSuccess();
      setStatusMessage(`Added ${formatINR(parsedDeposit)} to your wallet.`);
      setDepositAmountText('100');
      setDepositTouched(false);
    } catch (submitErr: any) {
      hapticError();
      setFormError(submitErr?.message || 'Unable to add funds.');
      depositInputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawTouched(true);
    setStatusMessage(null);

    const err = validateWithdraw(parsedWithdraw);
    if (err) {
      setFormError(err);
      hapticError();
      withdrawInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await withdrawFunds(parsedWithdraw);
      hapticSuccess();
      setStatusMessage(`Withdrew ${formatINR(parsedWithdraw)} from your wallet.`);
      setWithdrawAmountText('100');
      setWithdrawTouched(false);
    } catch (submitErr: any) {
      hapticError();
      setFormError(submitErr?.message || 'Unable to process withdrawal.');
      withdrawInputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    hapticTick();
    await refreshFinancials();
    hapticSuccess();
  };

  const filteredLedger = ledger.filter((tx) => {
    if (txFilter === 'ALL') return true;
    if (txFilter === 'TRADES') return tx.type === 'TRADE_BUY' || tx.type === 'TRADE_SELL';
    return tx.type === txFilter;
  });

  return (
    <div className="w-full space-y-6 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Wallet & Ledger
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Double-entry ledger in integer paise
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] font-mono text-brand-up bg-brand-up-bg px-2.5 py-1 rounded-full border border-brand-up/25 hidden sm:inline-flex items-center gap-1.5"
            title={lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Synced'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-up" aria-hidden="true" />
            Synced
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSyncing}
            onClick={handleRefresh}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* ── Two-Column Groww Layout: 60:40 Balance Card (Left) + Add Money / Withdraw (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,6fr)_minmax(300px,4fr)] gap-6 items-stretch">
        {/* ━━ LEFT: Balance Card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Card3D
          data-testid="wallet-balance-card"
          elevation="e2"
          interactive={false}
          className="h-full overflow-hidden border border-surface-border flex flex-col justify-between"
        >
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary block">
              Available Balance
            </span>
            <div
              data-testid="wallet-available-balance"
              title={`${wallet.balance_paise.toLocaleString('en-IN')} paise`}
              className="text-3xl sm:text-4xl font-extrabold font-mono text-text-primary tabular-nums"
            >
              {formatINR(cashInr)}
            </div>
          </div>

          <div className="border-t border-surface-border divide-y divide-surface-border text-sm">
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-text-secondary">Cash</span>
              <span className="font-mono font-bold text-text-primary">{formatINR(cashInr)}</span>
            </div>

            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-text-secondary">Holdings</span>
                <Link
                  to="/holdings"
                  className="ml-2 text-[11px] font-semibold text-brand-marigold-text hover:underline"
                >
                  View →
                </Link>
              </div>
              <span className="font-mono font-bold text-text-primary">
                {formatINR(holdingsValueInr)}
              </span>
            </div>

            <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-inset/30">
              <div title="Funds reserved for pending orders or withdrawals (₹0 when orders execute immediately)">
                <span className="text-[11px] text-text-tertiary uppercase block">Locked</span>
                <span className="text-sm font-bold font-mono text-text-primary">
                  {formatINR(lockedInr)}
                </span>
              </div>
              <div
                className="sm:text-center"
                title="Booked profit or loss realized after selling stock positions"
              >
                <span className="text-[11px] text-text-tertiary uppercase block">Realized Gains</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    realizedGainsInr >= 0 ? 'text-brand-up' : 'text-brand-down'
                  }`}
                >
                  {realizedGainsInr >= 0 ? '+' : ''}
                  {formatINR(realizedGainsInr)}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] text-text-tertiary uppercase block">Total Net Worth</span>
                <span className="text-sm font-extrabold font-mono text-text-primary">
                  {formatINR(totalNetWorthInr)}
                </span>
              </div>
            </div>
          </div>
        </Card3D>

        {/* ━━ RIGHT: Minimal Groww Add Money / Withdraw Card ━━━━━━━━━━━━━━━ */}
        <div className="h-full">
        <Card3D
          data-testid="wallet-action-card"
          elevation="e2"
          interactive={false}
          className="h-full overflow-hidden border border-surface-border bg-surface-raised flex flex-col"
        >
          <RadixTabs.Root
            className="h-full flex flex-col"
            value={activeFundTab}
            onValueChange={(v) => {
              setActiveFundTab(v as 'deposit' | 'withdraw');
              setFormError(null);
              setStatusMessage(null);
            }}
          >
            <RadixTabs.List
              aria-label="Wallet actions"
              className="grid grid-cols-2 border-b border-surface-border"
            >
              <RadixTabs.Trigger
                value="deposit"
                className="relative min-h-[48px] px-4 py-3 text-xs font-extrabold tracking-wide text-text-tertiary hover:text-text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-up aria-selected:text-brand-up aria-selected:after:content-[''] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:border-b-[3px] aria-selected:after:border-brand-up"
              >
                Add money
              </RadixTabs.Trigger>
              <RadixTabs.Trigger
                value="withdraw"
                className="relative min-h-[48px] px-4 py-3 text-xs font-extrabold tracking-wide text-text-tertiary hover:text-text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-down aria-selected:text-brand-down aria-selected:after:content-[''] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:border-b-[3px] aria-selected:after:border-brand-down"
              >
                Withdraw
              </RadixTabs.Trigger>
            </RadixTabs.List>

            {/* ── TAB 1: ADD MONEY ─────────────────────────────────────────── */}
            <RadixTabs.Content
              value="deposit"
              className="flex-1 flex flex-col focus:outline-none data-[state=inactive]:hidden"
            >
              <form
                onSubmit={handleDepositSubmit}
                noValidate
                className="p-5 flex-1 flex flex-col justify-between gap-5"
              >
                <div className="text-center space-y-2 pt-1">
                  <label
                    htmlFor={depositInputId}
                    className="block text-xs font-semibold text-text-tertiary"
                  >
                    Amount
                  </label>

                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-3xl font-extrabold text-text-primary font-mono" aria-hidden="true">
                      ₹
                    </span>
                    <input
                      ref={depositInputRef}
                      id={depositInputId}
                      name="depositAmount"
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      required
                      aria-invalid={activeError && activeFundTab === 'deposit' ? 'true' : 'false'}
                      aria-describedby={
                        activeError && activeFundTab === 'deposit' ? formErrorId : undefined
                      }
                      value={depositAmountText}
                      onChange={(e) => handleDepositChange(e.target.value)}
                      onBlur={() => setDepositTouched(true)}
                      className="w-40 min-h-[48px] text-center text-3xl sm:text-4xl font-extrabold font-mono text-text-primary bg-surface-inset/50 rounded-xl border border-surface-border px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-up aria-[invalid=true]:border-brand-down"
                    />
                  </div>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {DEPOSIT_PRESETS.map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => handleDepositPreset(delta)}
                      className="min-h-[34px] px-2.5 py-1 rounded-full text-xs font-bold bg-surface-inset text-text-primary border border-surface-border hover:border-brand-up/50 transition-colors cursor-pointer"
                    >
                      +₹{delta.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-text-tertiary pt-1 border-t border-surface-border">
                  <span>Balance</span>
                  <strong className="font-mono text-text-primary">{formatINR(cashInr)}</strong>
                </div>

                {activeError && activeFundTab === 'deposit' && (
                  <div
                    id={formErrorId}
                    role="alert"
                    className="p-2.5 rounded-lg bg-brand-down-bg border border-brand-down/30 text-xs text-brand-down flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{activeError}</span>
                  </div>
                )}

                <div role="status" aria-live="polite" className={statusMessage ? '' : 'sr-only'}>
                  {statusMessage && (
                    <div className="p-2.5 rounded-lg bg-brand-up-bg border border-brand-up/30 text-xs text-brand-up flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{statusMessage}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  className="w-full min-h-[48px] font-extrabold text-sm !bg-brand-up hover:opacity-95 !text-white"
                >
                  BUY
                </Button>
              </form>
            </RadixTabs.Content>

            {/* ── TAB 2: WITHDRAW ──────────────────────────────────────────── */}
            <RadixTabs.Content
              value="withdraw"
              className="flex-1 flex flex-col focus:outline-none data-[state=inactive]:hidden"
            >
              <form
                onSubmit={handleWithdrawSubmit}
                noValidate
                className="p-5 flex-1 flex flex-col justify-between gap-5"
              >
                <div className="text-center space-y-2 pt-1">
                  <label
                    htmlFor={withdrawInputId}
                    className="block text-xs font-semibold text-text-tertiary"
                  >
                    Amount
                  </label>

                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-3xl font-extrabold text-text-primary font-mono" aria-hidden="true">
                      ₹
                    </span>
                    <input
                      ref={withdrawInputRef}
                      id={withdrawInputId}
                      name="withdrawAmount"
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      required
                      aria-invalid={activeError && activeFundTab === 'withdraw' ? 'true' : 'false'}
                      aria-describedby={
                        activeError && activeFundTab === 'withdraw' ? formErrorId : undefined
                      }
                      value={withdrawAmountText}
                      onChange={(e) => handleWithdrawChange(e.target.value)}
                      onBlur={() => setWithdrawTouched(true)}
                      className="w-40 min-h-[48px] text-center text-3xl sm:text-4xl font-extrabold font-mono text-text-primary bg-surface-inset/50 rounded-xl border border-surface-border px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-down aria-[invalid=true]:border-brand-down"
                    />
                  </div>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {WITHDRAW_PRESETS.map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => handleWithdrawPreset(delta)}
                      className="min-h-[36px] px-3.5 py-1 rounded-full text-xs font-bold bg-surface-inset text-text-primary border border-surface-border hover:border-brand-down/50 transition-colors cursor-pointer"
                    >
                      +₹{delta.toLocaleString('en-IN')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleWithdrawPreset('MAX')}
                    className="min-h-[36px] px-3.5 py-1 rounded-full text-xs font-bold bg-surface-inset text-text-primary border border-surface-border hover:border-brand-down/50 transition-colors cursor-pointer"
                  >
                    Max
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-text-tertiary pt-1 border-t border-surface-border">
                  <span>Available</span>
                  <strong className="font-mono text-text-primary">{formatINR(cashInr)}</strong>
                </div>

                {activeError && activeFundTab === 'withdraw' && (
                  <div
                    id={formErrorId}
                    role="alert"
                    className="p-2.5 rounded-lg bg-brand-down-bg border border-brand-down/30 text-xs text-brand-down flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{activeError}</span>
                  </div>
                )}

                <div role="status" aria-live="polite" className={statusMessage ? '' : 'sr-only'}>
                  {statusMessage && (
                    <div className="p-2.5 rounded-lg bg-brand-up-bg border border-brand-up/30 text-xs text-brand-up flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{statusMessage}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  loading={submitting}
                  className="w-full min-h-[48px] font-extrabold text-sm !bg-brand-down hover:opacity-95 !text-white"
                >
                  Withdraw
                </Button>
              </form>
            </RadixTabs.Content>
          </RadixTabs.Root>
        </Card3D>
        </div>
      </div>

      {/* ── Below: All Transactions ───────────────────────────────────────── */}
      <section aria-labelledby="all-transactions-heading" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 id="all-transactions-heading" className="text-base font-bold text-text-primary">
              All Transactions
            </h2>
            <span className="text-xs text-text-tertiary font-mono">
              {filteredLedger.length} {filteredLedger.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter transactions">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'DEPOSIT', label: 'Deposits' },
                { id: 'WITHDRAWAL', label: 'Withdrawals' },
                { id: 'TRADES', label: 'Trades' },
                { id: 'SIGNUP_BONUS', label: 'Bonus' },
              ] as const
            ).map((item) => {
              const active = txFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTxFilter(item.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-surface-raised text-text-primary border-text-primary shadow-sm'
                      : 'bg-surface-inset/50 text-text-tertiary border-surface-border hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <Card3D elevation="e1" className="p-10 text-center border border-surface-border">
            <Banknote className="w-8 h-8 text-text-tertiary mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-text-secondary">No transactions yet</p>
          </Card3D>
        ) : (
          <ul className="space-y-2">
            {filteredLedger.map((tx) => {
              const isCredit = Boolean(tx.is_credit);
              const amountInr = tx.amount_inr ?? tx.amount_paise / 100;
              const balAfterInr = tx.balance_after_inr ?? tx.balance_after_paise / 100;

              let TypeIcon = isCredit ? ArrowDownLeft : ArrowUpRight;
              let iconBg = isCredit
                ? 'bg-brand-up-bg text-brand-up'
                : 'bg-brand-down-bg text-brand-down';

              if (tx.type === 'DEPOSIT') {
                TypeIcon = Wallet;
                iconBg = 'bg-brand-up-bg text-brand-up';
              } else if (tx.type === 'TRADE_BUY' || tx.type === 'TRADE_SELL') {
                TypeIcon = TrendingUp;
              }

              return (
                <li key={tx.id}>
                  <Card3D
                    elevation="e1"
                    className="p-4 flex items-center justify-between hover:border-brand-marigold/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                      >
                        <TypeIcon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
                          <span className="truncate">{tx.description}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase font-mono bg-surface-inset text-text-secondary border border-surface-border shrink-0">
                            {tx.type}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5 flex items-center flex-wrap gap-x-2">
                          <span>{formatDate(tx.created_at)}</span>
                          {tx.tx_id && (
                            <span className="font-mono text-[11px] text-text-tertiary">
                              [{tx.tx_id}]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div
                        className={`text-sm font-bold font-mono ${
                          isCredit ? 'text-brand-up' : 'text-brand-down'
                        }`}
                      >
                        {isCredit
                          ? `+${formatINR(amountInr)}`
                          : `-${formatINR(Math.abs(amountInr))}`}
                      </div>
                      <div className="text-[11px] font-mono text-text-tertiary">
                        Bal: {formatINR(balAfterInr)}
                      </div>
                    </div>
                  </Card3D>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
