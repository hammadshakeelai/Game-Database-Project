import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameState, Move, applyMove, createInitialState, isValidMove } from './src/gameLogic.js';
import { evaluateMoveAccuracy, getBestMove, getEvaluation } from './src/aiEvaluator.js';

// ============================================================
// Types
// ============================================================

interface ActiveGame {
  state: GameState;
  players: { X: string; O: string };
  sockets: { X: string | null; O: string | null };
  isBotMatch?: boolean;
  botDifficulty?: number;
  lastActivity: number;
}

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

      socket.emit('match_joined', { state: game.state, role });
      io.to(matchId).emit('match_state', game.state);
      console.log(`User ${userId} joined match ${matchId} as ${role}`);
    });

    // --- Bot Move Logic ---
    const handleBotMove = (matchId: string) => {
      const game = activeGames.get(matchId);
      if (!game || !game.isBotMatch || game.state.winner) return;

      // Bot plays as O
      if (game.state.currentPlayer === 'O') {
        // Delay proportional to difficulty for realism
        const delay = Math.max(300, 800 - (game.botDifficulty || 3) * 100);

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
                matchDetails: {
                  player_x: currentGame.players.X,
                  player_o: currentGame.players.O,
                  isBotMatch: currentGame.isBotMatch || false,
                  moves_count: newState.moves.length,
                  botDifficulty: currentGame.botDifficulty
                }
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
          matchDetails: {
            player_x: game.players.X,
            player_o: game.players.O,
            isBotMatch: game.isBotMatch || false,
            botDifficulty: game.botDifficulty,
            moves_count: newState.moves.length
          }
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
          matchDetails: {
            player_x: game.players.X,
            player_o: game.players.O,
            isBotMatch: game.isBotMatch || false,
            botDifficulty: game.botDifficulty,
            moves_count: game.state.moves.length
          }
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
          matchDetails: {
            player_x: game.players.X,
            player_o: game.players.O,
            isBotMatch: game.isBotMatch || false,
            botDifficulty: game.botDifficulty,
            moves_count: game.state.moves.length
          }
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
      io.to(roomId).emit('receive_message', { sender, message, timestamp });
    });

    socket.on('global_chat_send', (data) => {
      const { message, sender, timestamp } = data;
      io.emit('global_chat_receive', { sender, message, timestamp });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
