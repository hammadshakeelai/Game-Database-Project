import type { GameState, Move } from '../../types';

/** Shared vocabulary for the client half of the multiplayer protocol. */

export type Mark = 'X' | 'O';
export type Role = Mark | 'spectator';
export type MatchMode = 'pvp' | 'bot';
export type MatchStatus = 'waiting' | 'active' | 'finished';
export type EndReason = 'line' | 'draw' | 'resign' | 'agreement';

export interface PublicPlayer {
  uid: string;
  name: string;
  photoURL: string | null;
  connected: boolean;
}

/** The server's view of a match, as sent to one particular viewer. */
export interface MatchView {
  id: string;
  mode: MatchMode;
  status: MatchStatus;
  state: GameState;
  role: Role;
  players: { X: PublicPlayer | null; O: PublicPlayer | null };
  result: { winner: Mark | 'Draw'; reason: EndReason } | null;
  drawOfferedBy: Mark | null;
  rematchRequestedBy: Mark[];
  rematchMatchId: string | null;
}

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

export interface GameError {
  code: ErrorCode;
  message: string;
}

export interface ChatMessage {
  senderUid: string;
  senderName: string;
  text: string;
  at: number;
}

export interface MoveEvent {
  move: Move;
  accuracy: { label: string; heuristicDelta: number; bestMove: Move | null } | null;
  evaluation: number;
}

export type JoinResult =
  { ok: true; match: MatchView } | { ok: false; code: ErrorCode; message: string };

/**
 * Player-facing copy for each failure. The server's own message is a reasonable
 * fallback, but these are written for the specific moment the player hits them.
 */
export const ERROR_COPY: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND:
    'We could not find that game. The code may be wrong or the game may have expired.',
  ROOM_FULL: 'This game already has two players.',
  NOT_A_PLAYER: 'You are not a player in this game.',
  NOT_YOUR_TURN: 'Hold on — it is not your turn yet.',
  ILLEGAL_MOVE: 'You cannot play there.',
  GAME_OVER: 'This game has already finished.',
  BAD_REQUEST: 'Something went wrong with that action. Please try again.',
  NO_DRAW_OFFER: 'There is no draw offer waiting for you.',
  RATE_LIMITED: 'You are sending messages too quickly.',
};
