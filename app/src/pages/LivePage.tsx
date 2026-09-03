import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { AppShell, Avatar } from '../components/AppShell';
import { ConnectionDot } from '../components/ConnectionDot';
import { useAuth } from '../features/auth/AuthContext';
import { useSocket } from '../features/game/useSocket';
import { cn } from '../utils';

/**
 * Live: who is here, what is being played, and one room to talk in.
 *
 * Everything on this page is real. Presence comes from actual socket
 * connections and the game list from actual matches in progress, so an empty
 * lobby looks empty rather than being padded with invented players.
 */

interface PresencePlayer {
  uid: string;
  name: string;
  photoURL: string | null;
  state: 'online' | 'in_game' | 'queued';
  matchId: string | null;
}

interface LiveGame {
  id: string;
  x: { name: string; photoURL: string | null };
  o: { name: string; photoURL: string | null };
  moves: number;
  startedAt: number;
}

interface GlobalMessage {
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  at: number;
}

const STATE_LABEL: Record<PresencePlayer['state'], string> = {
  online: 'Available',
  in_game: 'Playing',
  queued: 'Looking for a game',
};

export default function LivePage() {
  const { socket, connection, error } = useSocket();
  const { user } = useAuth();
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [games, setGames] = useState<LiveGame[]>([]);
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!socket) return;

    const onPresence = (data: { players: PresencePlayer[]; games: LiveGame[] }) => {
      setPlayers(data.players ?? []);
      setGames(data.games ?? []);
    };
    const onHistory = (data: { messages: GlobalMessage[] }) => setMessages(data.messages ?? []);
    const onMessage = (msg: GlobalMessage) => setMessages(prev => [...prev.slice(-99), msg]);
    const onError = (e: { code: string; message: string }) => {
      if (e.code === 'RATE_LIMITED' || e.code === 'BAD_REQUEST') setChatError(e.message);
    };
    const watch = () => socket.emit('lobby_watch');

    socket.on('presence', onPresence);
    socket.on('global_chat_history', onHistory);
    socket.on('global_chat_message', onMessage);
    socket.on('game_error', onError);
    socket.on('connect', watch);
    watch();

    return () => {
      socket.emit('lobby_unwatch');
      socket.off('presence', onPresence);
      socket.off('global_chat_history', onHistory);
      socket.off('global_chat_message', onMessage);
      socket.off('game_error', onError);
      socket.off('connect', watch);
    };
  }, [socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  useEffect(() => {
    if (!chatError) return;
    const t = setTimeout(() => setChatError(null), 4000);
    return () => clearTimeout(t);
  }, [chatError]);

  function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!socket || !text) return;
    socket.emit('global_chat_send', { text });
    setDraft('');
  }

  return (
    <AppShell title="Live" actions={<ConnectionDot connection={connection} error={error} />}>
      <div className="grid h-full gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Games in progress */}
        <div className="flex min-h-0 flex-col gap-4">
          <section className="edge surface-panel flex min-h-0 flex-1 flex-col rounded-xl border p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Games in progress</h2>
              <span className="ttt-notation ink-faint text-xs">{games.length}</span>
            </div>

            {games.length === 0 ? (
              <EmptyState
                title="No games running"
                body="When people are playing, their games show up here and you can watch."
              />
            ) : (
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {games.map(game => (
                  <li key={game.id}>
                    <Link
                      to={`/play/${game.id}`}
                      className="edge surface-raised flex items-center gap-3 rounded-lg border p-2.5 hover:border-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                    >
                      <Avatar name={game.x.name} photo={game.x.photoURL} size={26} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="text-indigo-300">{game.x.name}</span>
                        <span className="ink-faint"> vs </span>
                        <span className="text-rose-300">{game.o.name}</span>
                      </span>
                      <span className="ttt-notation ink-faint shrink-0 text-xs">
                        {game.moves} moves
                      </span>
                      <span className="shrink-0 rounded bg-indigo-700 px-2 py-0.5 text-[11px] font-medium text-slate-100">
                        Watch
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Who is here */}
          <section className="edge surface-panel flex min-h-0 flex-1 flex-col rounded-xl border p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Online now</h2>
              <span className="ttt-notation ink-faint text-xs">{players.length}</span>
            </div>

            {players.length === 0 ? (
              <EmptyState
                title="Nobody else is here"
                body="Share the site with a friend, or start a game against the computer."
              />
            ) : (
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {players.map(player => (
                  <li key={player.uid} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                    <span className="relative">
                      <Avatar name={player.name} photo={player.photoURL} size={26} />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2',
                          'border-[color:var(--app-panel)]',
                          player.state === 'in_game'
                            ? 'bg-amber-400'
                            : player.state === 'queued'
                              ? 'bg-indigo-400'
                              : 'bg-emerald-500',
                        )}
                      />
                    </span>
                    <Link
                      to={`/players/${player.uid}`}
                      className="min-w-0 flex-1 truncate text-sm hover:text-indigo-300"
                    >
                      {player.name}
                      {player.uid === user?.uid && <span className="ink-faint"> (you)</span>}
                    </Link>
                    <span className="ink-faint shrink-0 text-xs">{STATE_LABEL[player.state]}</span>
                    {player.state === 'in_game' && player.matchId && (
                      <Link
                        to={`/play/${player.matchId}`}
                        className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-[11px] hover:border-indigo-400 hover:text-indigo-300"
                      >
                        Watch
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Global chat */}
        <section className="edge surface-panel flex min-h-0 flex-col rounded-xl border p-4">
          <h2 className="mb-3 text-lg font-semibold">Global chat</h2>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <li className="ink-faint text-sm">Nothing said yet. Say hello.</li>
            ) : (
              messages.map((msg, i) => (
                <li
                  key={`${msg.at}-${i}`}
                  ref={i === messages.length - 1 ? endRef : undefined}
                  className="text-sm"
                >
                  <Link
                    to={`/players/${msg.senderUid}`}
                    className={cn(
                      'font-semibold hover:underline',
                      msg.senderUid === user?.uid ? 'text-indigo-300' : 'ink',
                    )}
                  >
                    {msg.senderName}
                  </Link>
                  <span className="ink-faint">: </span>
                  <span className="ink-muted break-words">{msg.text}</span>
                </li>
              ))
            )}
          </ul>

          {chatError && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {chatError}
            </p>
          )}

          <form onSubmit={send} className="mt-3 flex gap-1.5">
            <label htmlFor="global-chat" className="sr-only">
              Message everyone
            </label>
            <input
              id="global-chat"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={300}
              autoComplete="off"
              placeholder="Message everyone…"
              className="edge surface-raised ink min-w-0 flex-1 rounded-md border px-2.5 py-2 text-sm placeholder:text-[color:var(--app-ink-faint)] focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="shrink-0 rounded-md bg-indigo-700 px-3 text-slate-100 transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 disabled:opacity-40 motion-reduce:hover:scale-100"
            >
              <Send size={15} aria-hidden="true" />
              <span className="sr-only">Send</span>
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="edge flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <p className="ink mb-1 text-sm font-medium">{title}</p>
      <p className="ink-faint max-w-xs text-xs">{body}</p>
    </div>
  );
}
