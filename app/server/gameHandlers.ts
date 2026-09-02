import type { Server, Socket } from 'socket.io';
import { applyMove, isValidMove } from '../src/gameLogic.js';
import { evaluateMoveAccuracy, getBestMove, getEvaluation } from '../src/aiEvaluator.js';
import type { Move } from '../src/types.js';
import {
  MatchStore,
  RECONNECT_GRACE_MS,
  type Mark,
  type Match,
  type MatchPlayer,
} from './matchStore.js';
import { ensureProfile, recordMatch } from './persistence.js';
import type { VerifiedUser } from './firebaseAdmin.js';

/**
 * Socket event handlers.
 *
 * Invariant enforced throughout: the acting identity is `socket.data.user.uid`,
 * set by the handshake middleware from a verified Firebase ID token. No handler
 * reads a user id, mark, or role out of its own payload — that was the hole
 * that let any client act as any player.
 */

/** Stable codes so the client can show a friendly message per failure. */
export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NOT_A_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'ILLEGAL_MOVE'
  | 'GAME_OVER'
  | 'BAD_REQUEST'
  | 'NO_DRAW_OFFER'
  | 'RATE_LIMITED';

interface SocketData {
  user: VerifiedUser;
  /** Match this socket is currently attached to. */
  matchId: string | null;
  /** Timestamps of recent chat messages, for rate limiting. */
  chatTimes: number[];
}

type GameSocket = Socket & { data: SocketData };

function fail(socket: Socket, code: ErrorCode, message: string): void {
  socket.emit('game_error', { code, message });
}

/** Board indices must be integers in [0, 8]. Anything else is a malformed request. */
function isValidIndex(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 8;
}

function publicPlayer(p: MatchPlayer | null) {
  if (!p) return null;
  return {
    uid: p.uid,
    name: p.name,
    photoURL: p.photoURL,
    connected: p.socketId !== null,
  };
}

/** The view of a match that is safe to send to any client in the room. */
export function matchView(match: Match, viewerUid: string, store: MatchStore) {
  return {
    id: match.id,
    mode: match.mode,
    status: match.status,
    state: match.state,
    role: store.roleOf(match, viewerUid),
    players: { X: publicPlayer(match.players.X), O: publicPlayer(match.players.O) },
    result: match.result,
    drawOfferedBy: match.drawOfferedBy,
    rematchRequestedBy: [...match.rematchRequestedBy],
    rematchMatchId: match.rematchMatchId,
  };
}

