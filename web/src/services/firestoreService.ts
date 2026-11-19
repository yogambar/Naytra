/**
 * Firestore Service for Naytra.
 * Stores and manages user profiles, virtual wallets, and immutable double-entry ledger entries.
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

export interface WalletDoc {
  user_id: string;
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
 * Fetch user profile from Firestore users/{userId}.
 */
export async function getFirestoreUserProfile(userId: string): Promise<UserProfileData | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      id: data.id || userId,
      email: data.email || '',
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
  } catch (err) {
    console.warn('Error reading user profile from Firestore:', err);
    return null;
  }
}

/**
 * Initialize or sync user in Firestore.
 * If user does not exist in Firestore:
 *   - Creates users/{userId} with bonus_claimed: false
 *   - Creates wallets/{userId} with ₹10,000 (10,00,000 paise)
 *   - Creates wallets/{userId}/ledger/{tx_signup}
 *   - Returns { profile, isNewUser: true }
 * If user already exists:
 *   - Returns { profile, isNewUser: false }
 */
export async function syncOrInitFirestoreUser(
  user: { uid: string; email?: string | null; displayName?: string | null; emailVerified?: boolean },
  additional?: { name?: string; dob?: string; phone?: string; city?: string; terms_accepted?: boolean }
): Promise<{ profile: UserProfileData; isNewUser: boolean }> {
  const userId = user.uid;
  const userDocRef = doc(db, 'users', userId);

  try {
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data();
      // Update email_verified if it changed
      if (user.emailVerified && !data.email_verified) {
        await updateDoc(userDocRef, {
          email_verified: true,
          updated_at: Timestamp.now(),
        }).catch(() => null);
        data.email_verified = true;
      }

      return {
        profile: {
          id: data.id || userId,
          email: data.email || user.email || '',
          name: data.name || user.displayName || null,
          dob: data.dob || null,
          phone: data.phone || null,
          city: data.city || null,
          profile_complete: Boolean(data.profile_complete),
          email_verified: Boolean(data.email_verified || user.emailVerified),
          terms_accepted: Boolean(data.terms_accepted),
          bonus_claimed: Boolean(data.bonus_claimed),
          created_at: timestampToISO(data.created_at),
        },
        isNewUser: false,
      };
    }

    // ── NEW USER INITIALIZATION ──────────────────────────────────────────
    const now = Timestamp.now();
    const isProfileComplete = Boolean(additional?.dob && additional?.terms_accepted);

    const newUserDoc = {
      id: userId,
      email: (user.email || '').toLowerCase(),
      name: additional?.name?.trim() || user.displayName || null,
      dob: additional?.dob || null,
      phone: additional?.phone?.trim() || null,
      city: additional?.city?.trim() || null,
      profile_complete: isProfileComplete,
      email_verified: Boolean(user.emailVerified),
      terms_accepted: Boolean(additional?.terms_accepted),
      bonus_claimed: false, // STRICTLY FALSE FOR BRAND NEW USERS
      created_at: now,
      updated_at: now,
    };

    // 1. Create User Document
    await setDoc(userDocRef, newUserDoc);

    // 2. Create Virtual Wallet Document
    const walletDocRef = doc(db, 'wallets', userId);
    await setDoc(walletDocRef, {
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
      created_at: now,
      updated_at: now,
    });

    // 3. Create First Immutable Ledger Entry
    const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', `tx_signup_${userId}`);
    await setDoc(ledgerDocRef, {
      id: `tx_signup_${userId}`,
      tx_id: `tx_${Date.now()}_signup`,
      user_id: userId,
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

    return {
      profile: {
        id: userId,
        email: newUserDoc.email,
        name: newUserDoc.name,
        dob: newUserDoc.dob,
        phone: newUserDoc.phone,
        city: newUserDoc.city,
        profile_complete: newUserDoc.profile_complete,
        email_verified: newUserDoc.email_verified,
        terms_accepted: newUserDoc.terms_accepted,
        bonus_claimed: false,
        created_at: now.toDate().toISOString(),
      },
      isNewUser: true,
    };
  } catch (err) {
    console.error('Firestore user init error:', err);
    // Return local fallback so user is not blocked if rules not yet published
    return {
      profile: {
        id: userId,
        email: user.email || '',
        name: additional?.name || user.displayName || null,
        dob: additional?.dob || null,
        phone: additional?.phone || null,
        city: additional?.city || null,
        profile_complete: Boolean(additional?.dob && additional?.terms_accepted),
        email_verified: Boolean(user.emailVerified),
        terms_accepted: Boolean(additional?.terms_accepted),
        bonus_claimed: false,
        created_at: new Date().toISOString(),
      },
      isNewUser: true,
    };
  }
}

/**
 * Mark signup bonus as claimed in Firestore.
 */
export async function claimFirestoreBonus(userId: string): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await setDoc(
    userDocRef,
    {
      bonus_claimed: true,
      updated_at: Timestamp.now(),
    },
    { merge: true }
  );
}

/**
 * Complete profile details in Firestore (e.g. for Google users).
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
): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  const now = Timestamp.now();
  const currentUser = auth.currentUser;

  // Use setDoc with merge: true so it creates or updates seamlessly
  await setDoc(
    userDocRef,
    {
      id: userId,
      email: (currentUser?.email || '').toLowerCase(),
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

  // Ensure wallet and ledger exist as well
  try {
    const walletDocRef = doc(db, 'wallets', userId);
    const wSnap = await getDoc(walletDocRef);
    if (!wSnap.exists()) {
      await setDoc(walletDocRef, {
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
        created_at: now,
        updated_at: now,
      });

      const ledgerDocRef = doc(db, 'wallets', userId, 'ledger', `tx_signup_${userId}`);
      await setDoc(ledgerDocRef, {
        id: `tx_signup_${userId}`,
        tx_id: `tx_${Date.now()}_signup`,
        user_id: userId,
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
    }
  } catch (wErr) {
    console.warn('Could not ensure wallet in completeProfile:', wErr);
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
 * Deletes user's ledger entries, wallet, and user document from Firestore,
 * then deletes the user from Firebase Authentication.
 */
export async function deleteFirestoreUserAccount(userId: string): Promise<void> {
  try {
    // 1. Delete ledger entries
    const ledgerCol = collection(db, 'wallets', userId, 'ledger');
    const snap = await getDocs(ledgerCol);
    for (const d of snap.docs) {
      await deleteDoc(d.ref).catch(() => null);
    }

    // 2. Delete wallet document
    await deleteDoc(doc(db, 'wallets', userId)).catch(() => null);

    // 3. Delete user document
    await deleteDoc(doc(db, 'users', userId)).catch(() => null);

    // 4. Delete Firebase Auth user
    if (auth.currentUser && auth.currentUser.uid === userId) {
      await auth.currentUser.delete();
    }
  } catch (err) {
    console.error('Error deleting user account from Firestore:', err);
    throw err;
  }
}
