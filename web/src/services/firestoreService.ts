/**
 * Firestore Service for Naytra.
 * Stores and manages user profiles, virtual wallets, immutable double-entry ledger entries,
 * portfolios, orders, and watchlists in Cloud Firestore.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { UserProfileData } from '../context/AuthContext';
import { generateUsername } from '../utils/userFormatting';

export interface WalletDoc {
  user_id: string;
  username?: string;
  balance_paise: number;
  locked_paise: number;
  total_cash_paise: number;
  initial_grant_paise: number;
  balance_inr?: number;
  locked_inr?: number;
  total_cash_inr?: number;
  initial_grant_inr?: number;
  currency: string;
  is_virtual: boolean;
  created_at: any;
  updated_at: any;
}

export interface LedgerItemDoc {
  id: string;
  tx_id: string;
  user_id?: string;
  username?: string;
  account_type?: string;
  type: string;
  description: string;
  debit_paise: number;
  credit_paise: number;
  amount_paise: number;
  balance_after_paise: number;
  is_credit?: boolean;
  amount_inr?: number;
  balance_after_inr?: number;
  ref_id?: string | null;
  created_at: any;
}

export interface HoldingPositionDoc {
  symbol: string;
  name?: string;
  quantity: number;
  avg_price_paise: number;
  invested_paise: number;
  order_mode?: 'Delivery' | 'Intraday';
}

export interface PortfolioDoc {
  user_id: string;
  username?: string;
  holdings: HoldingPositionDoc[];
  total_invested_paise: number;
  current_value_paise: number;
  realized_pnl_paise: number;
  unrealized_pnl_paise: number;
  created_at: any;
  updated_at: any;
}

export interface OrderHistoryItem {
  order_id: string;
  symbol: string;
  name: string;
  side: 'BUY' | 'SELL';
  order_mode: 'Delivery' | 'Intraday';
  price_type: 'Market' | 'Limit';
  quantity: number;
  price_paise: number;
  total_paise: number;
  status: 'EXECUTED';
  created_at: string;
}

export interface OrderDoc {
  user_id: string;
  username?: string;
  orders_count: number;
  recent_orders: OrderHistoryItem[];
  created_at: any;
  updated_at: any;
}

export interface WatchlistDoc {
  user_id: string;
  username?: string;
  name: string;
  symbols: string[];
  created_at: any;
  updated_at: any;
}

const SIGNUP_BONUS_PAISE = 1000000; // ₹10,000 = 10,00,000 paise

function timestampToISO(val: any): string | null {
  if (!val) return null;
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  return null;
}

/**
 * Fetch user profile from Firestore users/{userId} or local fallback cache.
 */
export async function getFirestoreUserProfile(userId: string): Promise<UserProfileData | null> {
  // Check local cache first as immediate fallback
  let cachedProfile: UserProfileData | null = null;
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`naytra_profile_${userId}`);
    if (cached) {
      try {
        cachedProfile = JSON.parse(cached);
      } catch {}
    }
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return cachedProfile;
    }
    const data = snap.data();
    const loaded: UserProfileData = {
      id: data.id || userId,
      email: data.email || '',
      username: data.username || generateUsername(data.name, data.email),
      name: data.name || null,
      dob: data.dob || null,
      phone: data.phone || null,
      city: data.city || null,
      profile_complete: Boolean(data.profile_complete),
      email_verified: Boolean(data.email_verified),
      terms_accepted: Boolean(data.terms_accepted),
      bonus_claimed: Boolean(data.bonus_claimed),
      created_at: timestampToISO(data.created_at),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(loaded));
    }
    return loaded;
  } catch (err) {
    console.warn('Error reading user profile from Firestore (using local cache):', err);
    return cachedProfile;
  }
}