export function registerGameHandlers(io: Server, store: MatchStore): void {
  /** Broadcast the current match to everyone in the room, personalised per viewer. */
  function broadcast(match: Match): void {
    for (const socket of io.sockets.adapter.rooms.get(match.id) ?? []) {
      const s = io.sockets.sockets.get(socket) as GameSocket | undefined;
      if (!s) continue;
      s.emit('match_update', matchView(match, s.data.user.uid, store));
    }
  }

  /** End a match, persist it, and tell the room. */
  async function finish(
    match: Match,
    winner: Mark | 'Draw',
    reason: 'line' | 'draw' | 'resign' | 'agreement',
  ): Promise<void> {
    if (match.status === 'finished') return;
    match.status = 'finished';
    match.result = { winner, reason };
    match.finishedAt = Date.now();
    match.drawOfferedBy = null;
    store.touch(match);
    broadcast(match);
    await recordMatch(match);
  }

  /**
   * Play the bot's move, if it is the bot's turn.
   * Re-reads the match after the "thinking" delay because the human may have
   * resigned or the match may have been reaped in the meantime.
   */
  function scheduleBotMove(match: Match): void {
    if (match.mode !== 'bot' || match.status !== 'active') return;
    const botMark = match.players.X?.uid === 'BOT' ? 'X' : 'O';
    if (match.state.currentPlayer !== botMark) return;

    const delay = Math.max(350, 900 - match.botDifficulty * 100);
    setTimeout(() => {
      const current = store.get(match.id);
      if (!current || current.status !== 'active') return;
      if (current.state.currentPlayer !== botMark) return;

      const move = getBestMove(current.state, current.botDifficulty);
      if (!move) return;

      const accuracy = evaluateMoveAccuracy(current.state, move);
      current.state = applyMove(current.state, move);
      store.touch(current);

      io.to(current.id).emit('move_made', {
        move,
        accuracy,
        evaluation: getEvaluation(current.state),
      });

      if (current.state.winner) {
        void finish(
          current,
          current.state.winner as Mark | 'Draw',
          current.state.winner === 'Draw' ? 'draw' : 'line',
        );
      } else {
        broadcast(current);
      }
    }, delay);
  }

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as GameSocket;
    socket.data.matchId = null;
    socket.data.chatTimes = [];

    const me = () => socket.data.user;

    // Create the profile document on first connection rather than on first game,
    // so a player who signs in and never plays still appears in the system.
    void ensureProfile(me());

    /** Resolve the match this socket claims to act on, with membership checked. */
    function requirePlayer(matchId: unknown): { match: Match; mark: Mark } | null {
      if (typeof matchId !== 'string' || !matchId) {
        fail(socket, 'BAD_REQUEST', 'Malformed request.');
        return null;
      }
      const match = store.get(matchId);
      if (!match) {
        fail(socket, 'ROOM_NOT_FOUND', 'This game no longer exists.');
        return null;
      }
      const mark = store.markOf(match, me().uid);
      if (!mark) {
        fail(socket, 'NOT_A_PLAYER', 'You are not a player in this game.');
        return null;
      }
      return { match, mark };
    }

    // ---------------------------------------------------------------
    // Create a room
    // ---------------------------------------------------------------
    socket.on('create_match', (payload: unknown, ack?: (r: unknown) => void) => {
      const opts = (payload ?? {}) as { mode?: string; botDifficulty?: number };
      const mode = opts.mode === 'bot' ? 'bot' : 'pvp';
      const difficulty =
        typeof opts.botDifficulty === 'number'
          ? Math.min(5, Math.max(1, Math.round(opts.botDifficulty)))
          : 3;

      const user = me();
      const match = store.create({
        mode,
        botDifficulty: difficulty,
        host: { uid: user.uid, name: user.name, photoURL: user.picture, socketId: socket.id },
      });

      socket.join(match.id);
      socket.data.matchId = match.id;
      ack?.({ ok: true, match: matchView(match, user.uid, store) });

      if (mode === 'bot') scheduleBotMove(match);
    });

    // ---------------------------------------------------------------
    // Join a room (also the reconnect / refresh path)
    // ---------------------------------------------------------------
    socket.on('join_match', (payload: unknown, ack?: (r: unknown) => void) => {
      const { matchId } = (payload ?? {}) as { matchId?: unknown };
      if (typeof matchId !== 'string' || !matchId) {
        ack?.({ ok: false, code: 'BAD_REQUEST', message: 'Malformed request.' });
        return;
      }

      // MatchStore.get normalises case, so any casing the player types works.
      const match = store.get(matchId);
      if (!match) {
        // Deliberately does NOT auto-create. A mistyped or expired code is an
        // error the player needs to see, not a silent new empty room.
        ack?.({
          ok: false,
          code: 'ROOM_NOT_FOUND',
          message: 'That game code is not valid. It may have expired.',
        });
        return;
      }

      const user = me();
      let mark = store.markOf(match, user.uid);

      if (!mark) {
        // Not already a player — can they take the open seat?
        const openMark: Mark | null =
          match.players.X === null ? 'X' : match.players.O === null ? 'O' : null;

        if (openMark === null) {
          // Both seats taken by other people. Watching a finished game is fine;
          // watching a live one is not something this product offers.
          if (match.status === 'finished') {
            socket.join(match.id);
            socket.data.matchId = match.id;
            ack?.({ ok: true, match: matchView(match, user.uid, store) });
            return;
          }
          ack?.({ ok: false, code: 'ROOM_FULL', message: 'This game is already full.' });
          return;
        }

        match.players[openMark] = {
          uid: user.uid,
          name: user.name,
          photoURL: user.picture,
          socketId: socket.id,
          disconnectedAt: null,
        };
        mark = openMark;
        if (match.players.X && match.players.O && match.status === 'waiting') {
          match.status = 'active';
        }
      } else {
        // Returning player: refresh, reconnect, or a second tab.
        const player = match.players[mark]!;
        player.socketId = socket.id;
        player.disconnectedAt = null;
      }

      socket.join(match.id);
      socket.data.matchId = match.id;
      store.touch(match);

      ack?.({ ok: true, match: matchView(match, user.uid, store) });
      broadcast(match);
      if (match.mode === 'bot') scheduleBotMove(match);
    });

    // ---------------------------------------------------------------
    // Make a move
    // ---------------------------------------------------------------
    socket.on('make_move', (payload: unknown) => {
      const { matchId, superGridIndex, subGridIndex } = (payload ?? {}) as {
        matchId?: unknown;
        superGridIndex?: unknown;
        subGridIndex?: unknown;
      };

      const found = requirePlayer(matchId);
      if (!found) return;
      const { match, mark } = found;

      if (match.status === 'finished') {
        fail(socket, 'GAME_OVER', 'This game has already ended.');
        return;
      }
      if (match.status === 'waiting') {
        fail(socket, 'NOT_YOUR_TURN', 'Waiting for an opponent to join.');
        return;
      }
      if (!isValidIndex(superGridIndex) || !isValidIndex(subGridIndex)) {
        fail(socket, 'BAD_REQUEST', 'Malformed move.');
        return;
      }
      // The turn check is what makes a double-click or a simultaneous move safe:
      // the first move flips `currentPlayer`, so the second is rejected here.
      if (match.state.currentPlayer !== mark) {
        fail(socket, 'NOT_YOUR_TURN', 'It is not your turn.');
        return;
      }
      if (!isValidMove(match.state, superGridIndex, subGridIndex)) {
        fail(socket, 'ILLEGAL_MOVE', 'That move is not legal.');
        return;
      }

      // The mark is taken from the verified player, never from the payload.
      const move: Move = { superGridIndex, subGridIndex, player: mark };
      const accuracy = evaluateMoveAccuracy(match.state, move);
      match.state = applyMove(match.state, move);
      match.drawOfferedBy = null;
      store.touch(match);

      io.to(match.id).emit('move_made', {
        move,
        accuracy,
        evaluation: getEvaluation(match.state),
      });

      if (match.state.winner) {
        void finish(
          match,
          match.state.winner as Mark | 'Draw',
          match.state.winner === 'Draw' ? 'draw' : 'line',
        );
      } else {
        broadcast(match);
        scheduleBotMove(match);
      }
    });

    // ---------------------------------------------------------------
    // Resign
    // ---------------------------------------------------------------
    socket.on('resign', (payload: unknown) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;
      if (match.status === 'finished') {
        fail(socket, 'GAME_OVER', 'This game has already ended.');
        return;
      }
      // The resigning mark is derived from the socket, so a player can only ever
      // resign themselves.
      void finish(match, mark === 'X' ? 'O' : 'X', 'resign');
    });

    // ---------------------------------------------------------------
    // Draw offers
    // ---------------------------------------------------------------
    socket.on('offer_draw', (payload: unknown) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;
      if (match.status !== 'active') {
        fail(socket, 'GAME_OVER', 'This game is not in play.');
        return;
      }
      if (match.mode === 'bot') {
        socket.emit('draw_declined');
        return;
      }
      match.drawOfferedBy = mark;
      store.touch(match);
      broadcast(match);
    });

    socket.on('accept_draw', (payload: unknown) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;
      // Only the player who did *not* make the offer can accept it. This is what
      // stops a spectator, or the offerer themselves, from ending the game.
      if (match.drawOfferedBy === null || match.drawOfferedBy === mark) {
        fail(socket, 'NO_DRAW_OFFER', 'There is no draw offer for you to accept.');
        return;
      }
      void finish(match, 'Draw', 'agreement');
    });

    socket.on('decline_draw', (payload: unknown) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;
      if (match.drawOfferedBy === null || match.drawOfferedBy === mark) {
        fail(socket, 'NO_DRAW_OFFER', 'There is no draw offer for you to decline.');
        return;
      }
      match.drawOfferedBy = null;
      store.touch(match);
      io.to(match.id).emit('draw_declined');
      broadcast(match);
    });

    // ---------------------------------------------------------------
    // Rematch — both players must agree
    // ---------------------------------------------------------------
    socket.on('request_rematch', (payload: unknown, ack?: (r: unknown) => void) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;

      if (match.status !== 'finished') {
        fail(socket, 'BAD_REQUEST', 'The game is still in play.');
        return;
      }

      // Already resolved by the other player's request — send them along.
      if (match.rematchMatchId) {
        ack?.({ ok: true, matchId: match.rematchMatchId });
        return;
      }

      match.rematchRequestedBy.add(mark);
      store.touch(match);

      const bothAgreed =
        match.mode === 'bot' ||
        (match.rematchRequestedBy.has('X') && match.rematchRequestedBy.has('O'));

      if (!bothAgreed) {
        broadcast(match);
        ack?.({ ok: true, pending: true });
        return;
      }

      // Swap marks so the player who went second gets to start this time.
      const previousX = match.players.X!;
      const previousO = match.players.O!;
      const rematch = store.create({
        mode: match.mode,
        botDifficulty: match.botDifficulty,
        host: {
          uid: previousO.uid,
          name: previousO.name,
          photoURL: previousO.photoURL,
          socketId: previousO.socketId,
        },
        hostMark: 'X',
      });
      // Seat the former X as O, preserving both identities.
      rematch.players.O = { ...previousX, disconnectedAt: null };
      if (match.mode === 'bot') {
        rematch.status = 'active';
      } else {
        rematch.status = rematch.players.X && rematch.players.O ? 'active' : 'waiting';
      }

      match.rematchMatchId = rematch.id;
      broadcast(match);
      io.to(match.id).emit('rematch_ready', { matchId: rematch.id });
      ack?.({ ok: true, matchId: rematch.id });
    });

    // ---------------------------------------------------------------
    // In-game chat
    // ---------------------------------------------------------------
    socket.on('send_message', (payload: unknown) => {
      const { matchId, text } = (payload ?? {}) as { matchId?: unknown; text?: unknown };
      const found = requirePlayer(matchId);
      if (!found) return;

      if (typeof text !== 'string' || text.trim().length === 0 || text.length > 500) {
        fail(socket, 'BAD_REQUEST', 'Message must be between 1 and 500 characters.');
        return;
      }

      // Simple sliding window: 5 messages per 10 seconds.
      const now = Date.now();
      socket.data.chatTimes = socket.data.chatTimes.filter((t: number) => now - t < 10_000);
      if (socket.data.chatTimes.length >= 5) {
        fail(socket, 'RATE_LIMITED', 'You are sending messages too quickly.');
        return;
      }
      socket.data.chatTimes.push(now);

      // The sender name comes from the verified token, not the payload.
      io.to(found.match.id).emit('message_received', {
        senderUid: me().uid,
        senderName: me().name,
        text: text.trim(),
        at: now,
      });
    });

    // ---------------------------------------------------------------
    // Hint — players only, and never for your opponent's position
    // ---------------------------------------------------------------
    socket.on('request_hint', (payload: unknown) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;
      if (match.status !== 'active' || match.state.currentPlayer !== mark) {
        fail(socket, 'NOT_YOUR_TURN', 'Hints are only available on your turn.');
        return;
      }
      const hint = getBestMove(match.state, 3);
      if (hint) socket.emit('receive_hint', hint);
    });

    // ---------------------------------------------------------------
    // Leaving
    // ---------------------------------------------------------------
    socket.on('leave_match', (payload: unknown) => {
      const found = requirePlayer((payload as { matchId?: unknown })?.matchId);
      if (!found) return;
      const { match, mark } = found;
      socket.leave(match.id);
      socket.data.matchId = null;
      // Leaving a game in progress is a forfeit; leaving a finished one is not.
      if (match.status === 'active') {
        void finish(match, mark === 'X' ? 'O' : 'X', 'resign');
      }
    });

    socket.on('disconnect', () => {
      const matchId = socket.data.matchId;
      if (!matchId) return;
      const match = store.get(matchId);
      if (!match) return;

      const mark = store.markOf(match, me().uid);
      if (!mark) return;
      const player = match.players[mark];
      // Only clear the seat if this is still the socket we have on file. A
      // refresh opens the new socket before the old one closes, and without this
      // check the stale close would mark a present player as disconnected.
      if (!player || player.socketId !== socket.id) return;

      player.socketId = null;
      player.disconnectedAt = Date.now();
      broadcast(match);
    });
  });

  /**
   * Forfeit players who disconnected and never came back, and reap dead matches.
   * Runs on an interval rather than a per-player timer so a server restart
   * cannot leave orphaned timers behind.
   */
  const sweeper = setInterval(() => {
    const now = Date.now();

    for (const match of store.all()) {
      if (match.status !== 'active' || match.mode !== 'pvp') continue;
      for (const mark of ['X', 'O'] as Mark[]) {
        const player = match.players[mark];
        if (!player || player.disconnectedAt === null) continue;
        if (now - player.disconnectedAt > RECONNECT_GRACE_MS) {
          void finish(match, mark === 'X' ? 'O' : 'X', 'resign');
          break;
        }
      }
    }

    for (const id of store.reap(now)) {
      io.to(id).emit('match_expired', { matchId: id });
    }
  }, 10_000);

  // Do not hold the process open in tests.
  if (typeof sweeper.unref === 'function') sweeper.unref();
}
