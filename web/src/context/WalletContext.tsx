import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  buildDefaultWallet,
  buildDefaultSignupLedgerItem,
  getCachedWalletSnapshot,
  getCachedLedgerSnapshot,
  getCachedPortfolioSnapshot,
  getCachedOrdersSnapshot,
  getFirestoreWallet,
  getFirestoreLedger,
  getFirestorePortfolio,
  getFirestoreOrders,
  getFirestoreWatchlist,
  executeTradeInFirestore,
  executeWalletDepositInFirestore,
  executeWalletWithdrawalInFirestore,
  toggleWatchlistSymbol,
  subscribeFirestoreFinancials,
  subscribeUserFinancials,
  type WalletDoc,
  type LedgerItemDoc,
  type PortfolioDoc,
  type OrderHistoryItem,
  type TradeOrderInput,
} from '../services/firestoreService';

export interface WalletContextValue {
  wallet: WalletDoc;
  ledger: LedgerItemDoc[];
  portfolio: PortfolioDoc;
  orders: OrderHistoryItem[];
  watchlist: string[];
  isSyncing: boolean;
  lastSyncedAt: number | null;
  refreshFinancials: () => Promise<void>;
  executeTrade: (trade: TradeOrderInput) => Promise<{
    wallet: WalletDoc;
    portfolio: PortfolioDoc;
    orders: OrderHistoryItem[];
    executedOrder: OrderHistoryItem;
  }>;
  depositFunds: (amountInr: number) => Promise<{
    wallet: WalletDoc;
    ledgerEntry: LedgerItemDoc;
  }>;
  withdrawFunds: (amountInr: number) => Promise<{
    wallet: WalletDoc;
    ledgerEntry: LedgerItemDoc;
  }>;
  toggleWatchlist: (symbol: string) => Promise<string[]>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const DEFAULT_WATCHLIST = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'SBIN', 'ITC'];

