/**
 * Firestore Service for Naytra.
 * Stores and manages user profiles, INR wallets, immutable double-entry ledger entries,
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
  onSnapshot,
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

export const SIGNUP_BONUS_MIN_INR = 1;
export const SIGNUP_BONUS_MAX_INR = 100;
const MAX_SINGLE_DEPOSIT_INR = 10_000_000;

const walletSyncListeners = new Set<(userId: string) => void>();

/** Roll a random signup bonus from ₹1 to ₹100 (inclusive) returned in integer paise. */
export function generateRandomSignupBonusPaise(): number {
  const randomInr =
    Math.floor(Math.random() * (SIGNUP_BONUS_MAX_INR - SIGNUP_BONUS_MIN_INR + 1)) +
    SIGNUP_BONUS_MIN_INR;
  return randomInr * 100;
}

/** Subscribe to real-time client-side wallet/portfolio/ledger updates across pages. */
export function subscribeUserFinancials(listener: (userId: string) => void): () => void {
  walletSyncListeners.add(listener);
  return () => {
    walletSyncListeners.delete(listener);
  };
}

/** Notify all mounted components/contexts that user's financial state changed. */
export function notifyUserFinancialsChanged(userId: string): void {
  walletSyncListeners.forEach((listener) => {
    try {
      listener(userId);
    } catch {
      // Ignore individual subscriber errors
    }
  });
}

