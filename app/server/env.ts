import 'dotenv/config';

/**
 * Centralised environment access, so nothing else in the server reads
 * `process.env` directly and every default is visible in one place.
 */

export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

/** Hosting platforms inject PORT; never hard-code it. */
export const PORT = Number(process.env.PORT) || 3000;

/**
 * Comma-separated allowlist of browser origins permitted to open a socket.
 * In development every origin is allowed so LAN testing from a phone works.
 */
export const clientOrigins: string[] = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

/**
 * Service-account JSON for firebase-admin, supplied as a single-line env var.
 * Absent in local development, where the Auth emulator is used instead.
 */
export const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT ?? '';

/** Set by the Firebase emulator suite; presence means "use emulators". */
export const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
export const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
export const usingEmulators = Boolean(authEmulatorHost || firestoreEmulatorHost);

/**
 * Project id. Real deployments take it from the service account; emulator runs
 * take it from GCLOUD_PROJECT so the admin SDK has something to address.
 */
export const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  (serviceAccountJson ? (JSON.parse(serviceAccountJson).project_id as string) : '') ||
  'demo-super-ttt';
