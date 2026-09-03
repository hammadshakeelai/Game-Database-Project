import { describe, expect, it } from 'vitest';
import { STARTING_ELO, expectedScore, nextElo } from '../../server/persistence.js';

/**
 * Elo rating maths.
 *
 * Ratings are computed server-side inside the same transaction that writes the
 * result, so these are the only place the formula is exercised directly.
 */

describe('expectedScore', () => {
  it('is even money between equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 10);
  });

  it('favours the stronger player', () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1400)).toBeLessThan(0.5);
  });

  it('is symmetric: the two expectations sum to one', () => {
    for (const [a, b] of [
      [1200, 1200],
      [1000, 1600],
      [1873, 1201],
    ]) {
      expect(expectedScore(a!, b!) + expectedScore(b!, a!)).toBeCloseTo(1, 10);
    }
  });

  it('gives a 400-point favourite roughly a 10:1 edge', () => {
    // The 400-point convention: ten times more likely to win.
    expect(expectedScore(1600, 1200)).toBeCloseTo(10 / 11, 3);
  });
});

describe('nextElo', () => {
  it('awards points for beating an equal opponent', () => {
    const after = nextElo(1200, 1200, 1, 50);
    expect(after).toBeGreaterThan(1200);
  });

  it('deducts points for losing to an equal opponent', () => {
    expect(nextElo(1200, 1200, 0, 50)).toBeLessThan(1200);
  });

  it('leaves a draw between equals unchanged', () => {
    expect(nextElo(1200, 1200, 0.5, 50)).toBe(1200);
  });

  it('rewards an upset far more than an expected win', () => {
    const upset = nextElo(1000, 1800, 1, 50) - 1000;
    const expectedWin = nextElo(1800, 1000, 1, 50) - 1800;
    expect(upset).toBeGreaterThan(expectedWin * 5);
  });

  it('punishes losing to a much weaker player', () => {
    const badLoss = 1800 - nextElo(1800, 1000, 0, 50);
    const okLoss = 1000 - nextElo(1000, 1800, 0, 50);
    expect(badLoss).toBeGreaterThan(okLoss * 5);
  });

  it('moves new players faster than established ones', () => {
    const rookie = nextElo(1200, 1200, 1, 0) - 1200;
    const regular = nextElo(1200, 1200, 1, 20) - 1200;
    const veteran = nextElo(1200, 1200, 1, 200) - 1200;
    expect(rookie).toBeGreaterThan(regular);
    expect(regular).toBeGreaterThan(veteran);
  });

  it('is roughly zero-sum between two equally established players', () => {
    const xBefore = 1300;
    const oBefore = 1150;
    const xAfter = nextElo(xBefore, oBefore, 1, 50);
    const oAfter = nextElo(oBefore, xBefore, 0, 50);
    // Rounding means it is not exact, but no rating should be conjured.
    expect(Math.abs(xAfter - xBefore + (oAfter - oBefore))).toBeLessThanOrEqual(1);
  });

  it('returns whole numbers', () => {
    expect(Number.isInteger(nextElo(1234, 1187, 1, 7))).toBe(true);
  });

  it('starts everyone at a conventional rating', () => {
    expect(STARTING_ELO).toBe(1200);
  });
});