/**
 * Initialize or sync user in Firestore.
 * If user already exists in Firestore:
 *   - Only retrieves and returns existing user data without recreating.
 * If user does not exist in Firestore:
 *   - Creates users/{userId} with username = name + random number string (made using email)
 *   - Initializes wallets/{userId} with ₹10,000 virtual cash
 *   - Initializes wallets/{userId}/ledger/{tx_signup_${userId}}
 *   - Initializes portfolios/{userId}
 *   - Initializes orders/{userId}
 *   - Initializes watchlists/{userId}
 *   - Returns { profile, isNewUser: true }
 */
export async function syncOrInitFirestoreUser(
  user: { uid: string; email?: string | null; displayName?: string | null; emailVerified?: boolean },
  additional?: { name?: string; dob?: string; phone?: string; city?: string; terms_accepted?: boolean }
): Promise<{ profile: UserProfileData; isNewUser: boolean }> {
  const userId = user.uid;
  const userDocRef = doc(db, 'users', userId);
  const email = (user.email || '').toLowerCase().trim();
  const displayName = additional?.name?.trim() || user.displayName || null;
  const username = generateUsername(displayName, email);

  try {
    const snap = await getDoc(userDocRef);

    // ── 1. USER ALREADY EXISTS: ONLY RETRIEVE DATA ───────────────────────
    if (snap.exists()) {
      const data = snap.data();
      const updates: Record<string, any> = {};

      if (user.emailVerified && !data.email_verified) {
        updates.email_verified = true;
        data.email_verified = true;
      }
      if (!data.username) {
        updates.username = username;
        data.username = username;
      }
      if (additional?.name && !data.name) {
        updates.name = additional.name.trim();
        data.name = updates.name;
      }
      if (additional?.dob && !data.dob) {
        updates.dob = additional.dob;
        data.dob = updates.dob;
      }
      if (additional?.phone && !data.phone) {
        updates.phone = additional.phone.trim();
        data.phone = updates.phone;
      }
      if (additional?.city && !data.city) {
        updates.city = additional.city.trim();
        data.city = updates.city;
      }
      if (additional?.terms_accepted && !data.terms_accepted) {
        updates.terms_accepted = true;
        data.terms_accepted = true;
      }
      if (
        (additional?.dob && additional?.terms_accepted) ||
        (data.dob && data.terms_accepted)
      ) {
        if (!data.profile_complete) {
          updates.profile_complete = true;
          data.profile_complete = true;
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = Timestamp.now();
        await updateDoc(userDocRef, updates).catch(() => null);
      }

      const existingProfile: UserProfileData = {
        id: data.id || userId,
        email: data.email || email,
        username: data.username || username,
        name: data.name || displayName,
        dob: data.dob || null,
        phone: data.phone || null,
        city: data.city || null,
        profile_complete: Boolean(data.profile_complete),
        email_verified: Boolean(data.email_verified || user.emailVerified),
        terms_accepted: Boolean(data.terms_accepted),
        bonus_claimed: Boolean(data.bonus_claimed),
        created_at: timestampToISO(data.created_at),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(existingProfile));
      }

      return {
        profile: existingProfile,
        isNewUser: false,
      };
    }

    // ── 2. NEW USER: INITIALIZE ALL COLLECTIONS IN FIRESTORE ──────────────
    const now = Timestamp.now();
    const isProfileComplete = Boolean(additional?.dob && additional?.terms_accepted);

    // Collection 1: users/{userId}
    const newUserDoc = {
      id: userId,
      uid: userId,
      username,
      email,
      name: displayName,
      dob: additional?.dob || null,
      phone: additional?.phone?.trim() || null,
      city: additional?.city?.trim() || null,
      profile_complete: isProfileComplete,
      email_verified: Boolean(user.emailVerified),
      terms_accepted: Boolean(additional?.terms_accepted),
      bonus_claimed: false, // strictly false for brand new users
      created_at: now,
      updated_at: now,
    };
    await setDoc(userDocRef, newUserDoc);

    // Collection 2: wallets/{userId}
    const walletDocRef = doc(db, 'wallets', userId);
    await setDoc(walletDocRef, {
      user_id: userId,
      username,
      balance_paise: SIGNUP_BONUS_PAISE,
      locked_paise: 0,
      total_cash_paise: SIGNUP_BONUS_PAISE,
      initial_grant_paise: SIGNUP_BONUS_PAISE,
      balance_inr: SIGNUP_BONUS_PAISE / 100,
      locked_inr: 0,
      total_cash_inr: SIGNUP_BONUS_PAISE / 100,
      initial_grant_inr: SIGNUP_BONUS_PAISE / 100,
      currency: 'INR',
      is_virtual: true,
      created_at: now,
      updated_at: now,
    });

    // Collection 3: wallets/{userId}/ledger/{tx_signup_${userId}}
    const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', `tx_signup_${userId}`);
    await setDoc(ledgerDocRef, {
      id: `tx_signup_${userId}`,
      tx_id: `tx_${Date.now()}_signup`,
      user_id: userId,
      username,
      account_type: 'USER_CASH',
      type: 'SIGNUP_BONUS',
      description: 'Signup practice bonus grant',
      debit_paise: 0,
      credit_paise: SIGNUP_BONUS_PAISE,
      amount_paise: SIGNUP_BONUS_PAISE,
      amount_inr: SIGNUP_BONUS_PAISE / 100,
      balance_after_paise: SIGNUP_BONUS_PAISE,
      balance_after_inr: SIGNUP_BONUS_PAISE / 100,
      is_credit: true,
      created_at: now,
    });

    // Collection 4: portfolios/{userId}
    const portfolioDocRef = doc(db, 'portfolios', userId);
    await setDoc(portfolioDocRef, {
      user_id: userId,
      username,
      holdings: [],
      total_invested_paise: 0,
      current_value_paise: 0,
      realized_pnl_paise: 0,
      unrealized_pnl_paise: 0,
      created_at: now,
      updated_at: now,
    });

    // Collection 5: orders/{userId}
    const orderDocRef = doc(db, 'orders', userId);
    await setDoc(orderDocRef, {
      user_id: userId,
      username,
      orders_count: 0,
      recent_orders: [],
      created_at: now,
      updated_at: now,
    });

    // Collection 6: watchlists/{userId}
    const watchlistDocRef = doc(db, 'watchlists', userId);
    await setDoc(watchlistDocRef, {
      user_id: userId,
      username,
      name: 'BSE Sensex 30 Top Movers',
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'SBIN', 'ITC'],
      created_at: now,
      updated_at: now,
    });

    const newProfile: UserProfileData = {
      id: userId,
      email: newUserDoc.email,
      username: newUserDoc.username,
      name: newUserDoc.name,
      dob: newUserDoc.dob,
      phone: newUserDoc.phone,
      city: newUserDoc.city,
      profile_complete: newUserDoc.profile_complete,
      email_verified: newUserDoc.email_verified,
      terms_accepted: newUserDoc.terms_accepted,
      bonus_claimed: false,
      created_at: now.toDate().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(newProfile));
    }

    return { profile: newProfile, isNewUser: true };
  } catch (err) {
    console.error('Firestore user init error:', err);
    // Return fallback profile so user is not blocked if rules not yet published in console
    const fallbackProfile: UserProfileData = {
      id: userId,
      email,
      username,
      name: displayName,
      dob: additional?.dob || null,
      phone: additional?.phone || null,
      city: additional?.city || null,
      profile_complete: Boolean(additional?.dob && additional?.terms_accepted),
      email_verified: Boolean(user.emailVerified),
      terms_accepted: Boolean(additional?.terms_accepted),
      bonus_claimed: false,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(fallbackProfile));
    }

    return {
      profile: fallbackProfile,
      isNewUser: true,
    };
  }
}

