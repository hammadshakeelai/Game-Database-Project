import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Loader2, Plus, Swords, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useSocket } from '../features/game/useSocket';
import { ERROR_COPY, type ErrorCode, type MatchView } from '../features/game/types';
import { AppShell, Avatar } from '../components/AppShell';
import { ConnectionDot } from '../components/ConnectionDot';
import { cn } from '../utils';
import { BOT_TIERS, type BotProfile } from '../bots';

type Ack = { ok: true; match: MatchView } | { ok: false; code: ErrorCode; message: string };

export default function LobbyPage() {
  const navigate = useNavigate();
  const { profile, recent, refreshStats } = useAuth();
  const { socket, connection, error: socketError } = useSocket();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | 'create' | 'join' | 'bot'>(null);
  const [queued, setQueued] = useState(false);
  const [noOpponent, setNoOpponent] = useState(false);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    if (!socket) return;
    const onFound = ({ matchId }: { matchId: string }) => {
      setQueued(false);
      navigate(`/play/${matchId}`);
    };
    const onJoined = () => {
      setQueued(true);
      setNoOpponent(false);
    };
    const onNone = () => {
      setQueued(false);
      setNoOpponent(true);
    };
    const onLeft = () => setQueued(false);

    socket.on('match_found', onFound);
    socket.on('queue_joined', onJoined);
    socket.on('queue_no_opponent', onNone);
    socket.on('queue_left', onLeft);
    return () => {
      socket.off('match_found', onFound);
      socket.off('queue_joined', onJoined);
      socket.off('queue_no_opponent', onNone);
      socket.off('queue_left', onLeft);
    };
  }, [socket, navigate]);

  const playBot = useCallback(
    (bot: BotProfile) => {
      if (!socket || pending) return;
      setPending('bot');
      setError(null);
      socket.emit('create_match', { mode: 'bot', botId: bot.id }, (res: Ack) => {
        setPending(null);
        if (res.ok) navigate(`/play/${res.match.id}`);
        else setError(ERROR_COPY[res.code] ?? res.message);
      });
    },
    [socket, navigate, pending],
  );

  const create = useCallback(
    (mode: 'pvp' | 'bot', botDifficulty?: number) => {
      if (!socket || pending) return;
      setPending(mode === 'bot' ? 'bot' : 'create');
      setError(null);
      socket.emit('create_match', { mode, botDifficulty }, (res: Ack) => {
        setPending(null);
        if (res.ok) navigate(`/play/${res.match.id}`);
        else setError(ERROR_COPY[res.code] ?? res.message);
      });
    },
    [socket, navigate, pending],
  );

  const join = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const trimmed = code.trim().toUpperCase();
      if (!socket || !trimmed || pending) return;
      setPending('join');
      setError(null);
      socket.emit('join_match', { matchId: trimmed }, (res: Ack) => {
        setPending(null);
        if (res.ok) navigate(`/play/${res.match.id}`);
        else setError(ERROR_COPY[res.code] ?? res.message);
      });
    },
    [socket, code, navigate, pending],
  );

  return (
    <AppShell title="Play" actions={<ConnectionDot connection={connection} error={socketError} />}>
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
        <section className="grid shrink-0 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => (queued ? socket?.emit('leave_queue') : socket?.emit('join_queue'))}
            className={cn(
              'group flex flex-col items-start gap-1.5 rounded-xl p-5 text-left md:col-span-2',
              'transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300',
              'motion-reduce:hover:translate-y-0',
              queued ? 'bg-indigo-800 text-slate-100' : 'bg-indigo-700 text-slate-100',
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100/15">
              {queued ? (
                <Loader2
                  size={18}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Swords size={18} aria-hidden="true" />
              )}
            </span>
            <span className="text-lg font-semibold">
              {queued ? 'Looking for an opponent…' : 'Play online'}
            </span>
            <span className="text-sm text-indigo-100/85">
              {queued ? 'Tap again to stop waiting.' : 'Matches you with whoever else is looking.'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => playBot(BOT_TIERS[2]!.bots[0]!)}
            disabled={pending !== null}
            className="edge surface-panel group flex flex-col items-start gap-1.5 rounded-xl border p-5 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-indigo-500 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-60 motion-reduce:hover:translate-y-0"
          >
            <span className="surface-raised ink-muted flex h-9 w-9 items-center justify-center rounded-lg">
              <Bot size={18} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold">Play the computer</span>
            <span className="ink-faint text-sm">
              Ten opponents, from learner to expert. Pick one below.
            </span>
          </button>
        </section>

        {noOpponent && (
          <div className="edge surface-panel flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-indigo-500/50 p-4">
            <p className="ink flex-1 text-sm">
              Nobody else is looking right now. Play the computer instead, or wait a bit longer.
            </p>
            <button
              type="button"
              onClick={() => playBot(BOT_TIERS[2]!.bots[0]!)}
              className={btnPrimary}
            >
              Play the computer
            </button>
            <button
              type="button"
              onClick={() => {
                setNoOpponent(false);
                socket?.emit('join_queue');
              }}
              className={btnGhost}
            >
              Keep waiting
            </button>
            <button
              type="button"
              onClick={() => setNoOpponent(false)}
              className="ink-faint hover:ink rounded-md p-1.5"
            >
              <X size={15} aria-hidden="true" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        )}

        <section className="edge surface-panel shrink-0 rounded-xl border p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Computer opponents</h2>
            <span className="ink-faint text-xs">Practice only. Ratings do not change.</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {BOT_TIERS.map(tier => (
              <div key={tier.label}>
                <p className="ink-faint mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                  {tier.label}
                  <span className="ml-1.5 font-normal normal-case tracking-normal">
                    {tier.blurb}
                  </span>
                </p>
                <ul className="space-y-1">
                  {tier.bots.map(bot => (
                    <li key={bot.id}>
                      <BotRow bot={bot} busy={pending === 'bot'} onPlay={() => playBot(bot)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="edge surface-panel grid shrink-0 gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Play a friend</h2>
            <button
              type="button"
              onClick={() => create('pvp')}
              disabled={pending !== null}
              className={cn(btnPrimary, 'w-full justify-center')}
            >
              <Plus size={16} aria-hidden="true" />
              {pending === 'create' ? 'Creating…' : 'Create a private game'}
            </button>
            <p className="ink-faint mt-1.5 text-xs">You get a code to send them.</p>
          </div>

          <form onSubmit={join}>
            <label htmlFor="room-code" className="mb-2 block text-sm font-semibold">
              Join with a code
            </label>
            <div className="flex gap-2">
              <input
                id="room-code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="ttt-notation edge surface-raised ink min-w-0 flex-1 rounded-lg border px-3 py-2 text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-[color:var(--app-ink-faint)] focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={code.trim().length < 4 || pending !== null}
                className={btnPrimary}
              >
                {pending === 'join' ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <p
            role="alert"
            className="shrink-0 rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <section className="edge surface-panel flex min-h-0 flex-1 flex-col rounded-xl border p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Your record</h2>
            {profile && (
              <span className="ttt-notation text-sm text-indigo-300">{profile.elo} rating</span>
            )}
          </div>

          <dl className="mb-3 grid shrink-0 grid-cols-4 gap-2 text-center">
            <Stat label="Played" value={profile?.matchesPlayed ?? 0} />
            <Stat label="Won" value={profile?.wins ?? 0} tone="text-emerald-400" />
            <Stat label="Lost" value={profile?.losses ?? 0} tone="text-rose-300" />
            <Stat label="Drawn" value={profile?.draws ?? 0} />
          </dl>

          {recent.length === 0 ? (
            <p className="ink-faint text-sm">
              No games yet. Play online, or send a friend a private code.
            </p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {recent.slice(0, 8).map(match => (
                <li
                  key={match.id}
                  className="surface-raised flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                >
                  <Avatar name={match.opponentName} photo={match.opponentPhoto} size={24} />
                  <Link
                    to={`/players/${match.opponentUid}`}
                    className="min-w-0 flex-1 truncate hover:text-indigo-300"
                  >
                    {match.opponentName}
                  </Link>
                  {match.eloDelta !== null && (
                    <span
                      className={cn(
                        'ttt-notation shrink-0 text-xs',
                        match.eloDelta > 0
                          ? 'text-emerald-400'
                          : match.eloDelta < 0
                            ? 'text-rose-300'
                            : 'ink-faint',
                      )}
                    >
                      {match.eloDelta > 0 ? '+' : ''}
                      {match.eloDelta}
                    </span>
                  )}
                  <Link
                    to={`/review/${match.id}`}
                    className="edge ink-faint hover:ink shrink-0 rounded border px-2 py-0.5 text-[11px] hover:border-indigo-400"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

const btnBase =
  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:hover:scale-100';
const btnPrimary = `${btnBase} bg-indigo-700 text-slate-100 hover:bg-indigo-600`;
const btnGhost = `${btnBase} edge surface-raised ink-muted hover:ink border`;

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="surface-raised rounded-lg py-2.5">
      <dd className={cn('ttt-notation text-xl font-semibold', tone ?? 'ink')}>{value}</dd>
      <dt className="ink-faint text-xs">{label}</dt>
    </div>
  );
}

function BotRow({ bot, busy, onPlay }: { bot: BotProfile; busy: boolean; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={busy}
      title={bot.blurb}
      className="edge surface-raised flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-transform duration-150 hover:scale-[1.01] hover:border-indigo-500 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-50 motion-reduce:hover:scale-100"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-indigo-200">
        <Bot size={14} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ink block truncate text-sm font-medium">{bot.name}</span>
        <span className="ink-faint block truncate text-[11px]">{bot.blurb}</span>
      </span>
      <span className="ttt-notation ink-faint shrink-0 text-xs">{bot.rating}</span>
    </button>
  );
}
