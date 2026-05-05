import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UserProfile } from './types';

// Re-export for backward compatibility
export type { UserProfile };

// ============================================================
// Local Storage Keys
// ============================================================
const USERS_KEY = 'sttt_users';
const SESSION_KEY = 'sttt_session';

// ============================================================
// Local User Store (replaces Firebase Auth + Firestore)
// ============================================================

interface StoredUser {
  uid: string;
  email: string;
  passwordHash: string; // simple hash for demo purposes
  profile: UserProfile | null;
}

/** Simple string hash for password storage (NOT cryptographically secure — demo only) */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

function generateUID(): string {
  return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getStoredUsers(): Map<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const arr: StoredUser[] = JSON.parse(raw);
      const map = new Map<string, StoredUser>();
      arr.forEach(u => map.set(u.email, u));
      return map;
    }
  } catch {}
  return new Map();
}

function saveStoredUsers(users: Map<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(Array.from(users.values())));
}

function getSession(): { uid: string; email: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function setSession(session: { uid: string; email: string } | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ============================================================
// Public Auth API (mirrors Firebase Auth interface)
// ============================================================

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string | null;
}

export async function registerWithEmail(email: string, password: string): Promise<LocalUser> {
  const users = getStoredUsers();
  if (users.has(email.toLowerCase())) {
    throw { code: 'auth/email-already-in-use', message: 'This email is already registered.' };
  }

  const uid = generateUID();
  const newUser: StoredUser = {
    uid,
    email: email.toLowerCase(),
    passwordHash: simpleHash(password),
    profile: null,
  };
  users.set(email.toLowerCase(), newUser);
  saveStoredUsers(users);
  setSession({ uid, email: email.toLowerCase() });

  return { uid, email: email.toLowerCase(), displayName: null };
}

export async function loginWithEmail(email: string, password: string): Promise<LocalUser> {
  const users = getStoredUsers();
  const user = users.get(email.toLowerCase());
  if (!user) {
    throw { code: 'auth/user-not-found', message: 'No account found with this email.' };
  }
  if (user.passwordHash !== simpleHash(password)) {
    throw { code: 'auth/wrong-password', message: 'Incorrect password.' };
  }

  setSession({ uid: user.uid, email: user.email });
  return { uid: user.uid, email: user.email, displayName: user.profile?.username || null };
}

export function localSignOut() {
  setSession(null);
}

export function saveLocalProfile(uid: string, profile: UserProfile) {
  const users = getStoredUsers();
  for (const [email, user] of users) {
    if (user.uid === uid) {
      user.profile = profile;
      users.set(email, user);
      saveStoredUsers(users);
      return;
    }
  }
}

function getLocalProfile(uid: string): UserProfile | null {
  const users = getStoredUsers();
  for (const user of users.values()) {
    if (user.uid === uid) return user.profile;
  }
  return null;
}

// ============================================================
// Auth Context
// ============================================================

interface AuthContextType {
  user: LocalUser | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isLocalMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, profileLoading: false, isLocalMode: true
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser({ uid: session.uid, email: session.email, displayName: null });
      const p = getLocalProfile(session.uid);
      setProfile(p);
    }
    setLoading(false);
  }, []);

  // Listen for storage events (profile updates from other components)
  useEffect(() => {
    const handleStorageChange = () => {
      if (user) {
        const p = getLocalProfile(user.uid);
        if (p) setProfile(p);
      }
    };

    // Custom event for same-tab profile updates
    window.addEventListener('profile-updated', handleStorageChange);
    return () => window.removeEventListener('profile-updated', handleStorageChange);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, isLocalMode: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