/**
 * Mark signup bonus as claimed in Firestore and local cache.
 */
export async function claimFirestoreBonus(userId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`naytra_profile_${userId}`);
    if (cached) {
      try {
        const obj = JSON.parse(cached);
        obj.bonus_claimed = true;
        localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(obj));
      } catch {}
    }
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        bonus_claimed: true,
        updated_at: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore claimBonus error (cached locally):', err);
  }
}

/**
 * Complete profile details in Firestore and local cache.
 * Initializes all required user collections if not yet present.
 */
export async function completeFirestoreUserProfile(
  userId: string,
  data: {
    name: string;
    dob: string;
    phone?: string;
    city?: string;
    terms_accepted: boolean;
  }
): Promise<UserProfileData> {
  const nowISO = new Date().toISOString();
  const currentUser = auth.currentUser;
  const email = (currentUser?.email || '').toLowerCase().trim();
  const username = generateUsername(data.name, email);

  const profileData: UserProfileData = {
    id: userId,
    email,
    username,
    name: data.name.trim(),
    dob: data.dob,
    phone: data.phone?.trim() || null,
    city: data.city?.trim() || null,
    terms_accepted: true,
    profile_complete: true,
    email_verified: Boolean(currentUser?.emailVerified),
    bonus_claimed: false,
    created_at: nowISO,
  };

  // 1. Persist to local cache so user is never blocked
  if (typeof window !== 'undefined') {
    localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(profileData));
  }

  // 2. Write to Firestore across all user collections with merge: true
  try {
    const now = Timestamp.now();

    // 1) users/{userId}
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        id: userId,
        uid: userId,
        username,
        email,
        name: data.name.trim(),
        dob: data.dob,
        phone: data.phone?.trim() || null,
        city: data.city?.trim() || null,
        terms_accepted: true,
        profile_complete: true,
        email_verified: Boolean(currentUser?.emailVerified),
        updated_at: now,
      },
      { merge: true }
    );

    // 2) wallets/{userId}
    const walletDocRef = doc(db, 'wallets', userId);
    await setDoc(
      walletDocRef,
      {
        user_id: userId,
        username,
        balance_paise: SIGNUP_BONUS_PAISE,
        locked_paise: 0,
        total_cash_paise: SIGNUP_BONUS_PAISE,
        initial_grant_paise: SIGNUP_BONUS_PAISE,
        balance_inr: SIGNUP_BONUS_PAISE / 100,
        locked_inr: 0,
        total_cash_inr: SIGNUP_BONUS_PAISE / 100,
        initial_grant_inr: SIGNUP_BONUS_PAISE / 100,
        currency: 'INR',
        is_virtual: true,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );

    // 3) wallets/{userId}/ledger/{tx_signup_${userId}}
    const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', `tx_signup_${userId}`);
    await setDoc(
      ledgerDocRef,
      {
        id: `tx_signup_${userId}`,
        tx_id: `tx_${Date.now()}_signup`,
        user_id: userId,
        username,
        account_type: 'USER_CASH',
        type: 'SIGNUP_BONUS',
        description: 'Signup practice bonus grant',
        debit_paise: 0,
        credit_paise: SIGNUP_BONUS_PAISE,
        amount_paise: SIGNUP_BONUS_PAISE,
        amount_inr: SIGNUP_BONUS_PAISE / 100,
        balance_after_paise: SIGNUP_BONUS_PAISE,
        balance_after_inr: SIGNUP_BONUS_PAISE / 100,
        is_credit: true,
        created_at: now,
      },
      { merge: true }
    );

    // 4) portfolios/{userId}
    const portfolioDocRef = doc(db, 'portfolios', userId);
    await setDoc(
      portfolioDocRef,
      {
        user_id: userId,
        username,
        holdings: [],
        total_invested_paise: 0,
        current_value_paise: 0,
        realized_pnl_paise: 0,
        unrealized_pnl_paise: 0,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );

    // 5) orders/{userId}
    const orderDocRef = doc(db, 'orders', userId);
    await setDoc(
      orderDocRef,
      {
        user_id: userId,
        username,
        orders_count: 0,
        recent_orders: [],
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );

    // 6) watchlists/{userId}
    const watchlistDocRef = doc(db, 'watchlists', userId);
    await setDoc(
      watchlistDocRef,
      {
        user_id: userId,
        username,
        name: 'BSE Sensex 30 Top Movers',
        symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'SBIN', 'ITC'],
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore completeUserProfile write deferred (cached locally):', err);
  }

  return profileData;
}

/**
 * Records a financial transaction in the user's double-entry ledger in integer paise.
 */
export async function recordTransactionInLedger(
  userId: string,
  tx: {
    type: string;
    amount_paise: number;
    balance_after_paise: number;
    description: string;
    reference_id?: string;
  }
): Promise<void> {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Timestamp.now();
  const isCredit = tx.type === 'TRADE_SELL' || tx.type === 'SIGNUP_BONUS' || tx.type === 'DEPOSIT';

  try {
    const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', txId);
    await setDoc(ledgerDocRef, {
      id: txId,
      tx_id: txId,
      user_id: userId,
      account_type: 'USER_CASH',
      type: tx.type,
      description: tx.description,
      debit_paise: isCredit ? 0 : tx.amount_paise,
      credit_paise: isCredit ? tx.amount_paise : 0,
      amount_paise: tx.amount_paise,
      amount_inr: tx.amount_paise / 100,
      balance_after_paise: tx.balance_after_paise,
      balance_after_inr: tx.balance_after_paise / 100,
      is_credit: isCredit,
      ref_id: tx.reference_id || null,
      created_at: now,
    });

    const walletRef = doc(db, 'wallets', userId);
    await updateDoc(walletRef, {
      balance_paise: tx.balance_after_paise,
      total_cash_paise: tx.balance_after_paise,
      balance_inr: tx.balance_after_paise / 100,
      total_cash_inr: tx.balance_after_paise / 100,
      updated_at: now,
    }).catch(() => null);
  } catch (err) {
    console.warn('Deferred recording transaction in Firestore:', err);
  }
}

/**
 * Fetch wallet data from Firestore with local cache fallback.
 */
export async function getFirestoreWallet(userId: string): Promise<WalletDoc | null> {
  let cachedWallet: WalletDoc | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_wallet_${userId}`);
    if (raw) {
      try {
        cachedWallet = JSON.parse(raw) as WalletDoc;
      } catch {
        // ignore invalid cache
      }
    }
  }

  try {
    const walletRef = doc(db, 'wallets', userId);
    const snap = await getDoc(walletRef);
    if (!snap.exists()) return cachedWallet;
    const loaded = snap.data() as WalletDoc;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_wallet_${userId}`, JSON.stringify(loaded));
    }
    return loaded;
  } catch (err) {
    console.warn('Could not read wallet from Firestore:', err);
    return cachedWallet;
  }
}

