import type { Server, Socket } from 'socket.io';
import type { MatchStore } from './matchStore.js';
import type { VerifiedUser } from './firebaseAdmin.js';

/**
 * Lobby: presence, matchmaking, and global chat.
 *
 * Everything here is derived from real socket connections. There are no seeded
 * users and no synthetic games: the previous build filled the lobby with a
 * hardcoded pool of fake players and reported games against them as human
 * results, which is the one thing this deliberately does not do.
 *
 * A player who cannot find a human opponent is offered a bot, clearly labelled.
 */

const LOBBY_ROOM = 'lobby';

/** How long to look for a human before offering the computer. */
export const QUEUE_HUMAN_WAIT_MS = 12_000;

export type PresenceState = 'online' | 'in_game' | 'queued';

export interface PresenceEntry {
  uid: string;
  name: string;
  photoURL: string | null;
  state: PresenceState;
  matchId: string | null;
  since: number;
}

interface QueueEntry {
  uid: string;
  socketId: string;
  since: number;
  timer: NodeJS.Timeout;
}

export interface GlobalMessage {
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  at: number;
}

interface LobbySocketData {
  user: VerifiedUser;
  matchId: string | null;
  chatTimes: number[];
  globalChatTimes: number[];
}

type LobbySocket = Socket & { data: LobbySocketData };

/** Live lobby state. In-memory by design: it describes right now, not history. */
export class Lobby {
  /** uid -> presence. One entry per player, not per socket. */
  private presence = new Map<string, PresenceEntry>();
  /** uid -> how many sockets that player has open. */
  private connections = new Map<string, number>();
  private queue: QueueEntry[] = [];
  /** The last stretch of global chat. Deliberately not persisted. */
  private chat: GlobalMessage[] = [];

  private static readonly CHAT_KEEP = 80;

  connect(user: VerifiedUser): void {
    const open = (this.connections.get(user.uid) ?? 0) + 1;
    this.connections.set(user.uid, open);
    const existing = this.presence.get(user.uid);
    this.presence.set(user.uid, {
      uid: user.uid,
      name: user.name,
      photoURL: user.picture,
      state: existing?.state ?? 'online',
      matchId: existing?.matchId ?? null,
      since: existing?.since ?? Date.now(),
    });
  }

  /** Returns true when the player has no sockets left and is now offline. */
  disconnect(uid: string): boolean {
    const open = (this.connections.get(uid) ?? 1) - 1;
    if (open > 0) {
      this.connections.set(uid, open);
      return false;
    }
    this.connections.delete(uid);
    this.presence.delete(uid);
    return true;
  }

  setState(uid: string, state: PresenceState, matchId: string | null = null): void {
    const entry = this.presence.get(uid);
    if (!entry) return;
    entry.state = state;
    entry.matchId = matchId;
    entry.since = Date.now();
  }

