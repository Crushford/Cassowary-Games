import { describe, it, expect } from 'vitest';
import { isDiagonalTouch, isOrthogonalConflict } from './queensRules';

describe('isDiagonalTouch', () => {
  it('returns true for cells exactly one step diagonally apart', () => {
    expect(isDiagonalTouch({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(true);
    expect(isDiagonalTouch({ row: 1, col: 1 }, { row: 0, col: 0 })).toBe(true);
    expect(isDiagonalTouch({ row: 1, col: 1 }, { row: 2, col: 0 })).toBe(true);
    expect(isDiagonalTouch({ row: 1, col: 1 }, { row: 0, col: 2 })).toBe(true);
  });

  it('returns false for the same cell', () => {
    expect(isDiagonalTouch({ row: 2, col: 2 }, { row: 2, col: 2 })).toBe(false);
  });

  it('returns false for cells more than one diagonal step apart', () => {
    expect(isDiagonalTouch({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
    expect(isDiagonalTouch({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(false);
  });

  it('returns false for orthogonally adjacent cells', () => {
    expect(isDiagonalTouch({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(false);
    expect(isDiagonalTouch({ row: 1, col: 1 }, { row: 2, col: 1 })).toBe(false);
  });

  it('is symmetric', () => {
    const a = { row: 3, col: 4 };
    const b = { row: 4, col: 5 };
    expect(isDiagonalTouch(a, b)).toBe(isDiagonalTouch(b, a));
  });
});

describe('isOrthogonalConflict', () => {
  it('returns false for queens not sharing a row or column', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 1, col: 1 }, 3)).toBe(false);
  });

  it('returns true when two queens share a row and are within the minimum distance', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 0, col: 2 }, 3)).toBe(true);
  });

  it('returns false when two queens share a row but are at or beyond the minimum distance', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 0, col: 3 }, 3)).toBe(false);
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 0, col: 5 }, 3)).toBe(false);
  });

  it('returns true when two queens share a column and are within the minimum distance', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 1, col: 0 }, 3)).toBe(true);
  });

  it('returns false when two queens share a column but are at or beyond the minimum distance', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 3, col: 0 }, 3)).toBe(false);
  });

  it('with orthogonalMinDistance=1, adjacent queens do not conflict (distance 1 is not < 1)', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 0, col: 1 }, 1)).toBe(false);
  });

  it('with orthogonalMinDistance=2, adjacent queens conflict (distance 1 < 2)', () => {
    expect(isOrthogonalConflict({ row: 0, col: 0 }, { row: 0, col: 1 }, 2)).toBe(true);
  });

  it('is symmetric', () => {
    const a = { row: 2, col: 0 };
    const b = { row: 2, col: 1 };
    expect(isOrthogonalConflict(a, b, 3)).toBe(isOrthogonalConflict(b, a, 3));
  });
});