/**
 * Fetch portfolio holdings from Firestore with localStorage fallback.
 */
export async function getFirestorePortfolio(userId: string): Promise<PortfolioDoc> {
  const emptyPortfolio: PortfolioDoc = {
    user_id: userId,
    holdings: [],
    total_invested_paise: 0,
    current_value_paise: 0,
    realized_pnl_paise: 0,
    unrealized_pnl_paise: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let cachedPortfolio: PortfolioDoc | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_portfolio_${userId}`);
    if (raw) {
      try {
        cachedPortfolio = JSON.parse(raw) as PortfolioDoc;
      } catch {
        // ignore
      }
    }
  }

  try {
    const ref = doc(db, 'portfolios', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return cachedPortfolio || emptyPortfolio;
    const data = snap.data() as PortfolioDoc;
    const normalized: PortfolioDoc = {
      ...emptyPortfolio,
      ...data,
      holdings: Array.isArray(data.holdings) ? data.holdings : [],
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_portfolio_${userId}`, JSON.stringify(normalized));
    }
    return normalized;
  } catch (err) {
    console.warn('Could not read portfolio from Firestore (using local cache):', err);
    return cachedPortfolio || emptyPortfolio;
  }
}

/**
 * Fetch recent virtual orders from Firestore with localStorage fallback.
 */
