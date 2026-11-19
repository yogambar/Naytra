import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, nativeOrWebGoogleSignIn } from '../lib/firebase';
import {
  getFirestoreUserProfile,
  syncOrInitFirestoreUser,
  claimFirestoreBonus,
  completeFirestoreUserProfile,
  deleteFirestoreUserAccount,
} from '../services/firestoreService';
import { hapticSuccess, hapticError } from '../utils/haptics';

export interface UserProfileData {
  id: string;
  email: string;
  name: string | null;
  dob: string | null;
  phone: string | null;
  city: string | null;
  profile_complete: boolean;
  email_verified: boolean;
  terms_accepted: boolean;
  bonus_claimed: boolean;
  created_at: string | null;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  idToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ bonusClaimed: boolean }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    dob: string,
    phone?: string,
    city?: string
  ) => Promise<{ isNewUser: boolean }>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean; profileComplete: boolean; bonusClaimed: boolean } | null>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  completeUserProfile: (data: {
    name: string;
    dob: string;
    phone?: string;
    city?: string;
    terms_accepted: boolean;
  }) => Promise<void>;
  claimBonus: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<UserProfileData | null>;
  logout: () => Promise<void>;
  // Mock login helper for testing and offline environments
  loginWithMockUser: (uid?: string, email?: string, verified?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function formatFirebaseError(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const code = 'code' in err ? String((err as { code: unknown }).code) : '';
  const message = 'message' in err ? String((err as { message: unknown }).message) : '';

  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'Email/Password sign-in is not enabled in Firebase Console. Please go to Authentication > Sign-in method in Firebase Console and enable the Email/Password provider.';
  }
  if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completing. Please try again.';
  }
  if (code === 'auth/cancelled-popup-request' || message.includes('cancelled-popup-request')) {
    return 'Google sign-in popup request was cancelled.';
  }
  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return 'This domain is not authorized in Firebase Console. Please add localhost to Authorized Domains under Authentication > Settings.';
  }
  if (code === 'auth/api-key-not-valid' || message.includes('api-key-not-valid') || code === 'auth/invalid-api-key') {
    return 'Invalid Firebase API key. Please verify your Firebase project credentials in web/.env.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please try again.';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'Network error connecting to Firebase. Please check your internet connection.';
  }
  return err instanceof Error ? err.message : fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch user profile: Primary source is Firestore, with backend fallback
  const fetchUserProfile = useCallback(async (fbUser: User): Promise<UserProfileData | null> => {
    try {
      // 1. Try Firestore direct
      let p = await getFirestoreUserProfile(fbUser.uid);
      if (!p) {
        // Doc not found in Firestore -> initialize it
        const initResult = await syncOrInitFirestoreUser(fbUser);
        p = initResult.profile;
      }
      return p;
    } catch (firestoreErr) {
      console.warn('Firestore profile fetch failed, trying backend API:', firestoreErr);
      // 2. Fallback to API if available
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch(`${API_BASE}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) return json.data as UserProfileData;
        }
      } catch (apiErr) {
        console.warn('Backend API profile fetch also failed:', apiErr);
      }
      return null;
    }
  }, []);

  // Refresh profile from Firestore
  const refreshProfile = useCallback(async (): Promise<UserProfileData | null> => {
    if (!auth.currentUser) return null;
    const p = await fetchUserProfile(auth.currentUser);
    if (p) setProfile(p);
    return p;
  }, [fetchUserProfile]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    let isMounted = true;

    // Check for local test / demo mock token
    if (typeof window !== 'undefined') {
      const storedMock = localStorage.getItem('naytra_mock_token');
      if (storedMock) {
        setIdToken(storedMock);
        const parts = storedMock.split(':');
        const uid = parts[1] || 'mock_uid_1';
        const email = parts[2] || 'trader@example.com';
        setProfile({
          id: uid,
          email,
          name: 'Mock Trader',
          dob: '1995-01-01',
          phone: null,
          city: null,
          profile_complete: true,
          email_verified: true,
          terms_accepted: true,
          bonus_claimed: true,
          created_at: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      setUser(fbUser);

      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          if (isMounted) setIdToken(token);
          const p = await fetchUserProfile(fbUser);
          if (isMounted && p) setProfile(p);
        } catch (err) {
          console.error('Error in onAuthStateChanged:', err);
        }
      } else {
        if (!idToken?.startsWith('mock-token:')) {
          setIdToken(null);
          setProfile(null);
        }
      }
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserProfile, idToken]);

  // Sign In with Email & Password
  const signInWithEmailHandler = useCallback(async (email: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const token = await cred.user.getIdToken();
      setIdToken(token);

      const p = await fetchUserProfile(cred.user);
      if (p) setProfile(p);
      hapticSuccess();
      return { bonusClaimed: Boolean(p?.bonus_claimed) };
    } catch (err: unknown) {
      hapticError();
      const friendly = formatFirebaseError(err, 'Invalid email or password. Please try again.');
      setError(friendly);
      throw new Error(friendly);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  // Sign Up with Email & Password
  const signUpWithEmailHandler = useCallback(
    async (
      email: string,
      pass: string,
      name: string,
      dob: string,
      phone?: string,
      city?: string
    ) => {
      setError(null);
      setIsLoading(true);
      try {
        // Step 1: Create Firebase account
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);

        // Step 2: Send email verification (fire-and-forget)
        sendEmailVerification(cred.user).catch((verifyErr) =>
          console.warn('Could not send verification email:', verifyErr)
        );

        const token = await cred.user.getIdToken();
        setIdToken(token);

        // Step 3: Write user, wallet, and ledger directly to Firestore
        const initResult = await syncOrInitFirestoreUser(cred.user, {
          name: name.trim(),
          dob,
          phone: phone?.trim(),
          city: city?.trim(),
          terms_accepted: true,
        });

        setProfile(initResult.profile);

        // Best effort: notify backend if running
        fetch(`${API_BASE}/api/v1/auth/complete-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            dob,
            phone: phone?.trim() || null,
            city: city?.trim() || null,
            terms_accepted: true,
          }),
        }).catch(() => null);

        hapticSuccess();
        return { isNewUser: true };
      } catch (err: unknown) {
        hapticError();
        const friendly = formatFirebaseError(err, 'Registration failed');
        setError(friendly);
        throw new Error(friendly);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Google Sign In (Universal Native + Web)
  const signInWithGoogleHandler = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await nativeOrWebGoogleSignIn();
      if (cred?.user) {
        const token = await cred.user.getIdToken();
        setIdToken(token);

        // Check if user has an existing profile in Firestore or local cache
        let p = await getFirestoreUserProfile(cred.user.uid);
        let isNewUser = false;

        if (!p) {
          const result = await syncOrInitFirestoreUser(cred.user);
          p = result.profile;
          isNewUser = true;
        } else {
          // If profile is not complete, treat as first-time onboarding
          isNewUser = !p.profile_complete;
        }

        setProfile(p);
        hapticSuccess();
        return {
          isNewUser,
          profileComplete: Boolean(p?.profile_complete),
          bonusClaimed: Boolean(p?.bonus_claimed),
        };
      }
      return null;
    } catch (err: unknown) {
      hapticError();
      const friendly = formatFirebaseError(err, 'Google sign-in was canceled or failed. Please try again.');
      setError(friendly);
      throw new Error(friendly);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send Password Reset Email
  const sendPasswordResetHandler = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      hapticSuccess();
    } catch {
      // Enumeration safe
      hapticSuccess();
    }
  }, []);

  // Resend Email Verification
  const resendVerificationEmailHandler = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      hapticSuccess();
    }
  }, []);

  // Complete User Profile (e.g. for Google sign-in users)
  const completeUserProfileHandler = useCallback(
    async (data: { name: string; dob: string; phone?: string; city?: string; terms_accepted: boolean }) => {
      if (!auth.currentUser) throw new Error('Not authenticated');
      setError(null);
      setIsLoading(true);
      try {
        const updated = await completeFirestoreUserProfile(auth.currentUser.uid, data);
        setProfile(updated);

        // Best-effort backend notification
        if (idToken) {
          fetch(`${API_BASE}/api/v1/auth/complete-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(data),
          }).catch(() => null);
        }

        hapticSuccess();
      } catch (err: unknown) {
        hapticError();
        const msg = err instanceof Error ? err.message : 'Error completing profile';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [idToken]
  );

  // Claim Signup Bonus
  const claimBonusHandler = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      await claimFirestoreBonus(auth.currentUser.uid);
      setProfile((prev) => (prev ? { ...prev, bonus_claimed: true } : null));

      // Best effort backend notification
      if (idToken) {
        fetch(`${API_BASE}/api/v1/auth/claim-bonus`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        }).catch(() => null);
      }
    } catch (err) {
      console.warn('Error claiming bonus in Firestore:', err);
      setProfile((prev) => (prev ? { ...prev, bonus_claimed: true } : null));
    }
  }, [idToken]);

  // Delete User Account
  const deleteAccountHandler = useCallback(async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    setIsLoading(true);
    try {
      await deleteFirestoreUserAccount(uid);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('naytra_mock_token');
      }
      setUser(null);
      setProfile(null);
      setIdToken(null);
      hapticSuccess();
    } catch (err) {
      hapticError();
      console.error('Delete account failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logoutHandler = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('naytra_mock_token');
      }
      if (idToken) {
        fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        }).catch(() => null);
      }
      await signOut(auth);
    } finally {
      setUser(null);
      setProfile(null);
      setIdToken(null);
      hapticSuccess();
    }
  }, [idToken]);

  // Mock login for offline testing and Vitest suites
  const loginWithMockUser = useCallback(
    async (uid: string = 'mock_uid_1', email: string = 'trader@example.com', verified: boolean = true) => {
      const mockToken = `mock-token:${uid}:${email}:${verified}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('naytra_mock_token', mockToken);
      }
      setIdToken(mockToken);
      setProfile({
        id: uid,
        email,
        name: 'Mock Trader',
        dob: '1995-01-01',
        phone: null,
        city: null,
        profile_complete: true,
        email_verified: verified,
        terms_accepted: true,
        bonus_claimed: true,
        created_at: new Date().toISOString(),
      });
      setIsLoading(false);
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      idToken,
      isLoading,
      isAuthenticated: Boolean(user || idToken),
      error,
      clearError,
      signInWithEmail: signInWithEmailHandler,
      signUpWithEmail: signUpWithEmailHandler,
      signInWithGoogle: signInWithGoogleHandler,
      sendPasswordReset: sendPasswordResetHandler,
      resendVerificationEmail: resendVerificationEmailHandler,
      completeUserProfile: completeUserProfileHandler,
      claimBonus: claimBonusHandler,
      deleteAccount: deleteAccountHandler,
      refreshProfile,
      logout: logoutHandler,
      loginWithMockUser,
    }),
    [
      user,
      profile,
      idToken,
      isLoading,
      error,
      clearError,
      signInWithEmailHandler,
      signUpWithEmailHandler,
      signInWithGoogleHandler,
      sendPasswordResetHandler,
      resendVerificationEmailHandler,
      completeUserProfileHandler,
      claimBonusHandler,
      deleteAccountHandler,
      refreshProfile,
      logoutHandler,
      loginWithMockUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

