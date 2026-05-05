import { useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { GameState, Move, MoveAccuracyLog, AccuracyResult } from '../types';

interface UseGameStateProps {
  socket: Socket | null;
  matchId: string | undefined;
  userId: string | undefined;
}

interface UseGameStateReturn {
  gameState: GameState | null;
  playerRole: 'X' | 'O' | 'Spectator' | null;
  accuracyLog: MoveAccuracyLog[];
  evaluation: number;
  hintMove: Move | null;
  gameOverData: GameOverData | null;
  drawOffer: { by: 'X' | 'O' } | null;
  drawDeclined: boolean;
  opponentDisconnected: boolean;
  makeMove: (superIdx: number, subIdx: number) => void;
  requestHint: () => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  dismissGameOver: () => void;
  dismissDrawDeclined: () => void;
}

export interface GameOverData {
  winner: string | null;
  matchDetails: {
    player_x: string;
    player_o: string;
    isBotMatch: boolean;
    moves_count: number;
    botDifficulty?: number;
  };
}

/**
 * Encapsulates all game state management and socket event handling.
 * Fixes the stale closure bug by using refs for values accessed inside callbacks.
 */
export function useGameState({ socket, matchId, userId }: UseGameStateProps): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerRole, setPlayerRole] = useState<'X' | 'O' | 'Spectator' | null>(null);
  const [accuracyLog, setAccuracyLog] = useState<MoveAccuracyLog[]>([]);
  const [evaluation, setEvaluation] = useState(0);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [drawOffer, setDrawOffer] = useState<{ by: 'X' | 'O' } | null>(null);
  const [drawDeclined, setDrawDeclined] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // Refs to avoid stale closures in socket event handlers
  const playerRoleRef = useRef(playerRole);
  playerRoleRef.current = playerRole;

  const accuracyLogRef = useRef(accuracyLog);
  accuracyLogRef.current = accuracyLog;

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Register socket event listeners
  useEffect(() => {
    if (!socket || !matchId || !userId) return;

    // Join the match
    socket.emit('join_match', { matchId, userId });

    const onMatchJoined = ({ state, role }: { state: GameState; role: 'X' | 'O' | 'Spectator' }) => {
      setGameState(state);
      setPlayerRole(role);
    };

    const onMatchState = (state: GameState) => {
      setGameState(state);
    };

    const onMoveMade = ({ move, state, accuracy, evaluation: evalScore }: {
      move: Move;
      state: GameState;
      accuracy: AccuracyResult;
      evaluation: number;
    }) => {
      setGameState(state);
      setHintMove(null);
      if (evalScore !== undefined) setEvaluation(evalScore);
      if (accuracy) {
        setAccuracyLog(prev => [...prev, {
          move,
          label: accuracy.label,
          delta: accuracy.heuristicDelta
        }]);
      }
    };

    const onReceiveHint = (move: Move) => {
      setHintMove(move);
    };

    const onGameOver = (data: GameOverData) => {
      setGameOverData(data);
    };

    const onDrawOffered = (data: { by: 'X' | 'O' }) => {
      setDrawOffer(data);
    };

    const onDrawDeclined = () => {
      setDrawDeclined(true);
    };

    const onOpponentDisconnected = () => {
      setOpponentDisconnected(true);
    };

    const onOpponentReconnected = () => {
      setOpponentDisconnected(false);
    };

    socket.on('match_joined', onMatchJoined);
    socket.on('match_state', onMatchState);
    socket.on('move_made', onMoveMade);
    socket.on('receive_hint', onReceiveHint);
    socket.on('game_over', onGameOver);
    socket.on('draw_offered', onDrawOffered);
    socket.on('draw_declined', onDrawDeclined);
    socket.on('opponent_disconnected', onOpponentDisconnected);

    return () => {
      socket.off('match_joined', onMatchJoined);
      socket.off('match_state', onMatchState);
      socket.off('move_made', onMoveMade);
      socket.off('receive_hint', onReceiveHint);
      socket.off('game_over', onGameOver);
      socket.off('draw_offered', onDrawOffered);
      socket.off('draw_declined', onDrawDeclined);
      socket.off('opponent_disconnected', onOpponentDisconnected);
    };
  }, [socket, matchId, userId]);

  // --- Action Callbacks ---

  const makeMove = useCallback((superIdx: number, subIdx: number) => {
    if (!socket || !gameStateRef.current || !playerRoleRef.current) return;
    const state = gameStateRef.current;
    const role = playerRoleRef.current;

    if (state.currentPlayer !== role || role === 'Spectator') return;
    if (state.winner !== null) return;
    if (state.nextRequiredSubBoard !== null && state.nextRequiredSubBoard !== superIdx) return;
    if (state.subBoardWinners[superIdx] !== null) return;
    if (state.superBoard[superIdx][subIdx] !== null) return;

    const move: Move = {
      superGridIndex: superIdx,
      subGridIndex: subIdx,
      player: role as 'X' | 'O'
    };
    socket.emit('make_move', { matchId, move });
  }, [socket, matchId]);

  const requestHint = useCallback(() => {
    if (!socket) return;
    socket.emit('request_hint', { matchId });
  }, [socket, matchId]);

  const resign = useCallback(() => {
    if (!socket || !playerRoleRef.current || playerRoleRef.current === 'Spectator') return;
    socket.emit('resign', { matchId, player: playerRoleRef.current });
  }, [socket, matchId]);

  const offerDraw = useCallback(() => {
    if (!socket || !playerRoleRef.current || playerRoleRef.current === 'Spectator') return;
    socket.emit('offer_draw', { matchId, player: playerRoleRef.current });
  }, [socket, matchId]);

  const acceptDraw = useCallback(() => {
    if (!socket) return;
    socket.emit('accept_draw', { matchId });
    setDrawOffer(null);
  }, [socket, matchId]);

  const declineDraw = useCallback(() => {
    if (!socket) return;
    socket.emit('decline_draw', { matchId });
    setDrawOffer(null);
  }, [socket, matchId]);

  const dismissGameOver = useCallback(() => {
    setGameOverData(null);
  }, []);

  const dismissDrawDeclined = useCallback(() => {
    setDrawDeclined(false);
  }, []);

  return {
    gameState,
    playerRole,
    accuracyLog,
    evaluation,
    hintMove,
    gameOverData,
    drawOffer,
    drawDeclined,
    opponentDisconnected,
    makeMove,
    requestHint,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    dismissGameOver,
    dismissDrawDeclined,
  };
}