/** Construct a wallet record seeded with a specific bonus in integer paise. */
export function buildDefaultWallet(
  userId: string,
  bonusPaise: number = generateRandomSignupBonusPaise()
): WalletDoc {
  const nowIso = new Date().toISOString();
  return {
    user_id: userId,
    balance_paise: bonusPaise,
    locked_paise: 0,
    total_cash_paise: bonusPaise,
    initial_grant_paise: bonusPaise,
    balance_inr: bonusPaise / 100,
    locked_inr: 0,
    total_cash_inr: bonusPaise / 100,
    initial_grant_inr: bonusPaise / 100,
    currency: 'INR',
    is_virtual: false,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

/** Construct the matching signup bonus ledger entry. */
export function buildDefaultSignupLedgerItem(
  userId: string,
  bonusPaise: number = generateRandomSignupBonusPaise()
): LedgerItemDoc {
  return {
    id: `tx_signup_${userId}`,
    tx_id: `tx_init_${userId}`,
    user_id: userId,
    account_type: 'USER_CASH',
    type: 'SIGNUP_BONUS',
    description: 'Welcome Signup Bonus',
    debit_paise: 0,
    credit_paise: bonusPaise,
    amount_paise: bonusPaise,
    amount_inr: bonusPaise / 100,
    balance_after_paise: bonusPaise,
    balance_after_inr: bonusPaise / 100,
    is_credit: true,
    ref_id: null,
    created_at: new Date().toISOString(),
  };
}

function readLocalJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

const FIRESTORE_TIMEOUT_MS = 2500;

/** Only query Firestore when Firebase Auth matches the requested userId. */
function canUseFirestore(userId: string): boolean {
  return Boolean(userId && auth.currentUser && auth.currentUser.uid === userId);
}

/** Bound Firestore network operations so flaky connections never hang UI actions. */
function withTimeout<T>(promise: Promise<T>, ms = FIRESTORE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Firestore sync timeout')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Ensure an uninitialized user gets ONE consistent random ₹1–₹100 signup bonus
 * written cleanly to both wallet & ledger local cache.
 */
function ensureSeededFinancials(userId: string): {
  wallet: WalletDoc;
  ledger: LedgerItemDoc[];
} {
  const cachedWallet = readLocalJson<WalletDoc>(`naytra_wallet_${userId}`);
  const cachedLedger = readLocalJson<LedgerItemDoc[]>(`naytra_ledger_${userId}`);

  if (cachedWallet && cachedLedger && cachedLedger.length > 0) {
    return { wallet: cachedWallet, ledger: cachedLedger };
  }

  const bonusPaise = cachedWallet
    ? cachedWallet.initial_grant_paise || cachedWallet.balance_paise
    : generateRandomSignupBonusPaise();
  const wallet = cachedWallet ? cachedWallet : buildDefaultWallet(userId, bonusPaise);
  const ledger =
    cachedLedger && cachedLedger.length > 0
      ? cachedLedger
      : [buildDefaultSignupLedgerItem(userId, bonusPaise)];

  writeLocalJson(`naytra_wallet_${userId}`, wallet);
  writeLocalJson(`naytra_ledger_${userId}`, ledger);
  return { wallet, ledger };
}

/** Synchronously read cached/default wallet so components render consistent bonus immediately. */
export function getCachedWalletSnapshot(userId: string): WalletDoc {
  return ensureSeededFinancials(userId).wallet;
}

/** Synchronously read cached/default ledger items matching wallet bonus. */
export function getCachedLedgerSnapshot(userId: string): LedgerItemDoc[] {
  return ensureSeededFinancials(userId).ledger;
}

/** Synchronously read cached/default portfolio. */
export function getCachedPortfolioSnapshot(userId: string): PortfolioDoc {
  const cached = readLocalJson<PortfolioDoc>(`naytra_portfolio_${userId}`);
  if (cached) return cached;
  const nowIso = new Date().toISOString();
  return {
    user_id: userId,
    holdings: [],
    total_invested_paise: 0,
    current_value_paise: 0,
    realized_pnl_paise: 0,
    unrealized_pnl_paise: 0,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

/** Synchronously read cached orders list. */
export function getCachedOrdersSnapshot(userId: string): OrderHistoryItem[] {
  return readLocalJson<OrderHistoryItem[]>(`naytra_orders_${userId}`) || [];
}

function normalizeWalletDoc(userId: string, data: Partial<WalletDoc>): WalletDoc {
  const fallback = buildDefaultWallet(userId, typeof data.initial_grant_paise === 'number' ? data.initial_grant_paise : 100 * 100);
  const balancePaise =
    typeof data.balance_paise === 'number'
      ? data.balance_paise
      : typeof data.total_cash_paise === 'number'
        ? data.total_cash_paise
        : fallback.balance_paise;
  const lockedPaise = typeof data.locked_paise === 'number' ? data.locked_paise : 0;
  const totalCashPaise =
    typeof data.total_cash_paise === 'number' ? data.total_cash_paise : balancePaise + lockedPaise;
  const initialGrantPaise =
    typeof data.initial_grant_paise === 'number' ? data.initial_grant_paise : fallback.initial_grant_paise;

  return {
    ...fallback,
    ...data,
    user_id: data.user_id || userId,
    balance_paise: balancePaise,
    locked_paise: lockedPaise,
    total_cash_paise: totalCashPaise,
    initial_grant_paise: initialGrantPaise,
    balance_inr: balancePaise / 100,
    locked_inr: lockedPaise / 100,
    total_cash_inr: totalCashPaise / 100,
    initial_grant_inr: initialGrantPaise / 100,
    is_virtual: false,
  };
}

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
 *   - Initializes wallets/{userId} with a random ₹1–₹100 welcome bonus
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
    const seeded = ensureSeededFinancials(userId);
    const bonusPaise = seeded.wallet.initial_grant_paise;

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
      signup_bonus_inr: bonusPaise / 100,
      created_at: now,
      updated_at: now,
    };
    await setDoc(userDocRef, newUserDoc);

    // Collection 2 & 3: wallets/{userId} + ledger (only seed if missing)
    const walletDocRef = doc(db, 'wallets', userId);
    const existingWalletSnap = await getDoc(walletDocRef).catch(() => null);
    if (!existingWalletSnap || !existingWalletSnap.exists()) {
      await setDoc(walletDocRef, {
        user_id: userId,
        username,
        balance_paise: bonusPaise,
        locked_paise: 0,
        total_cash_paise: bonusPaise,
        initial_grant_paise: bonusPaise,
        balance_inr: bonusPaise / 100,
        locked_inr: 0,
        total_cash_inr: bonusPaise / 100,
        initial_grant_inr: bonusPaise / 100,
        currency: 'INR',
        is_virtual: false,
        created_at: now,
        updated_at: now,
      });

      const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', `tx_signup_${userId}`);
      await setDoc(ledgerDocRef, {
        id: `tx_signup_${userId}`,
        tx_id: `tx_${Date.now()}_signup`,
        user_id: userId,
        username,
        account_type: 'USER_CASH',
        type: 'SIGNUP_BONUS',
        description: 'Welcome Signup Bonus',
        debit_paise: 0,
        credit_paise: bonusPaise,
        amount_paise: bonusPaise,
        amount_inr: bonusPaise / 100,
        balance_after_paise: bonusPaise,
        balance_after_inr: bonusPaise / 100,
        is_credit: true,
        created_at: now,
      });
    }

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
    writeLocalJson(`naytra_wallet_${userId}`, buildDefaultWallet(userId, bonusPaise));
    writeLocalJson(`naytra_ledger_${userId}`, [buildDefaultSignupLedgerItem(userId, bonusPaise)]);
    notifyUserFinancialsChanged(userId);

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

    // 2) wallets/{userId} — only initialize if missing so existing balances/bonuses aren't overwritten
    const walletDocRef = doc(db, 'wallets', userId);
    const existingWalletSnap = await getDoc(walletDocRef);
    if (!existingWalletSnap.exists()) {
      const seeded = ensureSeededFinancials(userId);
      const bonusPaise = seeded.wallet.initial_grant_paise;
      await setDoc(walletDocRef, {
        user_id: userId,
        username,
        balance_paise: bonusPaise,
        locked_paise: 0,
        total_cash_paise: bonusPaise,
        initial_grant_paise: bonusPaise,
        balance_inr: bonusPaise / 100,
        locked_inr: 0,
        total_cash_inr: bonusPaise / 100,
        initial_grant_inr: bonusPaise / 100,
        currency: 'INR',
        is_virtual: false,
        created_at: now,
        updated_at: now,
      });

      // 3) wallets/{userId}/ledger/{tx_signup_${userId}}
      const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', `tx_signup_${userId}`);
      await setDoc(ledgerDocRef, {
        id: `tx_signup_${userId}`,
        tx_id: `tx_${Date.now()}_signup`,
        user_id: userId,
        username,
        account_type: 'USER_CASH',
        type: 'SIGNUP_BONUS',
        description: 'Welcome Signup Bonus',
        debit_paise: 0,
        credit_paise: bonusPaise,
        amount_paise: bonusPaise,
        amount_inr: bonusPaise / 100,
        balance_after_paise: bonusPaise,
        balance_after_inr: bonusPaise / 100,
        is_credit: true,
        created_at: now,
      });

      writeLocalJson(`naytra_wallet_${userId}`, buildDefaultWallet(userId, bonusPaise));
      writeLocalJson(`naytra_ledger_${userId}`, [buildDefaultSignupLedgerItem(userId, bonusPaise)]);
      notifyUserFinancialsChanged(userId);
    }

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
): Promise<LedgerItemDoc> {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Timestamp.now();
  const nowIso = new Date().toISOString();
  const isCredit =
    tx.type === 'TRADE_SELL' || tx.type === 'SIGNUP_BONUS' || tx.type === 'DEPOSIT';

  const newEntry: LedgerItemDoc = {
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
    created_at: nowIso,
  };

  // Persist local caches synchronously so all screens stay consistent immediately
  const existingLedger = getCachedLedgerSnapshot(userId);
  const nextLedger = [newEntry, ...existingLedger].slice(0, 100);
  writeLocalJson(`naytra_ledger_${userId}`, nextLedger);

  const prevWallet = getCachedWalletSnapshot(userId);
  const nextWallet: WalletDoc = normalizeWalletDoc(userId, {
    ...prevWallet,
    balance_paise: tx.balance_after_paise,
    total_cash_paise: tx.balance_after_paise + (prevWallet.locked_paise || 0),
    updated_at: nowIso,
  });
  writeLocalJson(`naytra_wallet_${userId}`, nextWallet);
  notifyUserFinancialsChanged(userId);

  if (!canUseFirestore(userId)) {
    return newEntry;
  }

  try {
    const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', txId);
    const walletRef = doc(db, 'wallets', userId);
    await withTimeout(
      Promise.all([
        setDoc(ledgerDocRef, {
          ...newEntry,
          created_at: now,
        }),
        setDoc(
          walletRef,
          {
            user_id: userId,
            balance_paise: tx.balance_after_paise,
            locked_paise: prevWallet.locked_paise || 0,
            total_cash_paise: nextWallet.total_cash_paise,
            initial_grant_paise: nextWallet.initial_grant_paise,
            balance_inr: tx.balance_after_paise / 100,
            total_cash_inr: nextWallet.total_cash_paise / 100,
            initial_grant_inr: nextWallet.initial_grant_inr,
            currency: 'INR',
            is_virtual: false,
            updated_at: now,
          },
          { merge: true }
        ),
      ])
    );
  } catch (err) {
    console.warn('Deferred recording transaction in Firestore:', err);
  }

  return newEntry;
}

/**
 * Fetch wallet data from Firestore with local cache & signup-bonus fallback.
 */
export async function getFirestoreWallet(userId: string): Promise<WalletDoc> {
  const localWallet = normalizeWalletDoc(userId, ensureSeededFinancials(userId).wallet);

  if (!canUseFirestore(userId)) {
    writeLocalJson(`naytra_wallet_${userId}`, localWallet);
    return localWallet;
  }

  try {
    const walletRef = doc(db, 'wallets', userId);
    const snap = await withTimeout(getDoc(walletRef));
    if (!snap.exists()) {
      writeLocalJson(`naytra_wallet_${userId}`, localWallet);
      const now = Timestamp.now();
      await withTimeout(
        setDoc(
          walletRef,
          {
            ...localWallet,
            created_at: now,
            updated_at: now,
          },
          { merge: true }
        )
      ).catch(() => null);
      return localWallet;
    }

    const loaded = normalizeWalletDoc(userId, snap.data() as WalletDoc);
    writeLocalJson(`naytra_wallet_${userId}`, loaded);
    return loaded;
  } catch (err) {
    console.warn('Could not read wallet from Firestore:', err);
    return localWallet;
  }
}

/**
 * Fetch portfolio holdings from Firestore with localStorage fallback.
 */
export async function getFirestorePortfolio(userId: string): Promise<PortfolioDoc> {
  const localPortfolio = getCachedPortfolioSnapshot(userId);
  if (!canUseFirestore(userId)) {
    return localPortfolio;
  }

  try {
    const ref = doc(db, 'portfolios', userId);
    const snap = await withTimeout(getDoc(ref));
    if (!snap.exists()) return localPortfolio;
    const data = snap.data() as PortfolioDoc;
    const normalized: PortfolioDoc = {
      ...localPortfolio,
      ...data,
      holdings: Array.isArray(data.holdings) ? data.holdings : [],
    };
    writeLocalJson(`naytra_portfolio_${userId}`, normalized);
    return normalized;
  } catch (err) {
    console.warn('Could not read portfolio from Firestore (using local cache):', err);
    return localPortfolio;
  }
}

/**
 * Fetch recent orders from Firestore with localStorage fallback.
 */
export async function getFirestoreOrders(userId: string): Promise<OrderHistoryItem[]> {
  const cachedOrders = getCachedOrdersSnapshot(userId);
  if (!canUseFirestore(userId)) {
    return cachedOrders;
  }

  try {
    const ref = doc(db, 'orders', userId);
    const snap = await withTimeout(getDoc(ref));
    if (!snap.exists()) return cachedOrders;
    const data = snap.data() as OrderDoc;
    const list = Array.isArray(data.recent_orders) ? data.recent_orders : [];
    writeLocalJson(`naytra_orders_${userId}`, list);
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
  const cachedSymbols = readLocalJson<string[]>(`naytra_watchlist_${userId}`);
  if (!canUseFirestore(userId)) {
    return cachedSymbols || defaultSymbols;
  }

  try {
    const ref = doc(db, 'watchlists', userId);
    const snap = await withTimeout(getDoc(ref));
    if (!snap.exists()) return cachedSymbols || defaultSymbols;
    const data = snap.data() as WatchlistDoc;
    const symbols = Array.isArray(data.symbols) ? data.symbols : defaultSymbols;
    writeLocalJson(`naytra_watchlist_${userId}`, symbols);
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

  writeLocalJson(`naytra_watchlist_${userId}`, next);
  notifyUserFinancialsChanged(userId);

  if (canUseFirestore(userId)) {
    try {
      const ref = doc(db, 'watchlists', userId);
      await withTimeout(
        setDoc(
          ref,
          {
            user_id: userId,
            symbols: next,
            updated_at: Timestamp.now(),
          },
          { merge: true }
        )
      );
    } catch (err) {
      console.warn('Deferred syncing watchlist to Firestore:', err);
    }
  }
  return next;
}

export interface TradeOrderInput {
  symbol: string;
  name: string;
  side: 'BUY' | 'SELL';
  orderMode: 'Delivery' | 'Intraday';
  priceType: 'Market' | 'Limit';
  quantity: number;
  executionPriceInr: number;
}

/**
 * Executes a BUY or SELL equity order in integer paise.
 * Atomically updates portfolio holdings, double-entry ledger, wallet balance, and order history.
 */
export async function executeTradeInFirestore(
  userId: string,
  trade: TradeOrderInput
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

  const currentWallet = normalizeWalletDoc(userId, existingWallet);
  const currentCashPaise = currentWallet.balance_paise;

  if (trade.side === 'BUY' && totalPaise > currentCashPaise) {
    throw new Error('Insufficient balance to execute this buy order.');
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

  const nowIso = new Date().toISOString();
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
    description: `${trade.side} (${trade.orderMode}) ${qty} ${sym} @ ₹${trade.executionPriceInr.toFixed(2)}`,
    reference_id: executedOrder.order_id,
  });

  if (canUseFirestore(userId)) {
    try {
      const now = Timestamp.now();
      await withTimeout(
        Promise.all([
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
        ])
      );
    } catch (err) {
      console.warn('Deferred syncing portfolio/orders to Firestore (cached locally):', err);
    }
  }

  notifyUserFinancialsChanged(userId);

  return {
    wallet: nextWallet,
    portfolio: nextPortfolio,
    orders: nextOrders,
    executedOrder,
  };
}

/**
 * Deposit INR into wallet (1:1 original INR, no conversion).
 */
export async function executeWalletDepositInFirestore(
  userId: string,
  amountInr: number
): Promise<{
  wallet: WalletDoc;
  ledgerEntry: LedgerItemDoc;
}> {
  if (!Number.isFinite(amountInr) || amountInr < 1) {
    throw new Error('Minimum deposit is ₹1.00.');
  }
  if (amountInr > MAX_SINGLE_DEPOSIT_INR) {
    throw new Error(`Maximum single deposit is ₹${MAX_SINGLE_DEPOSIT_INR.toLocaleString('en-IN')}.`);
  }

  const amountPaise = Math.round(amountInr * 100);
  const currentWallet = await getFirestoreWallet(userId);
  const nextCashPaise = currentWallet.balance_paise + amountPaise;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);

  const ledgerEntry = await recordTransactionInLedger(userId, {
    type: 'DEPOSIT',
    amount_paise: amountPaise,
    balance_after_paise: nextCashPaise,
    description: `Deposited ₹${formattedAmount}`,
  });

  const updatedWallet = getCachedWalletSnapshot(userId);
  return {
    wallet: updatedWallet,
    ledgerEntry,
  };
}

/**
 * Withdraw INR from wallet (1:1 original INR, no conversion).
 */
export async function executeWalletWithdrawalInFirestore(
  userId: string,
  amountInr: number
): Promise<{
  wallet: WalletDoc;
  ledgerEntry: LedgerItemDoc;
}> {
  if (!Number.isFinite(amountInr) || amountInr < 1) {
    throw new Error('Minimum withdrawal is ₹1.00.');
  }

  const amountPaise = Math.round(amountInr * 100);
  const currentWallet = await getFirestoreWallet(userId);
  if (amountPaise > currentWallet.balance_paise) {
    const availableStr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(currentWallet.balance_paise / 100);
    throw new Error(`Insufficient balance. Available: ${availableStr}.`);
  }

  const nextCashPaise = currentWallet.balance_paise - amountPaise;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);

  const ledgerEntry = await recordTransactionInLedger(userId, {
    type: 'WITHDRAWAL',
    amount_paise: amountPaise,
    balance_after_paise: nextCashPaise,
    description: `Withdrew ₹${formattedAmount}`,
  });

  const updatedWallet = getCachedWalletSnapshot(userId);
  return {
    wallet: updatedWallet,
    ledgerEntry,
  };
}

/** Normalize raw Firestore ledger snapshot doc into LedgerItemDoc. */
export function normalizeLedgerDoc(id: string, data: Record<string, any>): LedgerItemDoc {
  const amountPaise = Number(data.amount_paise || 0);
  const balAfterPaise = Number(data.balance_after_paise || 0);
  return {
    id: data.id || id,
    tx_id: data.tx_id || '',
    user_id: data.user_id,
    username: data.username,
    account_type: data.account_type,
    type: data.type || 'UNKNOWN',
    description: data.description || '',
    debit_paise: Number(data.debit_paise || 0),
    credit_paise: Number(data.credit_paise || 0),
    amount_paise: amountPaise,
    balance_after_paise: balAfterPaise,
    is_credit: Boolean(data.is_credit),
    amount_inr: data.amount_inr ?? amountPaise / 100,
    balance_after_inr: data.balance_after_inr ?? balAfterPaise / 100,
    ref_id: data.ref_id || null,
    created_at: timestampToISO(data.created_at) || new Date().toISOString(),
  };
}

/**
 * Fetch double-entry ledger history from Firestore with local cache fallback.
 */
export async function getFirestoreLedger(userId: string): Promise<LedgerItemDoc[]> {
  const cachedLedger = readLocalJson<LedgerItemDoc[]>(`naytra_ledger_${userId}`);
  if (!canUseFirestore(userId)) {
    return getCachedLedgerSnapshot(userId);
  }

  try {
    const ledgerCol = collection(db, 'wallets', userId, 'ledger');
    const q = query(ledgerCol, orderBy('created_at', 'desc'));
    const snap = await withTimeout(getDocs(q));
    if (snap.empty) {
      if (cachedLedger && cachedLedger.length > 0) return cachedLedger;
      const defaultLedger = [buildDefaultSignupLedgerItem(userId)];
      writeLocalJson(`naytra_ledger_${userId}`, defaultLedger);
      return defaultLedger;
    }

    const items = snap.docs.map((d) => normalizeLedgerDoc(d.id, d.data()));
    writeLocalJson(`naytra_ledger_${userId}`, items);
    return items;
  } catch (err) {
    console.warn('Could not read ledger from Firestore:', err);
    return getCachedLedgerSnapshot(userId);
  }
}

/**
 * Subscribe to real-time Firestore snapshot updates for wallet, ledger, portfolio, orders, and watchlist.
 * Gracefully degrades if Firestore listeners fail or user is in offline/mock mode.
 */
export function subscribeFirestoreFinancials(
  userId: string,
  handlers: {
    onWallet?: (wallet: WalletDoc) => void;
    onLedger?: (items: LedgerItemDoc[]) => void;
    onPortfolio?: (portfolio: PortfolioDoc) => void;
    onOrders?: (orders: OrderHistoryItem[]) => void;
    onWatchlist?: (symbols: string[]) => void;
  }
): () => void {
  if (!canUseFirestore(userId)) {
    return () => {};
  }

  const unsubs: Array<() => void> = [];
  const ignoreErr = () => {
    /* fallback to cached state */
  };

  try {
    if (handlers.onWallet) {
      const cb = handlers.onWallet;
      unsubs.push(
        onSnapshot(
          doc(db, 'wallets', userId),
          (snap) => {
            if (snap.exists()) {
              const normalized = normalizeWalletDoc(userId, snap.data() as WalletDoc);
              writeLocalJson(`naytra_wallet_${userId}`, normalized);
              cb(normalized);
            }
          },
          ignoreErr
        )
      );
    }

    if (handlers.onLedger) {
      const cb = handlers.onLedger;
      const q = query(collection(db, 'wallets', userId, 'ledger'), orderBy('created_at', 'desc'));
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            if (!snap.empty) {
              const items = snap.docs.map((d) => normalizeLedgerDoc(d.id, d.data()));
              writeLocalJson(`naytra_ledger_${userId}`, items);
              cb(items);
            }
          },
          ignoreErr
        )
      );
    }

    if (handlers.onPortfolio) {
      const cb = handlers.onPortfolio;
      unsubs.push(
        onSnapshot(
          doc(db, 'portfolios', userId),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as PortfolioDoc;
              const base = getCachedPortfolioSnapshot(userId);
              const normalized: PortfolioDoc = {
                ...base,
                ...data,
                holdings: Array.isArray(data.holdings) ? data.holdings : [],
              };
              writeLocalJson(`naytra_portfolio_${userId}`, normalized);
              cb(normalized);
            }
          },
          ignoreErr
        )
      );
    }

    if (handlers.onOrders) {
      const cb = handlers.onOrders;
      unsubs.push(
        onSnapshot(
          doc(db, 'orders', userId),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as OrderDoc;
              const list = Array.isArray(data.recent_orders) ? data.recent_orders : [];
              writeLocalJson(`naytra_orders_${userId}`, list);
              cb(list);
            }
          },
          ignoreErr
        )
      );
    }

    if (handlers.onWatchlist) {
      const cb = handlers.onWatchlist;
      unsubs.push(
        onSnapshot(
          doc(db, 'watchlists', userId),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as WatchlistDoc;
              if (Array.isArray(data.symbols)) {
                writeLocalJson(`naytra_watchlist_${userId}`, data.symbols);
                cb(data.symbols);
              }
            }
          },
          ignoreErr
        )
      );
    }
  } catch {
    // Listeners optional in restricted/test environments
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    });
  };
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
      [
        `naytra_profile_${userId}`,
        `naytra_wallet_${userId}`,
        `naytra_ledger_${userId}`,
        `naytra_portfolio_${userId}`,
        `naytra_orders_${userId}`,
        `naytra_watchlist_${userId}`,
      ].forEach((k) => localStorage.removeItem(k));
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