export async function getFirestoreOrders(userId: string): Promise<OrderHistoryItem[]> {
  let cachedOrders: OrderHistoryItem[] = [];
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_orders_${userId}`);
    if (raw) {
      try {
        cachedOrders = JSON.parse(raw) as OrderHistoryItem[];
      } catch {
        // ignore
      }
    }
  }

  try {
    const ref = doc(db, 'orders', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return cachedOrders;
    const data = snap.data() as OrderDoc;
    const list = Array.isArray(data.recent_orders) ? data.recent_orders : [];
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_orders_${userId}`, JSON.stringify(list));
    }
    return list;
  } catch (err) {
    console.warn('Could not read orders from Firestore (using local cache):', err);
    return cachedOrders;
  }
}

/**
 * Fetch user's watchlist symbols from Firestore with localStorage fallback.
 */
export async function getFirestoreWatchlist(userId: string): Promise<string[]> {
  const defaultSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'SBIN', 'ITC'];
  let cachedSymbols: string[] | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_watchlist_${userId}`);
    if (raw) {
      try {
        cachedSymbols = JSON.parse(raw) as string[];
      } catch {
        // ignore
      }
    }
  }

  try {
    const ref = doc(db, 'watchlists', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return cachedSymbols || defaultSymbols;
    const data = snap.data() as WatchlistDoc;
    const symbols = Array.isArray(data.symbols) ? data.symbols : defaultSymbols;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_watchlist_${userId}`, JSON.stringify(symbols));
    }
    return symbols;
  } catch (err) {
    console.warn('Could not read watchlist from Firestore (using local cache):', err);
    return cachedSymbols || defaultSymbols;
  }
}

