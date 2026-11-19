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

export interface PortfolioDoc {
  user_id: string;
  username?: string;
  holdings: Array<{
    symbol: string;
    quantity: number;
    avg_price_paise: number;
    invested_paise: number;
  }>;
  total_invested_paise: number;
  current_value_paise: number;
  realized_pnl_paise: number;
  unrealized_pnl_paise: number;
  created_at: any;
  updated_at: any;
}

export interface OrderDoc {
  user_id: string;
  username?: string;
  orders_count: number;
  recent_orders: Array<Record<string, any>>;
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
 * Fetch portfolio data from Firestore or local fallback cache.
 */
export async function getFirestorePortfolio(userId: string): Promise<PortfolioDoc | null> {
  let cached: PortfolioDoc | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_portfolio_${userId}`);
    if (raw) {
      try { cached = JSON.parse(raw); } catch {}
    }
  }

  try {
    const portRef = doc(db, 'portfolios', userId);
    const snap = await getDoc(portRef);
    if (!snap.exists()) return cached;
    const data = snap.data() as PortfolioDoc;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_portfolio_${userId}`, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    console.warn('Could not read portfolio from Firestore (using cache):', err);
    return cached;
  }
}

/**
 * Fetch recent orders from Firestore or local fallback cache.
 */
export async function getFirestoreOrders(userId: string): Promise<Array<Record<string, any>>> {
  let cached: Array<Record<string, any>> = [];
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_orders_${userId}`);
    if (raw) {
      try { cached = JSON.parse(raw); } catch {}
    }
  }

  try {
    const ordRef = doc(db, 'orders', userId);
    const snap = await getDoc(ordRef);
    if (!snap.exists()) return cached;
    const data = snap.data();
    const orders = data.recent_orders || [];
    if (typeof window !== 'undefined') {
      localStorage.setItem(`naytra_orders_${userId}`, JSON.stringify(orders));
    }
    return orders;
  } catch (err) {
    console.warn('Could not read orders from Firestore (using cache):', err);
    return cached;
  }
}

/**
 * Executes a simulated paper trade with full double-entry ledger integrity:
 * 1. Updates wallets/{userId} (cash balance)
 * 2. Appends to wallets/{userId}/ledger/{txId}
 * 3. Updates portfolios/{userId} (holdings array & invested paise)
 * 4. Appends to orders/{userId} (order history)
 */
export async function executePaperTrade(
  userId: string,
  trade: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price_paise: number;
  }
): Promise<{ success: boolean; message: string; balance_after_paise: number }> {
  const currentWallet = await getFirestoreWallet(userId) || {
    balance_paise: SIGNUP_BONUS_PAISE,
    total_cash_paise: SIGNUP_BONUS_PAISE,
  };

  const currentPortfolio = await getFirestorePortfolio(userId) || {
    user_id: userId,
    holdings: [],
    total_invested_paise: 0,
    current_value_paise: 0,
    realized_pnl_paise: 0,
    unrealized_pnl_paise: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const holdings = [...(currentPortfolio.holdings || [])];
  const holdingIdx = holdings.findIndex((h) => h.symbol === trade.symbol);
  const totalAmountPaise = trade.quantity * trade.price_paise;

  let newBalancePaise = currentWallet.total_cash_paise;

  if (trade.side === 'BUY') {
    if (totalAmountPaise > currentWallet.total_cash_paise) {
      return { success: false, message: 'Insufficient virtual funds', balance_after_paise: currentWallet.total_cash_paise };
    }
    newBalancePaise = currentWallet.total_cash_paise - totalAmountPaise;

    if (holdingIdx >= 0) {
      const existing = holdings[holdingIdx];
      const newQty = existing.quantity + trade.quantity;
      const newInvested = existing.invested_paise + totalAmountPaise;
      holdings[holdingIdx] = {
        symbol: trade.symbol,
        quantity: newQty,
        invested_paise: newInvested,
        avg_price_paise: Math.round(newInvested / newQty),
      };
    } else {
      holdings.push({
        symbol: trade.symbol,
        quantity: trade.quantity,
        invested_paise: totalAmountPaise,
        avg_price_paise: trade.price_paise,
      });
    }
  } else {
    // SELL
    if (holdingIdx < 0 || holdings[holdingIdx].quantity < trade.quantity) {
      return { success: false, message: `You do not own enough shares of ${trade.symbol}`, balance_after_paise: currentWallet.total_cash_paise };
    }
    newBalancePaise = currentWallet.total_cash_paise + totalAmountPaise;
    const existing = holdings[holdingIdx];
    const newQty = existing.quantity - trade.quantity;

    if (newQty === 0) {
      holdings.splice(holdingIdx, 1);
    } else {
      const newInvested = newQty * existing.avg_price_paise;
      holdings[holdingIdx] = {
        symbol: trade.symbol,
        quantity: newQty,
        invested_paise: newInvested,
        avg_price_paise: existing.avg_price_paise,
      };
    }
  }

  const totalInvestedPaise = holdings.reduce((sum, h) => sum + h.invested_paise, 0);
  const updatedPortfolio: PortfolioDoc = {
    ...currentPortfolio,
    holdings,
    total_invested_paise: totalInvestedPaise,
    updated_at: new Date().toISOString(),
  };

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderRecord = {
    id: orderId,
    order_id: orderId,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price_paise: trade.price_paise,
    price_inr: trade.price_paise / 100,
    total_paise: totalAmountPaise,
    total_inr: totalAmountPaise / 100,
    status: 'FILLED',
    executed_at: new Date().toISOString(),
  };

  // 1. Update local cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(`naytra_portfolio_${userId}`, JSON.stringify(updatedPortfolio));
    const prevOrders = JSON.parse(localStorage.getItem(`naytra_orders_${userId}`) || '[]');
    const nextOrders = [orderRecord, ...prevOrders].slice(0, 30);
    localStorage.setItem(`naytra_orders_${userId}`, JSON.stringify(nextOrders));
  }

  // 2. Write to Firestore
  try {
    const now = Timestamp.now();

    // 1) Ledger
    const txId = `tx_${Date.now()}_trade`;
    const ledgerRef = doc(db, 'wallets', userId, 'ledger', txId);
    await setDoc(ledgerRef, {
      id: txId,
      tx_id: txId,
      user_id: userId,
      account_type: 'USER_CASH',
      type: trade.side === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
      description: `Paper ${trade.side} ${trade.quantity} ${trade.symbol} @ ₹${(trade.price_paise/100).toFixed(2)}`,
      debit_paise: trade.side === 'BUY' ? totalAmountPaise : 0,
      credit_paise: trade.side === 'SELL' ? totalAmountPaise : 0,
      amount_paise: totalAmountPaise,
      amount_inr: totalAmountPaise / 100,
      balance_after_paise: newBalancePaise,
      balance_after_inr: newBalancePaise / 100,
      is_credit: trade.side === 'SELL',
      ref_id: orderId,
      created_at: now,
    });

    // 2) Wallet
    const walletRef = doc(db, 'wallets', userId);
    await setDoc(walletRef, {
      balance_paise: newBalancePaise,
      total_cash_paise: newBalancePaise,
      balance_inr: newBalancePaise / 100,
      total_cash_inr: newBalancePaise / 100,
      updated_at: now,
    }, { merge: true });

    // 3) Portfolio
    const portRef = doc(db, 'portfolios', userId);
    await setDoc(portRef, {
      ...updatedPortfolio,
      updated_at: now,
    }, { merge: true });

    // 4) Orders
    const ordRef = doc(db, 'orders', userId);
    const existingOrders = await getFirestoreOrders(userId);
    const updatedOrders = [orderRecord, ...existingOrders].slice(0, 30);
    await setDoc(ordRef, {
      orders_count: updatedOrders.length,
      recent_orders: updatedOrders,
      updated_at: now,
    }, { merge: true });

  } catch (err) {
    console.warn('Deferred write to Firestore for trade (cached locally):', err);
  }

  return {
    success: true,
    message: `Executed ${trade.side} for ${trade.quantity} ${trade.symbol} at ₹${(trade.price_paise/100).toFixed(2)}`,
    balance_after_paise: newBalancePaise,
  };
}

/**
 * Updates user profile details (phone, city, name) in Firestore.
 */
export async function updateFirestoreUserProfile(
  userId: string,
  updates: { name?: string; phone?: string; city?: string }
): Promise<void> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`naytra_profile_${userId}`);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        const updated = { ...p, ...updates };
        localStorage.setItem(`naytra_profile_${userId}`, JSON.stringify(updated));
      } catch {}
    }
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updated_at: Timestamp.now(),
    });
  } catch (err) {
    console.warn('Deferred Firestore profile update (cached locally):', err);
  }
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
 * Fetch wallet data from Firestore.
 */
export async function getFirestoreWallet(userId: string): Promise<WalletDoc | null> {
  try {
    const walletRef = doc(db, 'wallets', userId);
    const snap = await getDoc(walletRef);
    if (!snap.exists()) return null;
    return snap.data() as WalletDoc;
  } catch (err) {
    console.warn('Could not read wallet from Firestore:', err);
    return null;
  }
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
