import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { projectId, serviceAccountJson, usingEmulators } from './env.js';

/**
 * firebase-admin bootstrap.
 *
 * Three supported modes:
 *  - production: a service account supplied via FIREBASE_SERVICE_ACCOUNT
 *  - local/CI:   the Firebase emulator suite (no credential needed; the admin
 *                SDK talks to the emulator hosts named in the environment)
 *  - degraded:   neither is configured, in which case the server still runs but
 *                refuses socket connections rather than trusting unverified ids
 */

let app: App | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

/** True when tokens can actually be verified. */
export const adminConfigured = Boolean(serviceAccountJson) || usingEmulators;

function getApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  if (serviceAccountJson) {
    app = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)), projectId });
  } else {
    // Emulator mode. The admin SDK routes to the emulator hosts and does not
    // validate the credential, so a project id alone is sufficient.
    app = initializeApp({ projectId });
  }
  return app;
}

export function adminAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

export function adminDb(): Firestore {
  if (!firestoreInstance) firestoreInstance = getFirestore(getApp());
  return firestoreInstance;
}

export interface VerifiedUser {
  uid: string;
  name: string;
  picture: string | null;
  email: string | null;
}

/**
 * Verify a Firebase ID token and return the identity the server will trust.
 *
 * This is the only place a `uid` enters the system. Socket handlers read it
 * from `socket.data`, never from their own payloads.
 */
export async function verifyIdToken(token: string): Promise<VerifiedUser> {
  const decoded = await adminAuth().verifyIdToken(token);
  return {
    uid: decoded.uid,
    // Fall back to a stable, non-identifying label rather than an empty string,
    // so the UI always has something to render.
    name: (decoded.name as string) || decoded.email?.split('@')[0] || 'Player',
    picture: (decoded.picture as string) || null,
    email: decoded.email ?? null,
  };
}
