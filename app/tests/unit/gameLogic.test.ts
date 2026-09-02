import { describe, expect, it } from 'vitest';
import {
  applyMove,
  checkWinner,
  cloneGameState,
  createInitialState,
  isValidMove,
} from '../../src/gameLogic.js';
import type { GameState, Move } from '../../src/types.js';

/**
 * Ultimate Tic-Tac-Toe rules.
 *
 * Nine sub-boards inside one super-board. The *cell* you play in dictates which
 * sub-board your opponent must play in next; if that board is already decided or
 * full, they may play anywhere. Winning three sub-boards in a line wins the game.
 */

/** Apply a sequence of [superIndex, subIndex] pairs, alternating marks. */
function play(state: GameState, moves: [number, number][]): GameState {
  let current = state;
  for (const [superGridIndex, subGridIndex] of moves) {
    const move: Move = { superGridIndex, subGridIndex, player: current.currentPlayer };
    expect(
      isValidMove(current, superGridIndex, subGridIndex),
      `move ${superGridIndex}/${subGridIndex} for ${current.currentPlayer} should be legal`,
    ).toBe(true);
    current = applyMove(current, move);
  }
  return current;
}

describe('checkWinner', () => {
  const empty = Array(9).fill(null);

  it('detects each of the three rows', () => {
    for (const [a, b, c] of [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]) {
      const board = [...empty];
      board[a] = board[b] = board[c] = 'X';
      expect(checkWinner(board)).toBe('X');
    }
  });

  it('detects each of the three columns', () => {
    for (const [a, b, c] of [
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
    ]) {
      const board = [...empty];
      board[a] = board[b] = board[c] = 'O';
      expect(checkWinner(board)).toBe('O');
    }
  });

  it('detects both diagonals', () => {
    for (const [a, b, c] of [
      [0, 4, 8],
      [2, 4, 6],
    ]) {
      const board = [...empty];
      board[a] = board[b] = board[c] = 'X';
      expect(checkWinner(board)).toBe('X');
    }
  });

  it('reports a full board with no line as a draw', () => {
    // X O X / X O O / O X X — full, no three in a line.
    expect(checkWinner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toBe('Draw');
  });

  it('reports an unfinished board as null', () => {
    expect(checkWinner(['X', 'O', null, null, null, null, null, null, null])).toBeNull();
  });

  it('does not treat three drawn sub-boards as a super-board win', () => {
    const board = Array(9).fill(null);
    board[0] = board[1] = board[2] = 'Draw';
    expect(checkWinner(board)).toBeNull();
  });
});

describe('createInitialState', () => {
  it('starts with an empty board, X to move, and no forced sub-board', () => {
    const state = createInitialState();
    expect(state.currentPlayer).toBe('X');
    expect(state.winner).toBeNull();
    expect(state.nextRequiredSubBoard).toBeNull();
    expect(state.moves).toHaveLength(0);
    expect(state.superBoard).toHaveLength(9);
    expect(state.superBoard.every(sub => sub.length === 9 && sub.every(c => c === null))).toBe(
      true,
    );
    expect(state.subBoardWinners.every(w => w === null)).toBe(true);
  });
});

describe('the forced sub-board rule', () => {
  it('sends the opponent to the sub-board matching the cell just played', () => {
    const state = applyMove(createInitialState(), {
      superGridIndex: 0,
      subGridIndex: 5,
      player: 'X',
    });
    expect(state.nextRequiredSubBoard).toBe(5);
    expect(state.currentPlayer).toBe('O');
  });

  it('rejects a move outside the forced sub-board', () => {
    const state = applyMove(createInitialState(), {
      superGridIndex: 0,
      subGridIndex: 5,
      player: 'X',
    });
    expect(isValidMove(state, 3, 0)).toBe(false);
    expect(isValidMove(state, 5, 0)).toBe(true);
  });

  it('grants a free move when the target sub-board is already won', () => {
    // X wins sub-board 4, then a later move points back at it.
    let state = play(createInitialState(), [
      [4, 0], // X -> board 0
      [0, 4], // O -> board 4
      [4, 1], // X -> board 1
      [1, 4], // O -> board 4
      [4, 2], // X takes 4/0,4/1,4/2 — wins sub-board 4
    ]);
    expect(state.subBoardWinners[4]).toBe('X');
    // X's last move was cell 2, so O is sent to board 2.
    expect(state.nextRequiredSubBoard).toBe(2);

    // Now O plays cell 4, which would send X to the decided board 4.
    state = applyMove(state, { superGridIndex: 2, subGridIndex: 4, player: 'O' });
    expect(state.nextRequiredSubBoard).toBeNull();
    expect(isValidMove(state, 7, 0)).toBe(true);
  });

  it('grants a free move when the target sub-board is full but undecided', () => {
    const state = createInitialState();
    // Fill sub-board 3 to a draw by hand, then point a move at it.
    state.superBoard[3] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    state.subBoardWinners[3] = 'Draw';
    const next = applyMove(state, { superGridIndex: 6, subGridIndex: 3, player: 'X' });
    expect(next.nextRequiredSubBoard).toBeNull();
  });
});

describe('isValidMove', () => {
  it('rejects a cell that is already occupied', () => {
    const state = applyMove(createInitialState(), {
      superGridIndex: 4,
      subGridIndex: 4,
      player: 'X',
    });
    expect(isValidMove(state, 4, 4)).toBe(false);
  });

  it('rejects any move once the game has a winner', () => {
    const state = { ...createInitialState(), winner: 'X' as const };
    expect(isValidMove(state, 0, 0)).toBe(false);
  });

  it('rejects a move into an already decided sub-board', () => {
    const state = createInitialState();
    state.subBoardWinners[2] = 'O';
    expect(isValidMove(state, 2, 0)).toBe(false);
  });

  it('rejects out-of-range indices', () => {
    const state = createInitialState();
    expect(isValidMove(state, -1, 0)).toBe(false);
    expect(isValidMove(state, 9, 0)).toBe(false);
    expect(isValidMove(state, 0, -1)).toBe(false);
    expect(isValidMove(state, 0, 9)).toBe(false);
  });
});

describe('applyMove', () => {
  it('alternates turns', () => {
    let state = createInitialState();
    expect(state.currentPlayer).toBe('X');
    state = applyMove(state, { superGridIndex: 0, subGridIndex: 1, player: 'X' });
    expect(state.currentPlayer).toBe('O');
    state = applyMove(state, { superGridIndex: 1, subGridIndex: 0, player: 'O' });
    expect(state.currentPlayer).toBe('X');
  });

  it('records every move in order', () => {
    const state = play(createInitialState(), [
      [0, 1],
      [1, 0],
      [0, 2],
    ]);
    expect(state.moves).toHaveLength(3);
    expect(state.moves[0]).toEqual({ superGridIndex: 0, subGridIndex: 1, player: 'X' });
    expect(state.moves[2]!.player).toBe('X');
  });

  it('does not mutate the state it was given', () => {
    const before = createInitialState();
    const snapshot = JSON.stringify(before);
    applyMove(before, { superGridIndex: 0, subGridIndex: 0, player: 'X' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('marks a sub-board winner without ending the game', () => {
    const state = play(createInitialState(), [
      [4, 0],
      [0, 4],
      [4, 1],
      [1, 4],
      [4, 2],
    ]);
    expect(state.subBoardWinners[4]).toBe('X');
    expect(state.winner).toBeNull();
  });

  it('ends the game when three sub-boards fall in a line', () => {
    const state = createInitialState();
    // Hand X two sub-boards, then win the third through real play.
    state.subBoardWinners[0] = 'X';
    state.subBoardWinners[1] = 'X';
    state.superBoard[2] = ['X', 'X', null, null, null, null, null, null, null];
    state.nextRequiredSubBoard = 2;

    const next = applyMove(state, { superGridIndex: 2, subGridIndex: 2, player: 'X' });
    expect(next.subBoardWinners[2]).toBe('X');
    expect(next.winner).toBe('X');
  });

  it('lets O win the super-board too', () => {
    const state = createInitialState();
    state.currentPlayer = 'O';
    state.subBoardWinners[0] = 'O';
    state.subBoardWinners[4] = 'O';
    state.superBoard[8] = ['O', null, null, null, 'O', null, null, null, null];
    state.nextRequiredSubBoard = 8;

    const next = applyMove(state, { superGridIndex: 8, subGridIndex: 8, player: 'O' });
    expect(next.winner).toBe('O');
  });

  it('declares a draw when every sub-board is decided with no line', () => {
    const state = createInitialState();
    // X O X / X O O / O X X across the super-board — full, no line.
    const layout: ('X' | 'O')[] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    layout.forEach((mark, i) => {
      if (i !== 8) state.subBoardWinners[i] = mark;
    });
    state.superBoard[8] = ['X', 'X', null, null, null, null, null, null, null];
    state.nextRequiredSubBoard = 8;

    const next = applyMove(state, { superGridIndex: 8, subGridIndex: 2, player: 'X' });
    expect(next.subBoardWinners[8]).toBe('X');
    expect(next.winner).toBe('Draw');
  });

  it('freezes the current player once the game is won', () => {
    const state = createInitialState();
    state.subBoardWinners[0] = 'X';
    state.subBoardWinners[1] = 'X';
    state.superBoard[2] = ['X', 'X', null, null, null, null, null, null, null];

    const next = applyMove(state, { superGridIndex: 2, subGridIndex: 2, player: 'X' });
    expect(next.winner).toBe('X');
    // No further turn is handed out, and nothing is legal any more.
    expect(isValidMove(next, 5, 5)).toBe(false);
  });
});

describe('cloneGameState', () => {
  it('produces an independent copy', () => {
    const original = play(createInitialState(), [
      [0, 1],
      [1, 0],
    ]);
    const copy = cloneGameState(original);

    expect(copy).toEqual(original);
    copy.superBoard[0]![0] = 'O';
    copy.subBoardWinners[3] = 'X';
    copy.moves.push({ superGridIndex: 8, subGridIndex: 8, player: 'O' });

    expect(original.superBoard[0]![0]).toBeNull();
    expect(original.subBoardWinners[3]).toBeNull();
    expect(original.moves).toHaveLength(2);
  });
});

describe('rematch reset', () => {
  it('createInitialState gives a clean board after a finished game', () => {
    const finished = play(createInitialState(), [
      [4, 0],
      [0, 4],
      [4, 1],
      [1, 4],
      [4, 2],
    ]);
    expect(finished.moves.length).toBeGreaterThan(0);

    const fresh = createInitialState();
    expect(fresh.moves).toHaveLength(0);
    expect(fresh.winner).toBeNull();
    expect(fresh.currentPlayer).toBe('X');
    expect(fresh.subBoardWinners.every(w => w === null)).toBe(true);
  });
});
