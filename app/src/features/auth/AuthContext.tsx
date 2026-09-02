import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  firebaseConfigured,
  getFirebaseAuth,
  signInWithGoogle,
  signOutUser,
} from '../../lib/firebase';

/**
 * Authentication state for the whole app.
 *
 * `status` is deliberately a single value rather than a pair of booleans, so a
 * screen can never render the signed-out view while auth is still resolving —
 * that flicker was one of the things the redesign set out to remove.
 */

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured';

export interface Profile {
  displayName: string;
  photoURL: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface RecentMatch {
  id: string;
  opponentName: string;
  outcome: 'win' | 'loss' | 'draw';
  movesCount: number;
  finishedAt: number;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  recent: RecentMatch[];
  statsLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Fresh ID token for the socket handshake, or null when signed out. */
  getToken: () => Promise<string | null>;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    firebaseConfigured ? 'loading' : 'unconfigured',
  );
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recent, setRecent] = useState<RecentMatch[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Read inside callbacks without making them depend on the user object.
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), next => {
      setUser(next);
      setStatus(next ? 'signed-in' : 'signed-out');
      if (!next) {
        setProfile(null);
        setRecent([]);
      }
    });
    return unsubscribe;
  }, []);

  const getToken = useCallback(async () => {
    const current = userRef.current;
    if (!current) return null;
    return current.getIdToken();
  }, []);

  const refreshStats = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    setStatsLoading(true);
    try {
      const token = await current.getIdToken();
      const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = (await res.json()) as {
        name: string;
        photoURL: string | null;
        profile: Omit<Profile, 'displayName' | 'photoURL'> | null;
        recent: RecentMatch[];
      };
      setProfile({
        displayName: data.name,
        photoURL: data.photoURL,
        matchesPlayed: data.profile?.matchesPlayed ?? 0,
        wins: data.profile?.wins ?? 0,
        losses: data.profile?.losses ?? 0,
        draws: data.profile?.draws ?? 0,
      });
      setRecent(data.recent ?? []);
    } catch {
      // Stats are supporting information; a failure here must not block play.
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load stats once the user is known.
  useEffect(() => {
    if (status === 'signed-in') void refreshStats();
  }, [status, refreshStats]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile,
      recent,
      statsLoading,
      signIn: signInWithGoogle,
      signOut: signOutUser,
      getToken,
      refreshStats,
    }),
    [status, user, profile, recent, statsLoading, getToken, refreshStats],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
