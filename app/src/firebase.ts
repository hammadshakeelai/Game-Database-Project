import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyARCWspCtZwl4UZXznJM9n7awtaBmLvOFw",
  authDomain: "gen-lang-client-0977588738.firebaseapp.com",
  projectId: "gen-lang-client-0977588738",
  storageBucket: "gen-lang-client-0977588738.firebasestorage.app",
  messagingSenderId: "416425494606",
  appId: "1:416425494606:web:b9e5a4c3f82f85cff75b1f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore — may fail at runtime if database doesn't exist
export const db = getFirestore(app);

/**
 * Flag that tracks whether Firestore is available.
 * Set to false when we detect the "database not found" error.
 */
export let firestoreAvailable = true;

export function setFirestoreUnavailable() {
  firestoreAvailable = false;
  console.warn('[Firebase] Firestore database not found — falling back to local storage.');
}
