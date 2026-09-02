import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { isValidMove } from '../../gameLogic';
import type { Move } from '../../types';
import {
  ERROR_COPY,
  type ChatMessage,
  type GameError,
  type JoinResult,
  type MatchView,
  type MoveEvent,
} from './types';

/**
 * Live state for one match.
 *
 * The server is authoritative: this hook never computes a board itself. It
 * validates locally only to avoid sending a move the server would certainly
 * reject, which keeps the board feeling responsive without ever letting the
 * client's opinion win.
 */

export type JoinState = 'idle' | 'joining' | 'joined' | 'error';

interface UseMatchResult {
  match: MatchView | null;
  joinState: JoinState;
  joinError: string | null;
  actionError: string | null;
  messages: ChatMessage[];
  hint: Move | null;
  /** Set when a rematch is ready and the players should move to a new game. */
  rematchMatchId: string | null;
  expired: boolean;
  makeMove: (superGridIndex: number, subGridIndex: number) => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  requestRematch: () => void;
  requestHint: () => void;
  sendMessage: (text: string) => void;
  dismissActionError: () => void;
}

export function useMatch(socket: Socket | null, matchId: string | undefined): UseMatchResult {
  const [match, setMatch] = useState<MatchView | null>(null);
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hint, setHint] = useState<Move | null>(null);
  const [rematchMatchId, setRematchMatchId] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Socket callbacks read these without re-subscribing on every state change.
  const matchRef = useRef<MatchView | null>(null);
  matchRef.current = match;

  useEffect(() => {
    if (!socket || !matchId) return;

    let cancelled = false;
    setJoinState('joining');
    setJoinError(null);
    setExpired(false);
    setMessages([]);
    setRematchMatchId(null);

    /** Join, and re-join automatically after any reconnect. */
    const join = () => {
      socket.emit('join_match', { matchId }, (res: JoinResult) => {
        if (cancelled) return;
        if (res.ok) {
          setMatch(res.match);
          setJoinState('joined');
          setJoinError(null);
        } else {
          setJoinState('error');
          setJoinError(ERROR_COPY[res.code] ?? res.message);
        }
      });
    };

    join();

    const onUpdate = (view: MatchView) => setMatch(view);

    // The server always sends an authoritative match_update straight after a
    // move, so this only needs to clear the now-stale hint.
    const onMove = (_evt: MoveEvent) => setHint(null);

    const onError = (err: GameError) => {
      setActionError(ERROR_COPY[err.code] ?? err.message);
    };

    const onHint = (move: Move) => setHint(move);
    const onMessage = (msg: ChatMessage) => setMessages(prev => [...prev.slice(-49), msg]);
    const onDrawDeclined = () => setActionError('Your draw offer was declined.');
    const onRematchReady = ({ matchId: id }: { matchId: string }) => setRematchMatchId(id);
    const onExpired = () => setExpired(true);
    // socket.io fires this on every successful reconnect.
    const onConnect = () => join();

    socket.on('match_update', onUpdate);
    socket.on('move_made', onMove);
    socket.on('game_error', onError);
    socket.on('receive_hint', onHint);
    socket.on('message_received', onMessage);
    socket.on('draw_declined', onDrawDeclined);
    socket.on('rematch_ready', onRematchReady);
    socket.on('match_expired', onExpired);
    socket.on('connect', onConnect);

    return () => {
      cancelled = true;
      socket.off('match_update', onUpdate);
      socket.off('move_made', onMove);
      socket.off('game_error', onError);
      socket.off('receive_hint', onHint);
      socket.off('message_received', onMessage);
      socket.off('draw_declined', onDrawDeclined);
      socket.off('rematch_ready', onRematchReady);
      socket.off('match_expired', onExpired);
      socket.off('connect', onConnect);
    };
  }, [socket, matchId]);

  const makeMove = useCallback(
    (superGridIndex: number, subGridIndex: number) => {
      const current = matchRef.current;
      if (!socket || !current || current.status !== 'active') return;
      if (current.role === 'spectator') return;
      if (current.state.currentPlayer !== current.role) return;
      // Local pre-check only, to avoid an obviously doomed round trip.
      if (!isValidMove(current.state, superGridIndex, subGridIndex)) return;
      socket.emit('make_move', { matchId, superGridIndex, subGridIndex });
    },
    [socket, matchId],
  );

  const simpleAction = useCallback(
    (event: string) => () => {
      if (!socket || !matchId) return;
      socket.emit(event, { matchId });
    },
    [socket, matchId],
  );

  const requestRematch = useCallback(() => {
    if (!socket || !matchId) return;
    socket.emit('request_rematch', { matchId }, (res: { ok: boolean; matchId?: string }) => {
      if (res?.ok && res.matchId) setRematchMatchId(res.matchId);
    });
  }, [socket, matchId]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!socket || !matchId || !trimmed) return;
      socket.emit('send_message', { matchId, text: trimmed.slice(0, 500) });
    },
    [socket, matchId],
  );

  return {
    match,
    joinState,
    joinError,
    actionError,
    messages,
    hint,
    rematchMatchId,
    expired,
    makeMove,
    resign: simpleAction('resign'),
    offerDraw: simpleAction('offer_draw'),
    acceptDraw: simpleAction('accept_draw'),
    declineDraw: simpleAction('decline_draw'),
    requestRematch,
    requestHint: simpleAction('request_hint'),
    sendMessage,
    dismissActionError: useCallback(() => setActionError(null), []),
  };
}