function useFinancialState(uid: string | undefined): WalletContextValue {
  const effectiveUid = uid || 'guest';

  const [wallet, setWallet] = useState<WalletDoc>(() =>
    uid ? getCachedWalletSnapshot(uid) : buildDefaultWallet(effectiveUid, 100 * 100)
  );
  const [ledger, setLedger] = useState<LedgerItemDoc[]>(() =>
    uid ? getCachedLedgerSnapshot(uid) : [buildDefaultSignupLedgerItem(effectiveUid, 100 * 100)]
  );
  const [portfolio, setPortfolio] = useState<PortfolioDoc>(() =>
    getCachedPortfolioSnapshot(effectiveUid)
  );
  const [orders, setOrders] = useState<OrderHistoryItem[]>(() =>
    uid ? getCachedOrdersSnapshot(uid) : []
  );
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const mutationGenRef = useRef(0);

  const syncFromLocalCache = useCallback(() => {
    if (!uid || !mountedRef.current) return;
    setWallet(getCachedWalletSnapshot(uid));
    setLedger(getCachedLedgerSnapshot(uid));
    setPortfolio(getCachedPortfolioSnapshot(uid));
    setOrders(getCachedOrdersSnapshot(uid));
  }, [uid]);

  const refreshFinancials = useCallback(async () => {
    if (!uid || !mountedRef.current) return;
    const startGen = mutationGenRef.current;
    setIsSyncing(true);
    try {
      const [w, l, p, o, wl] = await Promise.all([
        getFirestoreWallet(uid),
        getFirestoreLedger(uid),
        getFirestorePortfolio(uid),
        getFirestoreOrders(uid),
        getFirestoreWatchlist(uid),
      ]);
      if (!mountedRef.current) return;
      if (mutationGenRef.current !== startGen) {
        syncFromLocalCache();
        setWatchlist(wl);
        setLastSyncedAt(Date.now());
        return;
      }
      setWallet(w);
      setLedger(l);
      setPortfolio(p);
      setOrders(o);
      setWatchlist(wl);
      setLastSyncedAt(Date.now());
    } catch (err) {
      console.warn('Wallet sync refresh deferred:', err);
    } finally {
      if (mountedRef.current) setIsSyncing(false);
    }
  }, [uid, syncFromLocalCache]);

  useEffect(() => {
    mountedRef.current = true;
    syncFromLocalCache();
    refreshFinancials();

    if (!uid) {
      return () => {
        mountedRef.current = false;
      };
    }

    const unsubLocal = subscribeUserFinancials((changedUid) => {
      if (changedUid === uid) {
        mutationGenRef.current += 1;
        syncFromLocalCache();
        setLastSyncedAt(Date.now());
      }
    });

    const unsubFirestore = subscribeFirestoreFinancials(uid, {
      onWallet: (w) => {
        if (mountedRef.current) {
          setWallet(w);
          setLastSyncedAt(Date.now());
        }
      },
      onLedger: (items) => {
        if (mountedRef.current) {
          setLedger(items);
          setLastSyncedAt(Date.now());
        }
      },
      onPortfolio: (p) => {
        if (mountedRef.current) {
          setPortfolio(p);
          setLastSyncedAt(Date.now());
        }
      },
      onOrders: (o) => {
        if (mountedRef.current) {
          setOrders(o);
          setLastSyncedAt(Date.now());
        }
      },
      onWatchlist: (wl) => {
        if (mountedRef.current) {
          setWatchlist(wl);
          setLastSyncedAt(Date.now());
        }
      },
    });

    return () => {
      mountedRef.current = false;
      unsubLocal();
      unsubFirestore();
    };
  }, [uid, refreshFinancials, syncFromLocalCache]);

  const executeTrade = useCallback(
    async (trade: TradeOrderInput) => {
      if (!uid) throw new Error('Please sign in to place orders.');
      mutationGenRef.current += 1;
      const res = await executeTradeInFirestore(uid, trade);
      if (mountedRef.current) {
        setWallet(res.wallet);
        setPortfolio(res.portfolio);
        setOrders(res.orders);
        setLedger(getCachedLedgerSnapshot(uid));
        setLastSyncedAt(Date.now());
      }
      return res;
    },
    [uid]
  );

  const depositFunds = useCallback(
    async (amountInr: number) => {
      if (!uid) throw new Error('Please sign in to add funds.');
      mutationGenRef.current += 1;
      const res = await executeWalletDepositInFirestore(uid, amountInr);
      if (mountedRef.current) {
        setWallet(res.wallet);
        setLedger(getCachedLedgerSnapshot(uid));
        setLastSyncedAt(Date.now());
      }
      return res;
    },
    [uid]
  );

  const withdrawFunds = useCallback(
    async (amountInr: number) => {
      if (!uid) throw new Error('Please sign in to withdraw funds.');
      mutationGenRef.current += 1;
      const res = await executeWalletWithdrawalInFirestore(uid, amountInr);
      if (mountedRef.current) {
        setWallet(res.wallet);
        setLedger(getCachedLedgerSnapshot(uid));
        setLastSyncedAt(Date.now());
      }
      return res;
    },
    [uid]
  );

  const toggleWatchlist = useCallback(
    async (symbol: string) => {
      if (!uid) return watchlist;
      const next = await toggleWatchlistSymbol(uid, symbol);
      if (mountedRef.current) {
        setWatchlist(next);
      }
      return next;
    },
    [uid, watchlist]
  );

  return {
    wallet,
    ledger,
    portfolio,
    orders,
    watchlist,
    isSyncing,
    lastSyncedAt,
    refreshFinancials,
    executeTrade,
    depositFunds,
    withdrawFunds,
    toggleWatchlist,
  };
}

/** Provides synchronized wallet, ledger, portfolio, and orders across the entire app. */
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const uid = user?.uid || profile?.id;
  const value = useFinancialState(uid);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

/** Hook used by pages/components — shares WalletProvider context or falls back standalone in tests. */
export function useSyncedWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  const { user, profile } = useAuth();
  const uid = user?.uid || profile?.id;
  const standalone = useFinancialState(ctx ? undefined : uid);
  return ctx || standalone;
}
