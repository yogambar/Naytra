import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCyX6zu3cZWtoowugdsPQWP3Jv4pIOLV-o',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'naytra-53238.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'naytra-53238',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'naytra-53238.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '933392757711',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:933392757711:web:a0a326f6958a75c801d8ba',
};

// Initialize Firebase only once
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connect to Auth emulator if configured in environment
const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
if (emulatorHost) {
  const [host, port] = emulatorHost.split(':');
  connectAuthEmulator(auth, `http://${host || 'localhost'}:${port || 9099}`, { disableWarnings: true });
}

/**
 * Universal Google Sign-In helper.
 * On Native Android (Capacitor): Uses native Google Sign-in to avoid WebView blocks.
 * On Web: Uses standard Firebase popup flow.
 */
export async function nativeOrWebGoogleSignIn(): Promise<UserCredential | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        return await signInWithCredential(auth, credential);
      }
      return null;
    } catch (err) {
      console.error('Native Google sign-in failed:', err);
      throw err;
    }
  } else {
    // Web popup flow
    return await signInWithPopup(auth, googleProvider);
  }
}
