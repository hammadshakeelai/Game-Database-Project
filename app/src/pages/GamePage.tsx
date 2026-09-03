import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, Copy, Flag, Handshake, Lightbulb } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useSocket } from '../features/game/useSocket';
import { useMatch } from '../features/game/useMatch';
import { Board, TurnIndicator } from '../features/game/Board';
import { Spinner } from '../components/Spinner';
import { ConnectionBanner } from '../components/ConnectionBanner';
import type { PublicPlayer } from '../features/game/types';

export default function GamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { refreshStats } = useAuth();
  const { socket, connection, error: socketError } = useSocket();
  const {
    match,
    joinState,
    joinError,
    actionError,
    hint,
    rematchMatchId,
    expired,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    requestRematch,
    requestHint,
    leaveMatch,
    dismissActionError,
  } = useMatch(socket, matchId);

  const [confirmResign, setConfirmResign] = useState(false);

  // A finished game changes the player's record.
  useEffect(() => {
    if (match?.status === 'finished' && match.mode === 'pvp') void refreshStats();
  }, [match?.status, match?.mode, refreshStats]);

  // Follow both players to the rematch once it exists.
  useEffect(() => {
    if (rematchMatchId) navigate(`/play/${rematchMatchId}`, { replace: true });
  }, [rematchMatchId, navigate]);

  // Transient errors should not stay on screen forever.
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(dismissActionError, 4000);
    return () => clearTimeout(timer);
  }, [actionError, dismissActionError]);

  if (connection === 'failed') {
    return <Centered title="Connection problem" body={socketError ?? 'Please sign in again.'} />;
  }

  if (joinState === 'joining' || (joinState === 'idle' && !match)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-900">
        <Spinner label="Loading the game" />
      </main>
    );
  }

  if (joinState === 'error') {
    return <Centered title="Cannot open this game" body={joinError ?? 'Something went wrong.'} />;
  }

  if (expired) {
    return (
      <Centered title="Game expired" body="This game was inactive for too long and has closed." />
    );
  }

  if (!match) return <Centered title="Game unavailable" body="Please go back and try again." />;

  const me = match.role === 'spectator' ? null : match.players[match.role];
  const opponent =
    match.role === 'spectator' ? null : match.players[match.role === 'X' ? 'O' : 'X'];
  const isMyTurn = match.status === 'active' && match.state.currentPlayer === match.role;
  const drawOfferedToMe =
    match.drawOfferedBy !== null &&
    match.drawOfferedBy !== match.role &&
    match.role !== 'spectator';
  const iRequestedRematch =
    match.role !== 'spectator' && match.rematchRequestedBy.includes(match.role);

  return (
    <main className="min-h-dvh bg-slate-900 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <LeaveButton
            forfeits={match.status === 'active' && match.role !== 'spectator'}
            onLeave={leaveMatch}
          />
          {match.mode === 'pvp' && <ShareCode code={match.id} />}
        </header>

        <ConnectionBanner connection={connection} error={socketError} />

        <section className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
          <PlayerChip
            player={me}
            mark={match.role === 'spectator' ? 'X' : match.role}
            you
            active={isMyTurn}
          />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-slate-600">
            vs
          </span>
          <PlayerChip
            player={opponent}
            mark={match.role === 'O' ? 'X' : 'O'}
            active={match.status === 'active' && !isMyTurn}
            alignEnd
          />
        </section>

        {match.status === 'waiting' && <WaitingNotice code={match.id} />}

        <div className="mb-4 flex justify-center">
          <Board
            state={match.state}
            role={match.role}
            interactive={match.status === 'active'}
            hint={hint}
            onCellClick={makeMove}
          />
        </div>

        <div className="mb-4 min-h-6 text-center">
          <TurnIndicator state={match.state} role={match.role} status={match.status} />
        </div>

        <AnimatePresence>
          {actionError && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="mb-4 rounded-xl bg-red-500/15 px-4 py-2.5 text-center text-sm text-red-200"
            >
              {actionError}
            </motion.p>
          )}
        </AnimatePresence>

        {drawOfferedToMe && match.status === 'active' && (
          <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-amber-100">Your opponent offered a draw.</p>
            <div className="flex gap-2">
              <button type="button" onClick={acceptDraw} className={btnPrimary}>
                Accept
              </button>
              <button type="button" onClick={declineDraw} className={btnGhost}>
                Decline
              </button>
            </div>
          </div>
        )}

        {match.status === 'active' && match.role !== 'spectator' && (
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={requestHint} disabled={!isMyTurn} className={btnGhost}>
              <Lightbulb size={16} aria-hidden="true" /> Hint
            </button>
            {match.mode === 'pvp' && (
              <button
                type="button"
                onClick={offerDraw}
                disabled={match.drawOfferedBy === match.role}
                className={btnGhost}
              >
                <Handshake size={16} aria-hidden="true" />
                {match.drawOfferedBy === match.role ? 'Draw offered' : 'Offer draw'}
              </button>
            )}
            <button
              type="button"
              onClick={() => (confirmResign ? resign() : setConfirmResign(true))}
              onBlur={() => setConfirmResign(false)}
              className={confirmResign ? btnDanger : btnGhost}
            >
              <Flag size={16} aria-hidden="true" />
              {confirmResign ? 'Tap again to confirm' : 'Resign'}
            </button>
          </div>
        )}

        <AnimatePresence>
          {match.status === 'finished' && match.result && (
            <ResultPanel
              winner={match.result.winner}
              reason={match.result.reason}
              myMark={match.role === 'spectator' ? null : match.role}
              onRematch={requestRematch}
              rematchPending={iRequestedRematch}
              canRematch={match.role !== 'spectator'}
              opponentName={opponent?.name ?? 'your opponent'}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

const btnBase =
  'inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40';
const btnGhost = `${btnBase} border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100`;
const btnPrimary = `${btnBase} bg-indigo-600 text-slate-900 hover:bg-indigo-500`;
const btnDanger = `${btnBase} bg-red-500 text-slate-900 hover:bg-red-400`;

/**
 * Back-to-lobby control.
 *
 * Walking out of a game in progress forfeits it, so that needs confirming —
 * the same two-tap pattern as resign. Leaving a finished game is just navigation.
 */
function LeaveButton({ forfeits, onLeave }: { forfeits: boolean; onLeave: () => void }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const className =
    'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ' +
    (confirming
      ? 'bg-red-500/15 text-red-200'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200');

  if (!forfeits) {
    return (
      <Link to="/play" className={className}>
        <ArrowLeft size={16} aria-hidden="true" />
        Lobby
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        onLeave();
        navigate('/play');
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {confirming ? 'Leaving forfeits. Tap again' : 'Lobby'}
    </button>
  );
}

function Centered({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center">
      <h1 className="ttt-display text-2xl font-semibold text-slate-100">{title}</h1>
      <p className="max-w-sm text-sm text-slate-400">{body}</p>
      <Link to="/play" className={btnPrimary}>
        Back to the lobby
      </Link>
    </main>
  );
}

function PlayerChip({
  player,
  mark,
  you = false,
  active = false,
  alignEnd = false,
}: {
  player: PublicPlayer | null;
  mark: 'X' | 'O';
  you?: boolean;
  active?: boolean;
  alignEnd?: boolean;
}) {
  const tone = mark === 'X' ? 'text-indigo-300' : 'text-rose-300';
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2.5 ${alignEnd ? 'flex-row-reverse text-right' : ''}`}
    >
      <div className="relative shrink-0">
        {player?.photoURL ? (
          <img
            src={player.photoURL}
            alt=""
            className="h-9 w-9 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300">
            {(player?.name ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        {active && (
          <span
            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-800 bg-emerald-400"
            aria-label="on move"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-200">
          {player?.name ?? 'Waiting…'}
          {you && <span className="text-slate-500"> (you)</span>}
        </p>
        <p className={`text-xs font-bold ${tone}`}>
          {mark}
          {player && !player.connected && (
            <span className="ml-1.5 font-normal text-amber-300">· reconnecting</span>
          )}
        </p>
      </div>
    </div>
  );
}

function WaitingNotice({ code }: { code: string }) {
  return (
    <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-center">
      <p className="text-sm text-indigo-100">
        Share the code <strong className="ttt-notation tracking-widest">{code}</strong> or the link
        above. The game starts as soon as they join.
      </p>
    </div>
  );
}

/** Copy the invite link, falling back to the code if the clipboard is blocked. */
function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/play/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the code stays visible on the button.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="ttt-notation flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm tracking-widest text-slate-200 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
    >
      {code}
      {copied ? (
        <Check size={14} className="text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy size={14} className="text-slate-500" aria-hidden="true" />
      )}
      <span className="sr-only">{copied ? 'Invite link copied' : 'Copy invite link'}</span>
    </button>
  );
}

function ResultPanel({
  winner,
  reason,
  myMark,
  onRematch,
  rematchPending,
  canRematch,
  opponentName,
}: {
  winner: 'X' | 'O' | 'Draw';
  reason: string;
  myMark: 'X' | 'O' | null;
  onRematch: () => void;
  rematchPending: boolean;
  canRematch: boolean;
  opponentName: string;
}) {
  const outcome =
    winner === 'Draw' ? 'draw' : myMark === null ? 'other' : winner === myMark ? 'win' : 'loss';
  const heading =
    outcome === 'draw'
      ? 'Draw'
      : outcome === 'win'
        ? 'You won'
        : outcome === 'loss'
          ? 'You lost'
          : `${winner} won`;
  const detail =
    reason === 'resign'
      ? outcome === 'win'
        ? `${opponentName} resigned.`
        : 'By resignation.'
      : reason === 'agreement'
        ? 'By agreement.'
        : reason === 'draw'
          ? 'Every board is decided.'
          : 'Three boards in a line.';

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="mt-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center"
      aria-live="polite"
    >
      <h2
        className={`ttt-display mb-1 text-3xl font-semibold ${
          outcome === 'win'
            ? 'text-emerald-300'
            : outcome === 'loss'
              ? 'text-rose-300'
              : 'text-slate-100'
        }`}
      >
        {heading}
      </h2>
      <p className="mb-5 text-sm text-slate-400">{detail}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {canRematch && (
          <button
            type="button"
            onClick={onRematch}
            disabled={rematchPending}
            className={btnPrimary}
          >
            {rematchPending ? 'Waiting for opponent…' : 'Rematch'}
          </button>
        )}
        <Link to="/play" className={btnGhost}>
          Back to the lobby
        </Link>
      </div>
    </motion.section>
  );
}
