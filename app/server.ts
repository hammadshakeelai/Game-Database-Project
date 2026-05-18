import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import os from 'os';
import { GameState, Move, applyMove, createInitialState, isValidMove } from './src/gameLogic.js';
import { evaluateMoveAccuracy, getBestMove, getEvaluation } from './src/aiEvaluator.js';

function getLanAddresses(): string[] {
  const nets = os.networkInterfaces();
  const results: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

// ============================================================
// Types
// ============================================================

interface ActiveGame {
  state: GameState;
  players: { X: string; O: string };
  sockets: { X: string | null; O: string | null };
  isBotMatch?: boolean;
  botDifficulty?: number;
  /** True when O is a seeded dummy player driven by the bot AI but
   *  presented to the client as PvP for stat tracking. */
  isDummyOpponent?: boolean;
  dummyUid?: string;
  lastActivity: number;
}

interface QueueEntry {
  socketId: string;
  userId: string;
  enqueuedAt: number;
  timer: NodeJS.Timeout;
  /** Pool of seeded dummies the client knows about, used if no human appears in time. */
  dummyPool: Array<{ uid: string; elo: number; username: string }>;
  userElo: number;
}

const QUEUE_TIMEOUT_MS = 1200;
const DUMMY_MOVE_MIN_MS = 900;

// ============================================================
// Server Setup
// ============================================================

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const PORT = 3000;
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeGames: activeGames.size });
  });

  // matchId -> ActiveGame
  const activeGames = new Map<string, ActiveGame>();
  // socketId -> { matchId, userId }
  const socketToMatch = new Map<string, { matchId: string; userId: string }>();
  // Quick Match queue (waiting humans)
  const matchQueue: QueueEntry[] = [];

  function genMatchId(prefix = 'M') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function dequeueByUserId(userId: string): QueueEntry | undefined {
    const idx = matchQueue.findIndex(q => q.userId === userId);
    if (idx === -1) return undefined;
    const [entry] = matchQueue.splice(idx, 1);
    clearTimeout(entry.timer);
    return entry;
  }

  function dequeueBySocketId(socketId: string): QueueEntry | undefined {
    const idx = matchQueue.findIndex(q => q.socketId === socketId);
    if (idx === -1) return undefined;
    const [entry] = matchQueue.splice(idx, 1);
    clearTimeout(entry.timer);
    return entry;
  }

  /** Map a user's Elo to a bot difficulty bucket (1..5). */
  function difficultyForElo(elo: number): number {
    if (elo < 1100) return 2;
    if (elo < 1500) return 3;
    if (elo < 1900) return 4;
    return 5;
  }

  /** Fallback pool used when the client hasn't seeded demo players yet. */
  const BUILTIN_POOL = [
    { uid: 'P001', elo: 2185, username: 'Ava Khan' },
    { uid: 'P003', elo: 2354, username: 'Henry Lewis' },
    { uid: 'P007', elo: 2172, username: 'Sebastian Wilson' },
    { uid: 'P010', elo: 2116, username: 'Amelia Turner' },
    { uid: 'P011', elo: 1995, username: 'Ethan Lee' },
    { uid: 'P018', elo: 1666, username: 'Elijah Green' },
    { uid: 'P021', elo: 1794, username: 'Noah Roberts' },
    { uid: 'P027', elo: 1938, username: 'Sebastian Wilson' },
    { uid: 'P028', elo: 1442, username: 'Lucas Ahmed' },
    { uid: 'P033', elo: 1123, username: 'Daniel Wilson' },
    { uid: 'P034', elo: 2158, username: 'Hannah Carter' },
    { uid: 'P037', elo: 2318, username: 'Evelyn Patel' },
    { uid: 'P050', elo: 2307, username: 'Lily Walker' },
    { uid: 'P084', elo: 2020, username: 'Alexander Ahmed' },
  ];

  /** When a queued user times out, promote them to a dummy-opponent match. */
  function promoteToDummyMatch(entry: QueueEntry) {
    const pool = entry.dummyPool.length > 0 ? entry.dummyPool : BUILTIN_POOL;
    const dummy = pool[Math.floor(Math.random() * pool.length)];
    const matchId = genMatchId('Q');

    activeGames.set(matchId, {
      state: createInitialState(),
      players: { X: entry.userId, O: dummy.uid },
      sockets: { X: entry.socketId, O: null },
      isBotMatch: true,
      isDummyOpponent: true,
      dummyUid: dummy.uid,
      botDifficulty: difficultyForElo(dummy.elo),
      lastActivity: Date.now(),
    });

    const sock = io.sockets.sockets.get(entry.socketId);
    if (sock) {
      sock.join(matchId);
      socketToMatch.set(entry.socketId, { matchId, userId: entry.userId });
    }
    io.to(entry.socketId).emit('match_found', {
      matchId,
      opponentUid: dummy.uid,
      isDummyOpponent: true,
    });
    console.log(`Quick Match: user ${entry.userId} paired with dummy ${dummy.uid} (${dummy.username}) in ${matchId}`);
  }

  // ============================================================
  // Cleanup: remove stale games every 5 minutes
  // ============================================================
  const STALE_GAME_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  setInterval(() => {
    const now = Date.now();
    for (const [matchId, game] of activeGames.entries()) {
      if (now - game.lastActivity > STALE_GAME_TIMEOUT) {
        console.log(`Cleaning up stale game: ${matchId}`);
        io.to(matchId).emit('error', { message: 'Game expired due to inactivity.' });
        activeGames.delete(matchId);
      }
    }
  }, 5 * 60 * 1000);

  // ============================================================
  // Socket Handlers
  // ============================================================

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- Create Match ---
    socket.on('create_match', ({ matchId, userId, isBotMatch, botDifficulty }) => {
      if (activeGames.has(matchId)) {
        socket.emit('error', { message: 'Match ID already exists.' });
        return;
      }

      activeGames.set(matchId, {
        state: createInitialState(),
        players: { X: userId, O: isBotMatch ? 'BOT' : '' },
        sockets: { X: socket.id, O: null },
        isBotMatch,
        botDifficulty: botDifficulty || 3,
        lastActivity: Date.now(),
      });

      socket.join(matchId);
      socketToMatch.set(socket.id, { matchId, userId });
      console.log(`Match ${matchId} created by ${userId} (Bot: ${isBotMatch})`);

      // If it's a bot match, emit initial state immediately
      if (isBotMatch) {
        io.to(matchId).emit('match_state', activeGames.get(matchId)!.state);
      }
    });

    // --- Join Match ---
    socket.on('join_match', ({ matchId, userId }) => {
      let game = activeGames.get(matchId);

      if (!game) {
        // If match doesn't exist, auto-create for joining
        const isBotMatch = matchId.startsWith('bot_');
        game = {
          state: createInitialState(),
          players: { X: userId, O: isBotMatch ? 'BOT' : '' },
          sockets: { X: socket.id, O: null },
          isBotMatch,
          botDifficulty: 3,
          lastActivity: Date.now(),
        };
        activeGames.set(matchId, game);
        console.log(`Match ${matchId} auto-created by ${userId}`);
      } else {
        // Assign player O if not taken
        if (!game.players.O && game.players.X !== userId) {
          game.players.O = userId;
          game.sockets.O = socket.id;
        }
        // Handle reconnection: update socket mapping
        if (game.players.X === userId) {
          game.sockets.X = socket.id;
        } else if (game.players.O === userId) {
          game.sockets.O = socket.id;
        }
        game.lastActivity = Date.now();
      }

      socket.join(matchId);
      socketToMatch.set(socket.id, { matchId, userId });

      const role = game.players.X === userId
        ? 'X'
        : (game.players.O === userId ? 'O' : 'Spectator');

      const opponentUid = role === 'X'
        ? (game.players.O || '')
        : role === 'O' ? game.players.X : '';
      socket.emit('match_joined', { state: game.state, role, opponentUid });
      io.to(matchId).emit('match_state', game.state);
      console.log(`User ${userId} joined match ${matchId} as ${role}`);

      // If a Quick Match dummy game was just joined, kick off O's first move
      // (only if it's O's turn — currently O moves second so this is normally a no-op,
      // but covers any future variant).
      if (game.isBotMatch && game.state.currentPlayer === 'O' && !game.state.winner) {
        handleBotMove(matchId);
      }
    });

    /** Build the matchDetails payload, masking dummy-opponent matches as PvP. */
    const buildMatchDetails = (game: ActiveGame, movesCount: number) => ({
      player_x: game.players.X,
      player_o: game.players.O,
      // Dummy matches must look like PvP to the client so Elo/stats update.
      isBotMatch: game.isDummyOpponent ? false : (game.isBotMatch || false),
      botDifficulty: game.botDifficulty,
      moves_count: movesCount,
      isDummyOpponent: game.isDummyOpponent,
      dummyUid: game.dummyUid,
    });

    // --- Bot Move Logic ---
    const handleBotMove = (matchId: string) => {
      const game = activeGames.get(matchId);
      if (!game || !game.isBotMatch || game.state.winner) return;

      // Bot plays as O
      if (game.state.currentPlayer === 'O') {
        // Delay proportional to difficulty for realism.
        // Dummy-opponent matches get a slower, more human-feeling floor.
        const diff = game.botDifficulty || 3;
        const delay = game.isDummyOpponent
          ? Math.max(DUMMY_MOVE_MIN_MS, 1800 - diff * 150)
          : Math.max(300, 800 - diff * 100);

        setTimeout(() => {
          // Re-check game state (might have been resigned/drawn during delay)
          const currentGame = activeGames.get(matchId);
          if (!currentGame || currentGame.state.winner || currentGame.state.currentPlayer !== 'O') return;

          const botMove = getBestMove(currentGame.state, currentGame.botDifficulty);
          if (botMove) {
            const stateBefore = currentGame.state;
            const accuracy = evaluateMoveAccuracy(stateBefore, botMove);
            const newState = applyMove(stateBefore, botMove);
            currentGame.state = newState;
            currentGame.lastActivity = Date.now();

            io.to(matchId).emit('move_made', {
              move: botMove,
              state: newState,
              accuracy,
              evaluation: getEvaluation(newState)
            });

            if (newState.winner) {
              io.to(matchId).emit('game_over', {
                winner: newState.winner,
                matchDetails: buildMatchDetails(currentGame, newState.moves.length),
              });
              activeGames.delete(matchId);
            }
          }
        }, delay);
      }
    };

    // --- Make Move ---
    socket.on('make_move', (data) => {
      const { matchId, move } = data;
      const game = activeGames.get(matchId);
      if (!game) {
        socket.emit('error', { message: 'Match not found.' });
        return;
      }

      // Verify the socket belongs to the current player
      const mapping = socketToMatch.get(socket.id);
      if (!mapping || mapping.matchId !== matchId) {
        socket.emit('error', { message: 'You are not in this match.' });
        return;
      }

      const playerRole = game.players.X === mapping.userId
        ? 'X'
        : (game.players.O === mapping.userId ? 'O' : null);

      if (playerRole !== game.state.currentPlayer) {
        socket.emit('error', { message: 'Not your turn.' });
        return;
      }

      // Prevent human from playing bot's turn
      if (game.isBotMatch && game.state.currentPlayer === 'O') {
        socket.emit('error', { message: 'Not your turn.' });
        return;
      }

      // Server-side move validation
      if (!isValidMove(game.state, move.superGridIndex, move.subGridIndex)) {
        socket.emit('error', { message: 'Invalid move.' });
        return;
      }

      // Ensure the move's player field matches
      const validatedMove: Move = {
        superGridIndex: move.superGridIndex,
        subGridIndex: move.subGridIndex,
        player: game.state.currentPlayer,
      };

      const stateBefore = game.state;
      const accuracy = evaluateMoveAccuracy(stateBefore, validatedMove);
      const newState = applyMove(stateBefore, validatedMove);
      game.state = newState;
      game.lastActivity = Date.now();

      io.to(matchId).emit('move_made', {
        move: validatedMove,
        state: newState,
        accuracy,
        evaluation: getEvaluation(newState)
      });

      if (newState.winner) {
        io.to(matchId).emit('game_over', {
          winner: newState.winner,
          matchDetails: buildMatchDetails(game, newState.moves.length),
        });
        activeGames.delete(matchId);
      } else if (game.isBotMatch) {
        handleBotMove(matchId);
      }
    });

    // --- Request Hint ---
    socket.on('request_hint', (data) => {
      const { matchId } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        const hintMove = getBestMove(game.state, 3);
        if (hintMove) {
          socket.emit('receive_hint', hintMove);
        }
      }
    });

    // --- Resign ---
    socket.on('resign', (data) => {
      const { matchId, player } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        const winner = player === 'X' ? 'O' : 'X';
        game.state = { ...game.state, winner };

        io.to(matchId).emit('game_over', {
          winner,
          matchDetails: buildMatchDetails(game, game.state.moves.length),
        });
        activeGames.delete(matchId);
      }
    });

    // --- Draw Offers ---
    socket.on('offer_draw', (data) => {
      const { matchId, player } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        if (game.isBotMatch) {
          socket.emit('draw_declined');
        } else {
          socket.to(matchId).emit('draw_offered', { by: player });
        }
      }
    });

    socket.on('accept_draw', (data) => {
      const { matchId } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        game.state = { ...game.state, winner: 'Draw' };
        io.to(matchId).emit('game_over', {
          winner: 'Draw',
          matchDetails: buildMatchDetails(game, game.state.moves.length),
        });
        activeGames.delete(matchId);
      }
    });

    socket.on('decline_draw', (data) => {
      const { matchId } = data;
      socket.to(matchId).emit('draw_declined');
    });

    // --- Chat ---
    socket.on('send_message', (data) => {
      const { roomId, message, sender, timestamp } = data;
      io.to(roomId).emit('receive_message', { roomId, sender, message, timestamp });
    });

    socket.on('global_chat_send', (data) => {
      const { message, sender, timestamp } = data;
      io.emit('global_chat_receive', { sender, message, timestamp });
    });

    // --- Generic Rooms (used by clan chat) ---
    socket.on('join_room', ({ roomId }) => {
      if (typeof roomId === 'string' && roomId.length > 0) socket.join(roomId);
    });

    socket.on('leave_room', ({ roomId }) => {
      if (typeof roomId === 'string' && roomId.length > 0) socket.leave(roomId);
    });

    // --- Quick Match queue ---
    socket.on('join_queue', ({ userId, dummyPool }) => {
      if (!userId) return;
      // Dedupe: drop any prior entry for this userId (reconnect or double-click).
      dequeueByUserId(userId);

      // If someone else is already waiting, pair them and skip the timer.
      const waiting = matchQueue.find(q => q.userId !== userId);
      if (waiting) {
        dequeueByUserId(waiting.userId);
        const matchId = genMatchId('Q');
        activeGames.set(matchId, {
          state: createInitialState(),
          players: { X: waiting.userId, O: userId },
          sockets: { X: waiting.socketId, O: socket.id },
          isBotMatch: false,
          lastActivity: Date.now(),
        });
        const waitingSock = io.sockets.sockets.get(waiting.socketId);
        if (waitingSock) {
          waitingSock.join(matchId);
          socketToMatch.set(waiting.socketId, { matchId, userId: waiting.userId });
        }
        socket.join(matchId);
        socketToMatch.set(socket.id, { matchId, userId });

        io.to(waiting.socketId).emit('match_found', {
          matchId,
          opponentUid: userId,
          isDummyOpponent: false,
        });
        socket.emit('match_found', {
          matchId,
          opponentUid: waiting.userId,
          isDummyOpponent: false,
        });
        console.log(`Quick Match: paired humans ${waiting.userId} & ${userId} in ${matchId}`);
        return;
      }

      // Nobody to pair with — enqueue with a 5 s fallback timer.
      const elos = (dummyPool ?? []).map(d => d.elo);
      const userEntry: QueueEntry = {
        socketId: socket.id,
        userId,
        enqueuedAt: Date.now(),
        dummyPool: dummyPool ?? [],
        userElo: elos.length ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 1200,
        timer: setTimeout(() => {
          const still = dequeueByUserId(userId);
          if (still) promoteToDummyMatch(still);
        }, QUEUE_TIMEOUT_MS),
      };
      matchQueue.push(userEntry);
      console.log(`Quick Match: user ${userId} enqueued (queue=${matchQueue.length})`);
    });

    socket.on('leave_queue', ({ userId }) => {
      const entry = dequeueByUserId(userId);
      if (entry) {
        io.to(entry.socketId).emit('queue_cancelled', { reason: 'user' });
      }
    });

    // --- Rematch ---
    socket.on('request_rematch', (data) => {
      const { matchId } = data;
      socket.to(matchId).emit('rematch_offered');
    });

    socket.on('accept_rematch', (data) => {
      const { matchId, userId } = data;
      const newMatchId = matchId + '_r' + Date.now().toString(36).slice(-4);

      const newGame: ActiveGame = {
        state: createInitialState(),
        players: { X: userId, O: '' }, // Will be filled when opponent joins
        sockets: { X: socket.id, O: null },
        isBotMatch: false,
        botDifficulty: 3,
        lastActivity: Date.now(),
      };

      activeGames.set(newMatchId, newGame);
      io.to(matchId).emit('rematch_created', { newMatchId });
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Purge any queue entry for this socket.
      dequeueBySocketId(socket.id);

      const mapping = socketToMatch.get(socket.id);
      if (mapping) {
        const game = activeGames.get(mapping.matchId);
        if (game) {
          // Notify other players
          socket.to(mapping.matchId).emit('opponent_disconnected', {
            userId: mapping.userId
          });
        }
        socketToMatch.delete(socket.id);
      }
    });
  });

  // ============================================================
  // Vite / Static File Serving
  // ============================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    const lans = getLanAddresses();
    if (lans.length > 0) {
      console.log('\nTo play / chat across computers on the same Wi-Fi, open one of these on the OTHER PC:');
      lans.forEach(ip => console.log(`   http://${ip}:${PORT}`));
      console.log('(only ONE PC runs `npm run dev`. The other PC just opens the URL above in a browser.)\n');
    }
  });
}

startServer();
