import type { GameState, Move, AccuracyResult, MoveAccuracyLog, CoachComment } from './types';
import { checkWinner, applyMoveFast } from './gameLogic';
import { moveToKey } from './utils';

// ============================================================
// Constants
// ============================================================

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

/** Difficulty level to search depth mapping */
const DIFFICULTY_DEPTHS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

// Position-based weights for strategic importance on the super-board
const POSITION_WEIGHTS: number[] = [
  3, 2, 3,  // corners and edges — top row
  2, 5, 2,  // center is most valuable
  3, 2, 3,  // corners and edges — bottom row
];

// ============================================================
// Heuristic Board Evaluation
// ============================================================

/**
 * Count "threats" — lines where a player has 2 out of 3 and the third is empty.
 */
function countThreats(board: (string | null)[], player: string): number {
  let threats = 0;
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const cells = [board[a], board[b], board[c]];
    const playerCount = cells.filter(c => c === player).length;
    const nullCount = cells.filter(c => c === null).length;
    if (playerCount === 2 && nullCount === 1) {
      threats++;
    }
  }
  return threats;
}

/**
 * Count how many winning lines are still possible for a player on a board.
 */
function countOpenLines(board: (string | null)[], player: string): number {
  const opponent = player === 'X' ? 'O' : 'X';
  let open = 0;
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const cells = [board[a], board[b], board[c]];
    // A line is "open" if the opponent has no pieces in it
    if (!cells.includes(opponent) && !cells.includes('Draw')) {
      open++;
    }
  }
  return open;
}

/**
 * Evaluate a game state heuristically from the perspective of `player`.
 * Returns a score where positive means `player` is winning.
 */
function evaluateBoard(state: GameState, player: 'X' | 'O'): number {
  const opponent = player === 'X' ? 'O' : 'X';

  // Terminal states
  if (state.winner === player) return 10000;
  if (state.winner === opponent) return -10000;
  if (state.winner === 'Draw') return 0;

  let score = 0;

  // --- Super-board level evaluation ---

  // Sub-board wins weighted by position importance
  for (let i = 0; i < 9; i++) {
    if (state.subBoardWinners[i] === player) {
      score += POSITION_WEIGHTS[i] * 10;
    } else if (state.subBoardWinners[i] === opponent) {
      score -= POSITION_WEIGHTS[i] * 10;
    }
  }

  // Threats on the super-board (2-in-a-row of won sub-boards)
  const superThreatsPlayer = countThreats(state.subBoardWinners, player);
  const superThreatsOpponent = countThreats(state.subBoardWinners, opponent);
  score += superThreatsPlayer * 25;
  score -= superThreatsOpponent * 25;

  // Open winning lines on the super-board
  const superOpenPlayer = countOpenLines(state.subBoardWinners, player);
  const superOpenOpponent = countOpenLines(state.subBoardWinners, opponent);
  score += (superOpenPlayer - superOpenOpponent) * 3;

  // --- Sub-board level evaluation ---
  for (let i = 0; i < 9; i++) {
    // Only evaluate undecided sub-boards
    if (state.subBoardWinners[i] !== null) continue;

    const subBoard = state.superBoard[i];
    const weight = POSITION_WEIGHTS[i];

    // Threats within each sub-board
    const subThreatsPlayer = countThreats(subBoard, player);
    const subThreatsOpponent = countThreats(subBoard, opponent);
    score += subThreatsPlayer * weight;
    score -= subThreatsOpponent * weight;

    // Cell control within sub-boards
    for (let j = 0; j < 9; j++) {
      if (subBoard[j] === player) {
        score += (j === 4 ? 2 : 1); // Center cell bonus
      } else if (subBoard[j] === opponent) {
        score -= (j === 4 ? 2 : 1);
      }
    }
  }

  // --- Tactical: sending opponent to a decided board (free move for them) ---
  if (state.nextRequiredSubBoard !== null) {
    // If it's the player's turn and they're forced into a bad board
    const nextBoard = state.nextRequiredSubBoard;
    if (state.currentPlayer === player) {
      // Being sent to a board with opponent threats is bad
      if (state.subBoardWinners[nextBoard] === null) {
        const opponentThreats = countThreats(state.superBoard[nextBoard], opponent);
        score -= opponentThreats * 3;
      }
    }
  }

  return score;
}

// ============================================================
// Move Generation
// ============================================================

/**
 * Generate all valid moves for the current game state.
 */
function getValidMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const player = state.currentPlayer;

  if (state.nextRequiredSubBoard !== null) {
    const superIdx = state.nextRequiredSubBoard;
    for (let subIdx = 0; subIdx < 9; subIdx++) {
      if (state.superBoard[superIdx][subIdx] === null) {
        moves.push({ superGridIndex: superIdx, subGridIndex: subIdx, player });
      }
    }
  } else {
    for (let superIdx = 0; superIdx < 9; superIdx++) {
      if (state.subBoardWinners[superIdx] === null) {
        for (let subIdx = 0; subIdx < 9; subIdx++) {
          if (state.superBoard[superIdx][subIdx] === null) {
            moves.push({ superGridIndex: superIdx, subGridIndex: subIdx, player });
          }
        }
      }
    }
  }
  return moves;
}

/**
 * Order moves for better alpha-beta pruning.
 * Prioritizes: winning moves > center cells > threats > corners > edges.
 */
function orderMoves(moves: Move[], state: GameState): Move[] {
  const player = state.currentPlayer;

  return moves.sort((a, b) => {
    const scoreA = scoreMoveHeuristic(a, state, player);
    const scoreB = scoreMoveHeuristic(b, state, player);
    return scoreB - scoreA; // Higher score first
  });
}

/**
 * Quick heuristic score for move ordering (not the full minimax eval).
 */
function scoreMoveHeuristic(move: Move, state: GameState, player: 'X' | 'O'): number {
  let score = 0;
  const { superGridIndex, subGridIndex } = move;

  // Prefer center cells
  if (subGridIndex === 4) score += 3;
  // Prefer corner cells
  if ([0, 2, 6, 8].includes(subGridIndex)) score += 2;

  // Prefer playing in strategically important sub-boards
  score += POSITION_WEIGHTS[superGridIndex];

  // Check if this move wins a sub-board
  const testBoard = state.superBoard[superGridIndex].slice();
  testBoard[subGridIndex] = player;
  const subWinner = checkWinner(testBoard);
  if (subWinner === player) score += 50;

  // Check if this move would send opponent to a decided board (giving them free choice)
  if (state.subBoardWinners[subGridIndex] !== null) {
    score += 5; // Sending opponent to decided board is mildly good (free move for them is chaotic)
  }

  // Penalize sending opponent to center board if we don't own it
  if (subGridIndex === 4 && state.subBoardWinners[4] === null) {
    const opponent = player === 'X' ? 'O' : 'X';
    const centerThreats = countThreats(state.superBoard[4], opponent);
    score -= centerThreats * 5;
  }

  return score;
}

// ============================================================
// Minimax with Alpha-Beta Pruning
// ============================================================

/**
 * Minimax search with alpha-beta pruning and move ordering.
 */
