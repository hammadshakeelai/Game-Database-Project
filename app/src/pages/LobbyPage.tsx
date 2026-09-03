import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot, Plus, Users } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useSocket } from '../features/game/useSocket';
import { ERROR_COPY, type ErrorCode, type MatchView } from '../features/game/types';
import { Spinner } from '../components/Spinner';
import { AppShell } from '../components/AppShell';
import { ConnectionBanner } from '../components/ConnectionBanner';

type AckResponse = { ok: true; match: MatchView } | { ok: false; code: ErrorCode; message: string };

/** Home screen: start a game, join one, or play the computer. */
export default function LobbyPage() {
  const navigate = useNavigate();
  const { profile, recent, statsLoading, refreshStats } = useAuth();
  const { socket, connection, error: socketError } = useSocket();

  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | 'create' | 'bot' | 'join'>(null);

  // Stats may have changed while a game was played in another tab.
  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const ready = socket !== null && connection === 'connected';

  const createMatch = useCallback(
    (mode: 'pvp' | 'bot', botDifficulty?: number) => {
      if (!socket || pending) return;
      setPending(mode === 'bot' ? 'bot' : 'create');
      setJoinError(null);
      socket.emit('create_match', { mode, botDifficulty }, (res: AckResponse) => {
        setPending(null);
        if (res.ok) navigate(`/play/${res.match.id}`);
        else setJoinError(ERROR_COPY[res.code] ?? res.message);
      });
    },
    [socket, navigate, pending],
  );

  const joinMatch = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const trimmed = code.trim().toUpperCase();
      if (!socket || !trimmed || pending) return;
      setPending('join');
      setJoinError(null);
      socket.emit('join_match', { matchId: trimmed }, (res: AckResponse) => {
        setPending(null);
        if (res.ok) navigate(`/play/${res.match.id}`);
        else setJoinError(ERROR_COPY[res.code] ?? res.message);
      });
    },
    [socket, code, navigate, pending],
  );

  return (
    <AppShell title="Play">
      <div className="w-full">
        <ConnectionBanner connection={connection} error={socketError} />

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 grid gap-3 sm:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => createMatch('pvp')}
            disabled={!ready || pending !== null}
            className="group flex flex-col items-start gap-2 rounded-2xl bg-indigo-700 p-5 text-left shadow-lg shadow-slate-900/60 transition hover:-translate-y-0.5 hover:bg-indigo-600 active:translate-y-0 motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/15 text-slate-100">
              {pending === 'create' ? (
                <Spinner size="sm" inline label="Creating" />
              ) : (
                <Plus size={20} aria-hidden="true" />
              )}
            </span>
            <span className="text-lg font-semibold text-slate-100">Create a game</span>
            <span className="text-sm text-indigo-100/85">Get a code to share with a friend.</span>
          </button>

          <button
            type="button"
            onClick={() => createMatch('bot', 3)}
            disabled={!ready || pending !== null}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-700 bg-slate-800/60 p-5 text-left transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/60 text-slate-300">
              {pending === 'bot' ? (
                <Spinner size="sm" inline label="Starting" />
              ) : (
                <Bot size={20} aria-hidden="true" />
              )}
            </span>
            <span className="ttt-display text-lg font-semibold text-slate-100">
              Play the computer
            </span>
            <span className="text-sm text-slate-400">
              Practice on your own. Not counted in your record.
            </span>
          </button>
        </motion.section>

        <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Users size={18} aria-hidden="true" />
            Join with a code
          </h2>
          <form onSubmit={joinMatch} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="room-code" className="sr-only">
              Game code
            </label>
            <input
              id="room-code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={joinError !== null}
              aria-describedby={joinError ? 'join-error' : undefined}
              className="ttt-notation min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-center text-lg tracking-[0.3em] text-slate-100 placeholder:tracking-normal placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            <button
              type="submit"
              disabled={!ready || code.trim().length < 4 || pending !== null}
              className="rounded-xl bg-indigo-700 px-6 py-3 font-semibold text-slate-100 transition hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === 'join' ? 'Joining…' : 'Join'}
            </button>
          </form>
          {joinError && (
            <p id="join-error" role="alert" className="mt-3 text-sm text-red-300">
              {joinError}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">Your record</h2>
          {statsLoading && !profile ? (
            <Spinner label="Loading your record" />
          ) : (
            <>
              <dl className="mb-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:gap-3">
                <Stat label="Played" value={profile?.matchesPlayed ?? 0} />
                <Stat label="Won" value={profile?.wins ?? 0} tone="text-emerald-300" />
                <Stat label="Lost" value={profile?.losses ?? 0} tone="text-rose-300" />
                <Stat label="Drawn" value={profile?.draws ?? 0} />
              </dl>

              {recent.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No games yet. Create one and send the code to a friend.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {recent.slice(0, 5).map(match => (
                    <li
                      key={match.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate text-slate-300">vs {match.opponentName}</span>
                      <span
                        className={
                          match.outcome === 'win'
                            ? 'shrink-0 font-medium text-emerald-300'
                            : match.outcome === 'loss'
                              ? 'shrink-0 font-medium text-rose-300'
                              : 'shrink-0 font-medium text-slate-400'
                        }
                      >
                        {match.outcome === 'win'
                          ? 'Won'
                          : match.outcome === 'loss'
                            ? 'Lost'
                            : 'Drew'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-900/50 py-3">
      <dd className={`ttt-notation text-2xl font-semibold ${tone ?? 'text-slate-100'}`}>{value}</dd>
      <dt className="text-xs text-slate-500">{label}</dt>
    </div>
  );
}
