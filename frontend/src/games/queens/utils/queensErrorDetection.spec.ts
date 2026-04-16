import { describe, it, expect } from 'vitest';
import { detectConstraintViolations, deriveErrorMessage } from './queensErrorDetection';
import type { GridSquare, MarkType } from '../types/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyMarks(size: number): MarkType[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function simpleGrid(size: number, colorRows?: (string | undefined)[][]): GridSquare[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      position: { row: r, col: c },
      groupColor: colorRows?.[r]?.[c],
    }))
  );
}

function ctx(
  overrides: Partial<Parameters<typeof detectConstraintViolations>[0]> & {
    grid: GridSquare[][];
    playerMarks: MarkType[][];
  }
) {
  return {
    gridSize: overrides.grid.length,
    targetQueenCount: overrides.grid.length,
    orthogonalMinDistance: overrides.grid.length,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// detectConstraintViolations
// ---------------------------------------------------------------------------

describe('detectConstraintViolations', () => {
  describe('diagonal conflicts (immediate)', () => {
    it('detects two diagonally touching queens', () => {
      const grid = simpleGrid(4);
      const playerMarks = emptyMarks(4);
      playerMarks[0][0] = 'queen';
      playerMarks[1][1] = 'queen';
      const result = detectConstraintViolations(ctx({ grid, playerMarks }));
      expect(result.hasDiagonalConflicts).toBe(true);
      expect(result.immediateDiagonalErrors).toHaveLength(2);
      expect(result.immediateDiagonalErrors).toContainEqual({ row: 0, col: 0 });
      expect(result.immediateDiagonalErrors).toContainEqual({ row: 1, col: 1 });
    });

    it('does not report diagonal conflict for non-touching queens', () => {
      const grid = simpleGrid(4);
      const playerMarks = emptyMarks(4);
      playerMarks[0][0] = 'queen';
      playerMarks[2][2] = 'queen'; // two steps diagonally
      const result = detectConstraintViolations(ctx({ grid, playerMarks }));
      expect(result.hasDiagonalConflicts).toBe(false);
    });
  });

  describe('orthogonal row violations', () => {
    it('detects queens in same row within orthogonalMinDistance', () => {
      const grid = simpleGrid(7);
      const playerMarks = emptyMarks(7);
      playerMarks[2][0] = 'queen';
      playerMarks[2][2] = 'queen'; // distance 2 < 7
      const result = detectConstraintViolations(
        ctx({ grid, playerMarks, orthogonalMinDistance: 7 })
      );
      const rowViolation = result.timedViolations.find((v) => v.groupKey === 'row-queen-2');
      expect(rowViolation).toBeDefined();
      expect(rowViolation!.affectedCells).toContainEqual({ row: 2, col: 0 });
      expect(rowViolation!.affectedCells).toContainEqual({ row: 2, col: 2 });
    });
  });

  describe('orthogonal column violations', () => {
    it('detects queens in same column within orthogonalMinDistance', () => {
      const grid = simpleGrid(7);
      const playerMarks = emptyMarks(7);
      playerMarks[0][3] = 'queen';
      playerMarks[1][3] = 'queen';
      const result = detectConstraintViolations(
        ctx({ grid, playerMarks, orthogonalMinDistance: 7 })
      );
      const colViolation = result.timedViolations.find((v) => v.groupKey === 'col-queen-3');
      expect(colViolation).toBeDefined();
    });
  });

  describe('fully flagged rows (line coverage required)', () => {
    it('detects fully flagged row when line coverage required', () => {
      const size = 4;
      const grid = simpleGrid(size);
      const playerMarks = emptyMarks(size);
      // Flag the entire first row
      for (let c = 0; c < size; c++) playerMarks[0][c] = 'flag';
      const result = detectConstraintViolations(
        ctx({
          grid,
          playerMarks,
          targetQueenCount: size,
          orthogonalMinDistance: size,
        })
      );
      const rowViolation = result.timedViolations.find((v) => v.groupKey === 'row-flag-0');
      expect(rowViolation).toBeDefined();
      expect(rowViolation!.affectedCells).toHaveLength(size);
    });

    it('does not detect fully flagged row when line coverage not required', () => {
      const size = 4;
      const grid = simpleGrid(size);
      const playerMarks = emptyMarks(size);
      for (let c = 0; c < size; c++) playerMarks[0][c] = 'flag';
      const result = detectConstraintViolations(
        ctx({
          grid,
          playerMarks,
          targetQueenCount: 2, // fewer queens than board size — no line coverage required
          orthogonalMinDistance: size,
        })
      );
      const rowViolation = result.timedViolations.find((v) => v.groupKey === 'row-flag-0');
      expect(rowViolation).toBeUndefined();
    });
  });

  describe('color group violations', () => {
    it('detects multiple queens in the same color group', () => {
      const size = 4;
      const colorRows = [
        ['A', 'A', 'B', 'B'],
        ['A', 'A', 'B', 'B'],
        ['C', 'C', 'D', 'D'],
        ['C', 'C', 'D', 'D'],
      ];
      const grid = simpleGrid(size, colorRows);
      const playerMarks = emptyMarks(size);
      playerMarks[0][0] = 'queen'; // color A
      playerMarks[1][0] = 'queen'; // also color A
      const result = detectConstraintViolations(ctx({ grid, playerMarks }));
      const colorViolation = result.timedViolations.find((v) => v.groupKey === 'color-queen-A');
      expect(colorViolation).toBeDefined();
      expect(colorViolation!.affectedCells).toHaveLength(2);
    });

    it('detects fully flagged color group', () => {
      const colorRows = [
        ['A', 'B'],
        ['A', 'B'],
      ];
      const grid = simpleGrid(2, colorRows);
      const playerMarks = emptyMarks(2);
      playerMarks[0][0] = 'flag'; // color A
      playerMarks[1][0] = 'flag'; // color A
      const result = detectConstraintViolations(
        ctx({
          grid,
          playerMarks,
          gridSize: 2,
          targetQueenCount: 2,
          orthogonalMinDistance: 2,
        })
      );
      const colorViolation = result.timedViolations.find((v) => v.groupKey === 'color-flag-A');
      expect(colorViolation).toBeDefined();
    });
  });

  describe('no violations', () => {
    it('returns empty results for a clean board', () => {
      const grid = simpleGrid(4);
      const playerMarks = emptyMarks(4);
      const result = detectConstraintViolations(ctx({ grid, playerMarks }));
      expect(result.timedViolations).toHaveLength(0);
      expect(result.immediateDiagonalErrors).toHaveLength(0);
      expect(result.hasDiagonalConflicts).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// deriveErrorMessage
// ---------------------------------------------------------------------------

describe('deriveErrorMessage', () => {
  it('returns null for empty error squares', () => {
    const grid = simpleGrid(4);
    const playerMarks = emptyMarks(4);
    const result = deriveErrorMessage({
      grid,
      playerMarks,
      gridSize: 4,
      targetQueenCount: 4,
      orthogonalMinDistance: 4,
      errorSquares: new Set<string>(),
      queenPositions: [],
      hasDiagonalConflicts: false,
    });
    expect(result).toBeNull();
  });

  it('prioritises diagonal conflict message', () => {
    const grid = simpleGrid(4);
    const playerMarks = emptyMarks(4);
    playerMarks[0][0] = 'queen';
    playerMarks[1][1] = 'queen';
    const result = deriveErrorMessage({
      grid,
      playerMarks,
      gridSize: 4,
      targetQueenCount: 4,
      orthogonalMinDistance: 4,
      errorSquares: new Set(['0,0', '1,1']),
      queenPositions: [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ],
      hasDiagonalConflicts: true,
    });
    expect(result).toBe('Queens cannot touch diagonally');
  });

  it('returns same-row distance message when applicable', () => {
    const grid = simpleGrid(7);
    const playerMarks = emptyMarks(7);
    playerMarks[2][0] = 'queen';
    playerMarks[2][2] = 'queen';
    const result = deriveErrorMessage({
      grid,
      playerMarks,
      gridSize: 7,
      targetQueenCount: 7,
      orthogonalMinDistance: 7,
      errorSquares: new Set(['2,0', '2,2']),
      queenPositions: [
        { row: 2, col: 0 },
        { row: 2, col: 2 },
      ],
      hasDiagonalConflicts: false,
    });
    expect(result).toMatch(/same row/i);
  });

  it('returns color group message when only color violation', () => {
    const colorRows = [
      ['A', 'B', 'B', 'B'],
      ['A', 'B', 'B', 'B'],
      ['C', 'C', 'C', 'C'],
      ['C', 'C', 'C', 'C'],
    ];
    const grid = simpleGrid(4, colorRows);
    const playerMarks = emptyMarks(4);
    playerMarks[0][0] = 'queen';
    playerMarks[1][0] = 'queen';
    const result = deriveErrorMessage({
      grid,
      playerMarks,
      gridSize: 4,
      targetQueenCount: 4,
      orthogonalMinDistance: 1,
      errorSquares: new Set(['0,0', '1,0']),
      queenPositions: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
      hasDiagonalConflicts: false,
    });
    expect(result).toBe('Only 1 queen per color group');
  });
});
