import type { Player, BoardState, SuperBoardState, GameState, Move } from './types';

// Re-export types for backward compatibility
export type { Player, BoardState, SuperBoardState, GameState, Move };

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Check if there's a winner on a board (works for both sub-boards and the super-board).
 */
export function checkWinner(board: (Player | 'Draw')[]): Player | 'Draw' {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] && board[a] !== 'Draw' && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  // A board is a draw when every cell is filled (or, for super-board, every sub-board is decided)
  if (board.every(cell => cell !== null)) {
    return 'Draw';
  }
  return null;
}

/**
 * Create a fresh initial game state.
 */
export function createInitialState(): GameState {
  return {
    superBoard: Array.from({ length: 9 }, () => Array(9).fill(null) as Player[]),
    subBoardWinners: Array(9).fill(null) as (Player | 'Draw')[],
    currentPlayer: 'X',
    nextRequiredSubBoard: null,
    winner: null,
    moves: []
  };
}

/**
 * Validate whether a move is legal in the current game state.
 */
export function isValidMove(state: GameState, superGridIndex: number, subGridIndex: number): boolean {
  // Game already over
  if (state.winner !== null) return false;
  // Must play in the required sub-board (if any)
  if (state.nextRequiredSubBoard !== null && state.nextRequiredSubBoard !== superGridIndex) return false;
  // Sub-board already has a winner
  if (state.subBoardWinners[superGridIndex] !== null) return false;
  // Cell already occupied
  if (state.superBoard[superGridIndex][subGridIndex] !== null) return false;
  // Indices in range
  if (superGridIndex < 0 || superGridIndex > 8 || subGridIndex < 0 || subGridIndex > 8) return false;
  return true;
}

/**
 * Efficient structured clone of GameState for use in the minimax hot path.
 * Avoids JSON.parse(JSON.stringify()) overhead.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    superBoard: state.superBoard.map(sub => sub.slice() as Player[]),
    subBoardWinners: state.subBoardWinners.slice() as (Player | 'Draw')[],
    currentPlayer: state.currentPlayer,
    nextRequiredSubBoard: state.nextRequiredSubBoard,
    winner: state.winner,
    moves: state.moves.slice()
  };
}

/**
 * Apply a move to a game state and return the new state (immutable).
 * This is the canonical state transition function used by both client and server.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const newState = cloneGameState(state);
  const { superGridIndex, subGridIndex, player } = move;

  // Place the piece
  newState.superBoard[superGridIndex][subGridIndex] = player;
  newState.moves.push(move);

  // Check sub-board winner
  const subWinner = checkWinner(newState.superBoard[superGridIndex]);
  if (subWinner) {
    newState.subBoardWinners[superGridIndex] = subWinner;
  }

  // Check super-board winner
  const superWinner = checkWinner(newState.subBoardWinners);
  if (superWinner) {
    newState.winner = superWinner;
  }

  // Determine next required sub-board
  if (newState.winner === null) {
    const nextSubBoard = subGridIndex;
    // If the target sub-board is already decided (won or drawn) or completely full, free move
    if (
      newState.subBoardWinners[nextSubBoard] !== null ||
      newState.superBoard[nextSubBoard].every(c => c !== null)
    ) {
      newState.nextRequiredSubBoard = null; // Free move
    } else {
      newState.nextRequiredSubBoard = nextSubBoard;
    }
    newState.currentPlayer = player === 'X' ? 'O' : 'X';
  }

  return newState;
}

/**
 * Lightweight applyMove for minimax that skips move history tracking.
 * Significantly faster for AI evaluation since we don't need the move log.
 */
export function applyMoveFast(state: GameState, move: Move): GameState {
  const { superGridIndex, subGridIndex, player } = move;

  // Create new state with minimal copying
  const newSuperBoard = state.superBoard.map((sub, i) =>
    i === superGridIndex ? sub.slice() as Player[] : sub
  );
  newSuperBoard[superGridIndex][subGridIndex] = player;

  const newSubBoardWinners = state.subBoardWinners.slice() as (Player | 'Draw')[];

  // Check sub-board winner
  const subWinner = checkWinner(newSuperBoard[superGridIndex]);
  if (subWinner) {
    newSubBoardWinners[superGridIndex] = subWinner;
  }

  // Check super-board winner
  const superWinner = checkWinner(newSubBoardWinners);

  // Determine next required sub-board
  let nextRequired: number | null = null;
  let nextPlayer: 'X' | 'O' = player === 'X' ? 'O' : 'X';

  if (superWinner === null) {
    const nextSubBoard = subGridIndex;
    if (
      newSubBoardWinners[nextSubBoard] !== null ||
      newSuperBoard[nextSubBoard].every(c => c !== null)
    ) {
      nextRequired = null;
    } else {
      nextRequired = nextSubBoard;
    }
  }

  return {
    superBoard: newSuperBoard,
    subBoardWinners: newSubBoardWinners,
    currentPlayer: nextPlayer,
    nextRequiredSubBoard: nextRequired,
    winner: superWinner,
    moves: state.moves // share reference — not used in minimax
  };
}
