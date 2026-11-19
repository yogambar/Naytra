import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card3D } from '../design/Card3D';
import { Skeleton } from '../design/Skeleton';
import { Button } from '../design/Button';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFirestoreWallet, getFirestoreLedger } from '../services/firestoreService';
import { hapticTick, hapticSuccess } from '../utils/haptics';

interface WalletResponseData {
  user_id: string;
  balance_paise: number;
  balance_inr: number;
  locked_paise: number;
  locked_inr: number;
  total_cash_paise: number;
  total_cash_inr: number;
  initial_grant_paise: number;
  initial_grant_inr: number;
  currency: string;
  is_virtual: boolean;
}

interface LedgerItem {
  id: string;
  tx_id: string;
  type: string;
  description: string;
  debit_paise: number;
  credit_paise: number;
  amount_paise: number;
  amount_inr: number;
  balance_after_paise: number;
  balance_after_inr: number;
  is_credit: boolean;
  ref_id: string | null;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export const WalletPage: React.FC = () => {
  const { idToken, user } = useAuth();

  const [wallet, setWallet] = useState<WalletResponseData>({
    user_id: user?.uid || 'user',
    balance_paise: 1_000_000,
    balance_inr: 10000.0,
    locked_paise: 0,
    locked_inr: 0,
    total_cash_paise: 1_000_000,
    total_cash_inr: 10000.0,
    initial_grant_paise: 1_000_000,
    initial_grant_inr: 10000.0,
    currency: 'INR',
    is_virtual: true,
  });

  const [ledger, setLedger] = useState<LedgerItem[]>([
    {
      id: 'ledg_init',
      tx_id: 'tx_init',
      type: 'SIGNUP_BONUS',
      description: 'Initial Virtual Signup Bonus',
      debit_paise: 0,
      credit_paise: 1_000_000,
      amount_paise: 1_000_000,
      amount_inr: 10000.0,
      balance_after_paise: 1_000_000,
      balance_after_inr: 10000.0,
      is_credit: true,
      ref_id: null,
      created_at: new Date().toISOString(),
    },
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchWalletAndLedger = useCallback(async () => {
    if (!isMountedRef.current) return;
    setError(null);

    // 1. Try reading directly from Firestore
    if (user?.uid) {
      try {
        const [fw, fl] = await Promise.all([
          getFirestoreWallet(user.uid),
          getFirestoreLedger(user.uid),
        ]);
        if (!isMountedRef.current) return;
        if (fw) {
          setWallet({
            user_id: fw.user_id,
            balance_paise: fw.balance_paise,
            balance_inr: fw.balance_inr || fw.balance_paise / 100,
            locked_paise: fw.locked_paise,
            locked_inr: fw.locked_inr || fw.locked_paise / 100,
            total_cash_paise: fw.total_cash_paise,
            total_cash_inr: fw.total_cash_inr || fw.total_cash_paise / 100,
            initial_grant_paise: fw.initial_grant_paise,
            initial_grant_inr: fw.initial_grant_inr || fw.initial_grant_paise / 100,
            currency: fw.currency,
            is_virtual: fw.is_virtual,
          });
        }
        if (fl && fl.length > 0) {
          setLedger(
            fl.map((item) => ({
              id: item.id,
              tx_id: item.tx_id,
              type: item.type,
              description: item.description,
              debit_paise: item.debit_paise,
              credit_paise: item.credit_paise,
              amount_paise: item.amount_paise,
              amount_inr: item.amount_inr ?? (item.amount_paise / 100),
              balance_after_paise: item.balance_after_paise,
              balance_after_inr: item.balance_after_inr ?? (item.balance_after_paise / 100),
              is_credit: Boolean(item.is_credit),
              ref_id: item.ref_id ?? null,
              created_at: item.created_at,
            }))
          );
        }
      } catch (fErr) {
        console.warn('Could not read wallet from Firestore:', fErr);
      }
    }

    if (!idToken) {
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    // 2. Also check backend API if active
    try {
      const [walletRes, ledgerRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/wallet`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }).catch(() => null),
        fetch(`${API_BASE}/api/v1/wallet/ledger?limit=50&offset=0`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }).catch(() => null),
      ]);

      if (!isMountedRef.current) return;

      if (walletRes && walletRes.ok) {
        const wJson = await walletRes.json();
        if (wJson.ok && wJson.data && isMountedRef.current) {
          setWallet(wJson.data);
        }
      }

      if (ledgerRes && ledgerRes.ok) {
        const lJson = await ledgerRes.json();
        if (lJson.ok && lJson.data && Array.isArray(lJson.data.items) && isMountedRef.current) {
          setLedger(lJson.data.items);
        }
      }
    } catch (err) {
      console.warn('Could not fetch wallet data from API, using cached state:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [idToken, user?.uid]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchWalletAndLedger();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchWalletAndLedger]);

  const handleRefresh = async () => {
    hapticTick();
    setIsRefreshing(true);
    await fetchWalletAndLedger();
    hapticSuccess();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              Virtual Wallet & Ledger
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-marigold-bg text-brand-marigold-text border border-brand-marigold/30">
              Paper Funds Only
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Immutable double-entry ledger in integer paise (zero floating-point math)
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          disabled={isRefreshing || isLoading}
          onClick={handleRefresh}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Ledger
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-brand-down/10 border border-brand-down/30 text-brand-down text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Balance Hero Card */}
      <Card3D elevation="e3" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Available Virtual Cash
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-text-primary">
                {isLoading ? <Skeleton width="180px" height="38px" /> : formatINR(wallet.balance_inr)}
              </span>
              <span className="text-xs font-mono text-text-tertiary">
                ({wallet.balance_paise.toLocaleString('en-IN')} paise)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-inset border border-surface-border flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-up shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-text-primary block">Virtual Signup Bonus</span>
              <span className="text-text-tertiary">
                Credited: {formatINR(wallet.initial_grant_inr)} once per account
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-surface-border">
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Initial Grant</span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {formatINR(wallet.initial_grant_inr)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Locked in Orders</span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {formatINR(wallet.locked_inr)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Realized Gains</span>
            <span className="text-sm font-bold font-mono text-brand-up">
              {formatINR(Math.max(0, wallet.total_cash_inr - wallet.initial_grant_inr))}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Total Net Worth</span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {formatINR(wallet.total_cash_inr)}
            </span>
          </div>
        </div>
      </Card3D>

      {/* Ethics & Legal Notice */}
      <div className="p-4 rounded-xl bg-surface-inset border border-surface-border flex items-start gap-3">
        <Info className="w-5 h-5 text-text-tertiary shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Virtual Funds Disclaimer:</strong> All funds displayed are strictly virtual paper-trading currency for educational simulation. No actual bank accounts, payment gateways, withdrawals, or real-money transactions exist.
        </p>
      </div>

      {/* Double-Entry Ledger Transactions Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">Double-Entry Ledger Transactions</h2>
          <span className="text-xs text-text-tertiary">
            {ledger.length} {ledger.length === 1 ? 'transaction' : 'transactions'}
          </span>
        </div>

        <div className="space-y-2">
          {ledger.map((tx) => (
            <Card3D
              key={tx.id}
              elevation="e1"
              className="p-4 flex items-center justify-between hover:border-brand-marigold/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.is_credit
                    ? 'bg-brand-up-bg text-brand-up'
                    : 'bg-surface-inset text-text-secondary'
                    }`}
                >
                  {tx.is_credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span>{tx.description}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase font-mono bg-surface-inset text-text-secondary border border-surface-border">
                      {tx.type}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {formatDate(tx.created_at)}
                    {tx.tx_id && <span className="ml-2 font-mono text-[11px] text-text-secondary font-medium">[{tx.tx_id}]</span>}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm font-bold font-mono ${tx.is_credit ? 'text-brand-up' : 'text-text-primary'
                    }`}
                >
                  {tx.is_credit ? `+${formatINR(tx.amount_inr)}` : `-${formatINR(Math.abs(tx.amount_inr))}`}
                </div>
                <div className="text-[11px] font-mono text-text-tertiary">
                  Bal: {formatINR(tx.balance_after_inr)}
                </div>
              </div>
            </Card3D>
          ))}

          {isLoading && (
            <div className="p-4 rounded-xl bg-surface-raised border border-surface-border opacity-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton width="36px" height="36px" className="rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton width="180px" height="14px" />
                  <Skeleton width="100px" height="11px" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton width="70px" height="14px" />
                <Skeleton width="60px" height="11px" />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