  online(): PresenceEntry[] {
    return [...this.presence.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  isOnline(uid: string): boolean {
    return this.presence.has(uid);
  }

  presenceOf(uid: string): PresenceEntry | null {
    return this.presence.get(uid) ?? null;
  }

  // --- Matchmaking --------------------------------------------------

  enqueue(entry: QueueEntry): void {
    this.dequeue(entry.uid);
    this.queue.push(entry);
  }

  /** Remove a player from the queue, clearing their fallback timer. */
  dequeue(uid: string): QueueEntry | undefined {
    const i = this.queue.findIndex(q => q.uid === uid);
    if (i === -1) return undefined;
    const [entry] = this.queue.splice(i, 1);
    if (entry) clearTimeout(entry.timer);
    return entry;
  }

  /** Someone else who is waiting, if there is one. */
  findOpponent(uid: string): QueueEntry | undefined {
    return this.queue.find(q => q.uid !== uid);
  }

  queueLength(): number {
    return this.queue.length;
  }

  // --- Global chat --------------------------------------------------

  pushMessage(msg: GlobalMessage): void {
    this.chat.push(msg);
    if (this.chat.length > Lobby.CHAT_KEEP) this.chat.splice(0, this.chat.length - Lobby.CHAT_KEEP);
  }

  recentChat(): GlobalMessage[] {
    return [...this.chat];
  }
}

/** Sliding-window rate limit. Returns true when the action is allowed. */
function allow(times: number[], limit: number, windowMs: number): boolean {
  const now = Date.now();
  let i = 0;
  while (i < times.length && now - times[i]! >= windowMs) i++;
  times.splice(0, i);
  if (times.length >= limit) return false;
  times.push(now);
  return true;
}

export function registerLobbyHandlers(io: Server, store: MatchStore, lobby: Lobby): void {
  /** Tell everyone watching the lobby what changed. */
  function broadcastPresence(): void {
    io.to(LOBBY_ROOM).emit('presence', {
      players: lobby.online(),
      queued: lobby.queueLength(),
      games: liveGames(),
    });
  }

  /** Games currently in progress, safe to show publicly. */
  function liveGames() {
    return store
      .all()
      .filter(m => m.status === 'active' && m.mode === 'pvp' && m.players.X && m.players.O)
      .slice(0, 30)
      .map(m => ({
        id: m.id,
        x: { name: m.players.X!.name, photoURL: m.players.X!.photoURL },
        o: { name: m.players.O!.name, photoURL: m.players.O!.photoURL },
        moves: m.state.moves.length,
        startedAt: m.createdAt,
      }));
  }

  io.on('connection', (raw: Socket) => {
    const socket = raw as LobbySocket;
    socket.data.globalChatTimes = [];
    const me = () => socket.data.user;

    lobby.connect(me());
    broadcastPresence();

    socket.on('lobby_watch', () => {
      socket.join(LOBBY_ROOM);
      socket.emit('presence', {
        players: lobby.online(),
        queued: lobby.queueLength(),
        games: liveGames(),
      });
      socket.emit('global_chat_history', { messages: lobby.recentChat() });
    });

    socket.on('lobby_unwatch', () => socket.leave(LOBBY_ROOM));

    // --- Matchmaking ------------------------------------------------
    socket.on('join_queue', () => {
      const user = me();
      const waiting = lobby.findOpponent(user.uid);

      if (waiting) {
        lobby.dequeue(waiting.uid);
        lobby.dequeue(user.uid);

        const other = io.sockets.sockets.get(waiting.socketId) as LobbySocket | undefined;
        if (!other) {
          // They vanished between joining and being matched; keep waiting.
          startWaiting(user.uid);
          return;
        }

        const match = store.create({
          mode: 'pvp',
          host: {
            uid: other.data.user.uid,
            name: other.data.user.name,
            photoURL: other.data.user.picture,
            socketId: other.id,
          },
        });
        match.players.O = {
          uid: user.uid,
          name: user.name,
          photoURL: user.picture,
          socketId: socket.id,
          disconnectedAt: null,
        };
        match.status = 'active';

        for (const s of [other, socket]) s.emit('match_found', { matchId: match.id, vsBot: false });
        lobby.setState(other.data.user.uid, 'in_game', match.id);
        lobby.setState(user.uid, 'in_game', match.id);
        broadcastPresence();
        return;
      }

      startWaiting(user.uid);
    });

    /**
     * Wait for a human. If nobody appears, offer the computer rather than
     * leaving the player staring at a spinner. The offer is explicit: the
     * client decides, and the opponent is named as a bot either way.
     */
    function startWaiting(uid: string) {
      lobby.enqueue({
        uid,
        socketId: socket.id,
        since: Date.now(),
        timer: setTimeout(() => {
          if (lobby.dequeue(uid)) {
            socket.emit('queue_no_opponent');
            lobby.setState(uid, 'online');
            broadcastPresence();
          }
        }, QUEUE_HUMAN_WAIT_MS),
      });
      lobby.setState(uid, 'queued');
      broadcastPresence();
      socket.emit('queue_joined', { waiting: lobby.queueLength() });
    }

    socket.on('leave_queue', () => {
      if (lobby.dequeue(me().uid)) {
        lobby.setState(me().uid, 'online');
        broadcastPresence();
        socket.emit('queue_left');
      }
    });

    // --- Global chat ------------------------------------------------
    socket.on('global_chat_send', (payload: unknown) => {
      const { text } = (payload ?? {}) as { text?: unknown };
      if (typeof text !== 'string' || text.trim().length === 0 || text.length > 300) {
        socket.emit('game_error', {
          code: 'BAD_REQUEST',
          message: 'Message must be between 1 and 300 characters.',
        });
        return;
      }
      // Five messages per fifteen seconds, per socket.
      if (!allow(socket.data.globalChatTimes, 5, 15_000)) {
        socket.emit('game_error', {
          code: 'RATE_LIMITED',
          message: 'You are sending messages too quickly.',
        });
        return;
      }
      const user = me();
      const msg: GlobalMessage = {
        senderUid: user.uid,
        senderName: user.name,
        senderPhoto: user.picture,
        text: text.trim(),
        at: Date.now(),
      };
      lobby.pushMessage(msg);
      io.to(LOBBY_ROOM).emit('global_chat_message', msg);
    });

    socket.on('disconnect', () => {
      const uid = me().uid;
      lobby.dequeue(uid);
      if (lobby.disconnect(uid)) broadcastPresence();
      else broadcastPresence();
    });
  });

  /** Presence changes as games start and finish, so refresh on a slow beat. */
  const tick = setInterval(broadcastPresence, 10_000);
  if (typeof tick.unref === 'function') tick.unref();
}
