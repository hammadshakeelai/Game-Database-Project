import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from 'firebase/auth';

/**
 * Firebase client setup.
 *
 * The web config is a set of public identifiers rather than secrets — it ships
 * in the bundle by design — but it lives in env vars so the same build can point
 * at a different project without a code change.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when the app has enough configuration to attempt a sign-in. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.authDomain);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured. See .env.example.');
  }

  app = initializeApp(config);
  authInstance = getAuth(app);

  const emulatorHost = import.meta.env.VITE_AUTH_EMULATOR_HOST;
  if (emulatorHost) {
    connectAuthEmulator(authInstance, `http://${emulatorHost}`, { disableWarnings: true });
  }

  // Keep the session across reloads so a refresh mid-game does not sign the
  // player out. Failures here are non-fatal: the SDK falls back to in-memory.
  void setPersistence(authInstance, browserLocalPersistence).catch(() => {});

  return authInstance;
}

const googleProvider = new GoogleAuthProvider();
// Always let the player pick which Google account to use.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export type SignInFailure =
  | 'popup-blocked'
  | 'cancelled'
  | 'unauthorized-domain'
  | 'network'
  | 'unknown';

export class SignInError extends Error {
  constructor(readonly kind: SignInFailure, message: string) {
    super(message);
    this.name = 'SignInError';
  }
}

/**
 * Sign in with Google.
 *
 * Popups are the better experience but are blocked in some browsers and in
 * embedded webviews, so fall back to a redirect rather than dead-ending.
 */
export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';

    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new SignInError('cancelled', 'Sign-in was cancelled.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new SignInError(
        'unauthorized-domain',
        'This site is not authorised for sign-in. Add its domain to Firebase Authentication settings.',
      );
    }
    if (code === 'auth/network-request-failed') {
      throw new SignInError('network', 'Could not reach the sign-in service. Check your connection.');
    }
    throw new SignInError('unknown', 'Sign-in failed. Please try again.');
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * Test-only sign-in bridge.
 *
 * End-to-end tests need a signed-in session, but automating Google's real OAuth
 * screens would be both fragile and inappropriate. Instead the tests run against
 * the Firebase Auth emulator and call this.
 *
 * This is installed ONLY when VITE_AUTH_EMULATOR_HOST is set, which is never
 * true in a production build — so the bridge cannot exist in a deployed app.
 */
if (import.meta.env.VITE_AUTH_EMULATOR_HOST) {
  (window as unknown as Record<string, unknown>).__signInForTests = async (
    email: string,
    password: string,
  ) => {
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } =
      await import('firebase/auth');
    const auth = getFirebaseAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: email.split('@')[0] });
    }
  };
}