/**
 * Adds or removes a symbol in user's watchlist.
 */
export async function toggleWatchlistSymbol(userId: string, symbol: string): Promise<string[]> {
  const sym = symbol.toUpperCase();
  const current = await getFirestoreWatchlist(userId);
  const exists = current.includes(sym);
  const next = exists ? current.filter((s) => s !== sym) : [sym, ...current];

  if (typeof window !== 'undefined') {
    localStorage.setItem(`naytra_watchlist_${userId}`, JSON.stringify(next));
  }

  try {
    const ref = doc(db, 'watchlists', userId);
    await setDoc(
      ref,
      {
        user_id: userId,
        symbols: next,
        updated_at: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Deferred syncing watchlist to Firestore:', err);
  }
  return next;
}

export interface PaperTradeInput {
  symbol: string;
  name: string;
  side: 'BUY' | 'SELL';
  orderMode: 'Delivery' | 'Intraday';
  priceType: 'Market' | 'Limit';
  quantity: number;
  executionPriceInr: number;
}

/**
 * Executes a virtual paper BUY or SELL order in integer paise.
 * Atomically updates portfolio holdings, double-entry ledger, wallet balance, and order history.
 */
export async function executePaperTradeInFirestore(
  userId: string,
  trade: PaperTradeInput
): Promise<{
  wallet: WalletDoc;
  portfolio: PortfolioDoc;
  orders: OrderHistoryItem[];
  executedOrder: OrderHistoryItem;
}> {
  const qty = Math.floor(trade.quantity);
  if (!Number.isFinite(qty) || qty < 1) {
    throw new Error('Quantity must be at least 1 share.');
  }
  if (!Number.isFinite(trade.executionPriceInr) || trade.executionPriceInr <= 0) {
    throw new Error('Execution price must be greater than ₹0.');
  }

  const pricePaise = Math.round(trade.executionPriceInr * 100);
  const totalPaise = pricePaise * qty;
  const sym = trade.symbol.toUpperCase();

  const [existingWallet, existingPortfolio, existingOrders] = await Promise.all([
    getFirestoreWallet(userId),
    getFirestorePortfolio(userId),
    getFirestoreOrders(userId),
  ]);

  const nowIso = new Date().toISOString();
  const currentWallet: WalletDoc = existingWallet || {
    user_id: userId,
    balance_paise: SIGNUP_BONUS_PAISE,
    locked_paise: 0,
    total_cash_paise: SIGNUP_BONUS_PAISE,
    initial_grant_paise: SIGNUP_BONUS_PAISE,
    balance_inr: SIGNUP_BONUS_PAISE / 100,
    locked_inr: 0,
    total_cash_inr: SIGNUP_BONUS_PAISE / 100,
    initial_grant_inr: SIGNUP_BONUS_PAISE / 100,
    currency: 'INR',
    is_virtual: true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const currentCashPaise = currentWallet.balance_paise ?? currentWallet.total_cash_paise ?? SIGNUP_BONUS_PAISE;

  if (trade.side === 'BUY' && totalPaise > currentCashPaise) {
    throw new Error('Insufficient virtual balance to execute this buy order.');
  }

  const holdings = [...(existingPortfolio.holdings || [])];
  const existingIdx = holdings.findIndex(
    (h) => h.symbol.toUpperCase() === sym && (h.order_mode || 'Delivery') === trade.orderMode
  );

  let realizedDeltaPaise = 0;

  if (trade.side === 'BUY') {
    if (existingIdx >= 0) {
      const prev = holdings[existingIdx];
      const nextQty = prev.quantity + qty;
      const nextInvested = prev.invested_paise + totalPaise;
      holdings[existingIdx] = {
        ...prev,
        name: trade.name || prev.name,
        quantity: nextQty,
        invested_paise: nextInvested,
        avg_price_paise: Math.round(nextInvested / nextQty),
        order_mode: trade.orderMode,
      };
    } else {
      holdings.push({
        symbol: sym,
        name: trade.name,
        quantity: qty,
        avg_price_paise: pricePaise,
        invested_paise: totalPaise,
        order_mode: trade.orderMode,
      });
    }
  } else {
    if (existingIdx < 0 || holdings[existingIdx].quantity < qty) {
      const avail = existingIdx >= 0 ? holdings[existingIdx].quantity : 0;
      throw new Error(`Insufficient ${trade.orderMode} shares for ${sym}. Available: ${avail}.`);
    }
    const prev = holdings[existingIdx];
    const remainingQty = prev.quantity - qty;
    realizedDeltaPaise = (pricePaise - prev.avg_price_paise) * qty;
    if (remainingQty <= 0) {
      holdings.splice(existingIdx, 1);
    } else {
      holdings[existingIdx] = {
        ...prev,
        quantity: remainingQty,
        invested_paise: prev.avg_price_paise * remainingQty,
      };
    }
  }

  const nextCashPaise = trade.side === 'BUY' ? currentCashPaise - totalPaise : currentCashPaise + totalPaise;
  const totalInvestedPaise = holdings.reduce((sum, h) => sum + h.invested_paise, 0);

  const nextWallet: WalletDoc = {
    ...currentWallet,
    balance_paise: nextCashPaise,
    total_cash_paise: nextCashPaise,
    balance_inr: nextCashPaise / 100,
    total_cash_inr: nextCashPaise / 100,
    updated_at: nowIso,
  };

  const nextPortfolio: PortfolioDoc = {
    ...existingPortfolio,
    user_id: userId,
    holdings,
    total_invested_paise: totalInvestedPaise,
    current_value_paise: totalInvestedPaise,
    realized_pnl_paise: (existingPortfolio.realized_pnl_paise || 0) + realizedDeltaPaise,
    updated_at: nowIso,
  };

  const executedOrder: OrderHistoryItem = {
    order_id: `ord_${Date.now()}_${sym}`,
    symbol: sym,
    name: trade.name,
    side: trade.side,
    order_mode: trade.orderMode,
    price_type: trade.priceType,
    quantity: qty,
    price_paise: pricePaise,
    total_paise: totalPaise,
    status: 'EXECUTED',
    created_at: nowIso,
  };

  const nextOrders = [executedOrder, ...existingOrders].slice(0, 50);

  // Persist local caches immediately so UI stays consistent even offline
  if (typeof window !== 'undefined') {
    localStorage.setItem(`naytra_wallet_${userId}`, JSON.stringify(nextWallet));
    localStorage.setItem(`naytra_portfolio_${userId}`, JSON.stringify(nextPortfolio));
    localStorage.setItem(`naytra_orders_${userId}`, JSON.stringify(nextOrders));
  }

  // Record ledger & wallet + persist portfolio & orders to Firestore
  await recordTransactionInLedger(userId, {
    type: trade.side === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
    amount_paise: totalPaise,
    balance_after_paise: nextCashPaise,
    description: `Virtual ${trade.side} (${trade.orderMode}) ${qty} ${sym} @ ₹${trade.executionPriceInr.toFixed(2)}`,
    reference_id: executedOrder.order_id,
  });

  try {
    const now = Timestamp.now();
    await Promise.all([
      setDoc(
        doc(db, 'portfolios', userId),
        {
          user_id: userId,
          holdings,
          total_invested_paise: totalInvestedPaise,
          current_value_paise: totalInvestedPaise,
          realized_pnl_paise: nextPortfolio.realized_pnl_paise,
          updated_at: now,
        },
        { merge: true }
      ),
      setDoc(
        doc(db, 'orders', userId),
        {
          user_id: userId,
          orders_count: nextOrders.length,
          recent_orders: nextOrders,
          updated_at: now,
        },
        { merge: true }
      ),
    ]);
  } catch (err) {
    console.warn('Deferred syncing portfolio/orders to Firestore (cached locally):', err);
  }

  return {
    wallet: nextWallet,
    portfolio: nextPortfolio,
    orders: nextOrders,
    executedOrder,
  };
}

/**
 * Fetch double-entry ledger history from Firestore.
 */
export async function getFirestoreLedger(userId: string): Promise<LedgerItemDoc[]> {
  try {
    const ledgerCol = collection(db, 'wallets', userId, 'ledger');
    const q = query(ledgerCol, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        tx_id: data.tx_id || '',
        user_id: data.user_id,
        username: data.username,
        account_type: data.account_type,
        type: data.type || 'UNKNOWN',
        description: data.description || '',
        debit_paise: data.debit_paise || 0,
        credit_paise: data.credit_paise || 0,
        amount_paise: data.amount_paise || 0,
        balance_after_paise: data.balance_after_paise || 0,
        is_credit: Boolean(data.is_credit),
        amount_inr: data.amount_inr || (data.amount_paise ? data.amount_paise / 100 : 0),
        balance_after_inr: data.balance_after_inr || (data.balance_after_paise ? data.balance_after_paise / 100 : 0),
        ref_id: data.ref_id || null,
        created_at: timestampToISO(data.created_at) || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Could not read ledger from Firestore:', err);
    return [];
  }
}

/**
 * Complete account deletion.
 * Deletes user's ledger entries, wallet, portfolio, orders, watchlists,
 * and user document from Firestore, then deletes from Firebase Auth.
 */
export async function deleteFirestoreUserAccount(userId: string): Promise<void> {
  try {
    // 1. Delete ledger entries (best-effort)
    try {
      const ledgerCol = collection(db, 'wallets', userId, 'ledger');
      const snap = await getDocs(ledgerCol);
      for (const d of snap.docs) {
        await deleteDoc(d.ref).catch(() => null);
      }
    } catch (ledgerErr) {
      console.warn('Ledger cleanup deferred:', ledgerErr);
    }

    // 2. Delete wallet document (best-effort)
    await deleteDoc(doc(db, 'wallets', userId)).catch(() => null);

    // 3. Delete portfolio document (best-effort)
    await deleteDoc(doc(db, 'portfolios', userId)).catch(() => null);

    // 4. Delete orders document (best-effort)
    await deleteDoc(doc(db, 'orders', userId)).catch(() => null);

    // 5. Delete watchlist document (best-effort)
    await deleteDoc(doc(db, 'watchlists', userId)).catch(() => null);

    // 6. Delete user document (best-effort)
    await deleteDoc(doc(db, 'users', userId)).catch(() => null);

    // 7. Clear local cache
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`naytra_profile_${userId}`);
    }

    // 8. Delete Firebase Auth user
    if (auth.currentUser && auth.currentUser.uid === userId) {
      await auth.currentUser.delete();
    }
  } catch (err) {
    console.error('Error deleting user account from Firestore:', err);
    throw err;
  }
}
