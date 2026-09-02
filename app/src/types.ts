// ============================================================
// Core Game Types
// ============================================================

export type Player = 'X' | 'O' | null;
export type BoardState = Player[];
export type SuperBoardState = BoardState[];

export interface GameState {
  superBoard: SuperBoardState;
  subBoardWinners: (Player | 'Draw')[];
  currentPlayer: 'X' | 'O';
  nextRequiredSubBoard: number | null;
  winner: Player | 'Draw';
  moves: Move[];
}

export interface Move {
  superGridIndex: number;
  subGridIndex: number;
  player: 'X' | 'O';
}

// ============================================================
// AI & Evaluation Types
// ============================================================

export interface AccuracyResult {
  bestMove: Move | null;
  heuristicDelta: number;
  label: AccuracyLabel;
}

export type AccuracyLabel = 'Best Move' | 'Good Move' | 'Inaccuracy' | 'Blunder' | 'Forced';

export interface MoveAccuracyLog {
  move: Move;
  label: AccuracyLabel;
  delta: number;
}

export interface CoachComment {
  headline: string;
  detail: string;
  bestMoveDescription: string | null;
}
