import { describe, it, expect } from 'vitest';
import { isValidMoveOnBoard } from './queensMoveValidation';
import type { GridSquare, MarkType } from '../types/types';

// Helpers
function emptyMarks(size: number): MarkType[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function simpleGrid(size: number, colorRows?: string[][]): GridSquare[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      position: { row: r, col: c },
      groupColor: colorRows?.[r]?.[c],
    }))
  );
}

describe('isValidMoveOnBoard', () => {
  describe('with no queens on board', () => {
    it('allows any empty cell', () => {
      const grid = simpleGrid(4);
      const playerMarks = emptyMarks(4);
      const ctx = { grid, playerMarks, gridSize: 4, orthogonalMinDistance: 4 };
      expect(isValidMoveOnBoard(ctx, 0, 0)).toBe(true);
      expect(isValidMoveOnBoard(ctx, 3, 3)).toBe(true);
    });
  });

  describe('orthogonal conflict', () => {
    it('blocks same-row placement within orthogonalMinDistance', () => {
      const grid = simpleGrid(7);
      const playerMarks = emptyMarks(7);
      playerMarks[2][1] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 7, orthogonalMinDistance: 7 };
      // Any other column in row 2 is blocked
      expect(isValidMoveOnBoard(ctx, 2, 5)).toBe(false);
    });

    it('allows same-row placement at exactly orthogonalMinDistance (distance 3 is not < 3)', () => {
      const grid = simpleGrid(10);
      const playerMarks = emptyMarks(10);
      playerMarks[0][0] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 10, orthogonalMinDistance: 3 };
      // distance 3 is NOT < 3 → no orthogonal conflict; also no diagonal or color conflict
      expect(isValidMoveOnBoard(ctx, 0, 3)).toBe(true);
      expect(isValidMoveOnBoard(ctx, 0, 4)).toBe(true);
    });

    it('blocks same-row placement within orthogonalMinDistance', () => {
      const grid = simpleGrid(10);
      const playerMarks = emptyMarks(10);
      playerMarks[0][0] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 10, orthogonalMinDistance: 3 };
      // distance 1 < 3 → conflict
      expect(isValidMoveOnBoard(ctx, 0, 1)).toBe(false);
      // distance 2 < 3 → conflict
      expect(isValidMoveOnBoard(ctx, 0, 2)).toBe(false);
    });

    it('blocks same-column placement within orthogonalMinDistance', () => {
      const grid = simpleGrid(7);
      const playerMarks = emptyMarks(7);
      playerMarks[0][3] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 7, orthogonalMinDistance: 7 };
      expect(isValidMoveOnBoard(ctx, 5, 3)).toBe(false);
    });
  });

  describe('diagonal touch', () => {
    it('blocks diagonally adjacent placement', () => {
      const grid = simpleGrid(5);
      const playerMarks = emptyMarks(5);
      playerMarks[2][2] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 5, orthogonalMinDistance: 5 };
      expect(isValidMoveOnBoard(ctx, 1, 1)).toBe(false);
      expect(isValidMoveOnBoard(ctx, 1, 3)).toBe(false);
      expect(isValidMoveOnBoard(ctx, 3, 1)).toBe(false);
      expect(isValidMoveOnBoard(ctx, 3, 3)).toBe(false);
    });

    it('allows non-adjacent diagonals', () => {
      const grid = simpleGrid(5);
      const playerMarks = emptyMarks(5);
      playerMarks[0][0] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 5, orthogonalMinDistance: 1 };
      // (2,2) is diagonal but not adjacent (2 steps away)
      expect(isValidMoveOnBoard(ctx, 2, 2)).toBe(true);
    });
  });

  describe('color group constraint', () => {
    it('blocks placement in a group that already has a queen', () => {
      const colorRows = [
        ['A', 'A'],
        ['B', 'B'],
      ];
      const grid = simpleGrid(2, colorRows);
      const playerMarks = emptyMarks(2);
      playerMarks[0][0] = 'queen';
      const ctx = { grid, playerMarks, gridSize: 2, orthogonalMinDistance: 1 };
      // (0,1) is also color A — should be blocked
      expect(isValidMoveOnBoard(ctx, 0, 1)).toBe(false);
    });

    it('allows placement in a different color group', () => {
      const colorRows = [
        ['A', 'B'],
        ['B', 'A'],
      ];
      const grid = simpleGrid(2, colorRows);
      const playerMarks = emptyMarks(2);
      playerMarks[0][0] = 'queen'; // color A
      const ctx = { grid, playerMarks, gridSize: 2, orthogonalMinDistance: 1 };
      // (0,1) is color B — different group, but check orthogonal/diagonal too
      // Row conflict: (0,0) and (0,1) are in same row, distance 1, minDistance 1 → NOT < 1 → no conflict
      // Diagonal: not adjacent (same row)
      expect(isValidMoveOnBoard(ctx, 0, 1)).toBe(true);
    });
  });
});