export function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  player: 'X' | 'O'
): number {
  // Terminal or depth limit reached
  if (depth === 0 || state.winner !== null) {
    return evaluateBoard(state, player);
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) return evaluateBoard(state, player);

  // Order moves for better pruning
  const orderedMoves = depth >= 2 ? orderMoves(moves, state) : moves;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
      const newState = applyMoveFast(state, move);
      const ev = minimax(newState, depth - 1, alpha, beta, false, player);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of orderedMoves) {
      const newState = applyMoveFast(state, move);
      const ev = minimax(newState, depth - 1, alpha, beta, true, player);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Find the best move for the current player using minimax.
 * @param state - Current game state
 * @param difficulty - Difficulty level 1-5 (maps to search depth)
 */
export function getBestMove(state: GameState, difficulty: number = 3): Move | null {
  const player = state.currentPlayer;
  const depth = DIFFICULTY_DEPTHS[Math.min(5, Math.max(1, difficulty))] || 3;
  const validMoves = getValidMoves(state);

  if (validMoves.length === 0) return null;
  if (validMoves.length === 1) return validMoves[0];

  // For difficulty 1, add randomness (pick a random move 30% of the time)
  if (difficulty === 1 && Math.random() < 0.3) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // For difficulty 2, add randomness (pick a random move 15% of the time)
  if (difficulty === 2 && Math.random() < 0.15) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  const orderedMoves = orderMoves(validMoves, state);

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of orderedMoves) {
    const newState = applyMoveFast(state, move);
    const score = minimax(newState, depth - 1, -Infinity, Infinity, false, player);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // Pick a random best move to add variety
  if (bestMoves.length > 0) {
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  return validMoves[0];
}

/**
 * Returns evaluation score from X's perspective.
 * Positive = X is winning, negative = O is winning.
 */
export function getEvaluation(state: GameState): number {
  return evaluateBoard(state, 'X');
}

// ============================================================
// Coach Explanation
// ============================================================

const CELL_NAMES = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

const BOARD_NAMES = [
  'top-left board', 'top-center board', 'top-right board',
  'middle-left board', 'center board', 'middle-right board',
  'bottom-left board', 'bottom-center board', 'bottom-right board',
];

function describeMove(move: Move): string {
  return `${CELL_NAMES[move.subGridIndex]} of the ${BOARD_NAMES[move.superGridIndex]}`;
}

/**
 * Generate human-readable coach commentary for a move from the accuracy log.
 * @param log - The move accuracy log entry
 * @param bestMove - The best move found (may equal actual move)
 */
export function getCoachText(log: MoveAccuracyLog, bestMove: Move | null): CoachComment {
  const { label, delta, move } = log;
  const actualDesc = describeMove(move);
  const bestDesc = bestMove ? describeMove(bestMove) : null;

  const isSameAsBest =
    bestMove &&
    bestMove.superGridIndex === move.superGridIndex &&
    bestMove.subGridIndex === move.subGridIndex;

  switch (label) {
    case 'Forced':
      return {
        headline: 'Forced Move',
        detail: `Only one legal move was available here — ${actualDesc}. No choice to be made.`,
        bestMoveDescription: null,
      };

    case 'Best Move':
      return {
        headline: 'Best Move!',
        detail: `Playing the ${actualDesc} was the strongest option. It maximizes board control and keeps your opponent under pressure. Well played!`,
        bestMoveDescription: null,
      };

    case 'Good Move':
      return {
        headline: 'Good Move',
        detail: `Solid play! Your move to the ${actualDesc} is good, but the optimal line was the ${bestDesc}. That move scores ~${delta} points better, giving slightly tighter control over which boards your opponent can play in.`,
        bestMoveDescription: isSameAsBest ? null : bestDesc,
      };

    case 'Inaccuracy':
      return {
        headline: 'Inaccuracy',
        detail: `You played the ${actualDesc}, but the ${bestDesc} was significantly stronger (about ${delta} points better). Your move lets the opponent gain ground — consider what sub-board you're sending them to next.`,
        bestMoveDescription: isSameAsBest ? null : bestDesc,
      };

    case 'Blunder':
      return {
        headline: 'Blunder!',
        detail: `Playing the ${actualDesc} was a serious mistake — roughly ${delta} points lost. The correct move was the ${bestDesc}. This error likely gave your opponent a winning opportunity or let them take a crucial sub-board.`,
        bestMoveDescription: isSameAsBest ? null : bestDesc,
      };

    default:
      return {
        headline: 'Move Analyzed',
        detail: `You played the ${actualDesc}.`,
        bestMoveDescription: isSameAsBest ? null : bestDesc,
      };
  }
}

/**
 * Evaluate the accuracy of a move by comparing it to the best move.
 * Uses string keys instead of object references for Map lookups (fixes original bug).
 */
export function evaluateMoveAccuracy(
  stateBeforeMove: GameState,
  actualMove: Move
): AccuracyResult {
  const player = stateBeforeMove.currentPlayer;
  const validMoves = getValidMoves(stateBeforeMove);

  if (validMoves.length <= 1) {
    return { bestMove: validMoves[0] || null, heuristicDelta: 0, label: 'Forced' };
  }

  const evalDepth = 3; // Fixed depth for accuracy evaluation
  let bestScore = -Infinity;
  let bestMove: Move | null = null;
  const moveScores = new Map<string, number>();

  for (const move of validMoves) {
    const newState = applyMoveFast(stateBeforeMove, move);
    const score = minimax(newState, evalDepth, -Infinity, Infinity, false, player);
    const key = moveToKey(move.superGridIndex, move.subGridIndex);
    moveScores.set(key, score);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  const actualKey = moveToKey(actualMove.superGridIndex, actualMove.subGridIndex);
  const actualScore = moveScores.get(actualKey);

  // If the actual move wasn't in valid moves (shouldn't happen), evaluate directly
  const finalActualScore = actualScore !== undefined
    ? actualScore
    : minimax(
        applyMoveFast(stateBeforeMove, actualMove),
        evalDepth, -Infinity, Infinity, false, player
      );

  const delta = bestScore - finalActualScore;
  let label: AccuracyResult['label'] = 'Best Move';
  if (delta > 200) label = 'Blunder';
  else if (delta > 50) label = 'Inaccuracy';
  else if (delta > 0) label = 'Good Move';

  return { bestMove, heuristicDelta: delta, label };
}
