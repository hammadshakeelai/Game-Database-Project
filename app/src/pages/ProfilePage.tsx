import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth, type RecentMatch } from '../features/auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { Spinner } from '../components/Spinner';
import { cn } from '../utils';

interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  recent: RecentMatch[];
}

/**
 * A player's record. `/me` shows your own; `/players/:uid` shows anyone's.
 *
 * Laid out as a results sheet rather than a profile card: the numbers and the
 * game list are what someone came for.
 */
export default function ProfilePage({ self = false }: { self?: boolean }) {
  const { uid: routeUid } = useParams<{ uid: string }>();
  const { getToken, user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  const uid = self ? user?.uid : routeUid;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/players/${encodeURIComponent(uid)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          if (!cancelled) setState('missing');
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as PublicProfile;
        if (!cancelled) {
          setProfile(data);
          setState('ready');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, getToken]);

  if (state === 'loading') {
    return (
      <AppShell title="Profile">
        <Spinner label="Loading the record" />
      </AppShell>
    );
  }

  if (state === 'missing' || !profile) {
    return (
      <AppShell title="Profile">
        <h1 className="ttt-display mb-2 text-2xl font-semibold text-slate-100">
          {state === 'error' ? 'Could not load that player' : 'No such player'}
        </h1>
        <p className="mb-5 text-sm text-slate-400">
          {state === 'error'
            ? 'Something went wrong fetching the record.'
            : 'That player has not played a game here.'}
        </p>
        <Link to="/leaderboard" className="text-sm text-indigo-300 hover:underline">
          Back to standings
        </Link>
      </AppShell>
    );
  }

  const isYou = profile.uid === user?.uid;

  return (
    <AppShell title="Profile">
      <header className="mb-6 flex items-center gap-4">
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-slate-600 sm:h-16 sm:w-16"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-700 text-2xl font-semibold text-slate-300 sm:h-16 sm:w-16">
            {profile.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="ttt-display truncate text-2xl font-semibold text-slate-100">
            {profile.displayName}
            {isYou && <span className="ml-2 text-base text-slate-500">(you)</span>}
          </h1>
          <p className="ttt-notation text-sm text-indigo-300">
            {profile.elo} rating
            <span className="ml-2 text-slate-500">
              · {profile.matchesPlayed} {profile.matchesPlayed === 1 ? 'game' : 'games'}
            </span>
          </p>
        </div>
      </header>

      <dl className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat label="Rating" value={profile.elo} tone="text-indigo-300" />
        <Stat label="Won" value={profile.wins} tone="text-emerald-300" />
        <Stat label="Lost" value={profile.losses} tone="text-rose-300" />
        <Stat label="Drawn" value={profile.draws} />
      </dl>

      <h2 className="mb-3 text-lg font-semibold text-slate-100">Recent games</h2>

      {profile.recent.length === 0 ? (
        <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-6 text-center text-sm text-slate-400">
          {isYou
            ? 'No games yet. Create one and send the code to a friend.'
            : 'No finished games yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-700/60 overflow-hidden rounded-lg border border-slate-700">
          {profile.recent.map(match => (
            <li
              key={match.id}
              className="flex items-center justify-between gap-3 bg-slate-800/40 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Outcome outcome={match.outcome} />
                <div className="min-w-0">
                  <Link
                    to={`/players/${match.opponentUid}`}
                    className="block truncate text-sm text-slate-200 hover:text-indigo-300"
                  >
                    {match.opponentName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {match.movesCount} moves
                    {match.reason === 'resign' && ' · by resignation'}
                    {match.reason === 'agreement' && ' · by agreement'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {match.eloDelta !== null && (
                  <span
                    className={cn(
                      'ttt-notation text-sm',
                      match.eloDelta > 0
                        ? 'text-emerald-300'
                        : match.eloDelta < 0
                          ? 'text-rose-300'
                          : 'text-slate-500',
                    )}
                  >
                    {match.eloDelta > 0 ? '+' : ''}
                    {match.eloDelta}
                  </span>
                )}
                <Link
                  to={`/review/${match.id}`}
                  className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-400 hover:text-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                >
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 py-3 text-center">
      <dd className={cn('ttt-notation text-xl font-semibold', tone ?? 'text-slate-100')}>
        {value}
      </dd>
      <dt className="text-xs text-slate-500">{label}</dt>
    </div>
  );
}

/** Outcome is stated in a word as well as a colour. */
function Outcome({ outcome }: { outcome: 'win' | 'loss' | 'draw' }) {
  const map = {
    win: { text: 'Won', cls: 'border-emerald-400/50 text-emerald-300' },
    loss: { text: 'Lost', cls: 'border-rose-400/50 text-rose-300' },
    draw: { text: 'Drew', cls: 'border-slate-500/60 text-slate-400' },
  } as const;
  const { text, cls } = map[outcome];
  return (
    <span
      className={cn(
        'ttt-notation w-12 shrink-0 rounded border px-1.5 py-0.5 text-center text-[11px]',
        cls,
      )}
    >
      {text}
    </span>
  );
}
