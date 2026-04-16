import { describe, it, expect } from 'vitest';
import {
  collectMarkedPositions,
  countFlagMarks,
  countQueenMarks,
  deriveOrthogonalMinDistanceFromQueens,
  deriveTargetQueenCountFromQueensString,
  requiresLineCoverage,
  snapshotBoardGroups,
  snapshotPlayerMarks,
} from './queensBoardQueries';
import type { GridSquare, MarkType } from '../types/types';

// Helpers
function marks(rows: MarkType[][]): MarkType[][] {
  return rows;
}

function grid(rows: (string | undefined)[][]): GridSquare[][] {
  return rows.map((row, r) =>
    row.map((color, c) => ({
      position: { row: r, col: c },
      groupColor: color,
    }))
  );
}

describe('countQueenMarks', () => {
  it('returns 0 for an empty board', () => {
    expect(
      countQueenMarks(
        marks([
          [null, null],
          [null, null],
        ])
      )
    ).toBe(0);
  });

  it('counts queens correctly', () => {
    expect(
      countQueenMarks(
        marks([
          [null, 'queen'],
          ['flag', 'queen'],
        ])
      )
    ).toBe(2);
  });
});

describe('countFlagMarks', () => {
  it('counts flags correctly', () => {
    expect(
      countFlagMarks(
        marks([
          ['flag', 'queen'],
          ['flag', null],
        ])
      )
    ).toBe(2);
  });
});

describe('collectMarkedPositions', () => {
  it('collects all queen positions', () => {
    const board = marks([
      [null, 'queen'],
      ['flag', 'queen'],
    ]);
    const queens = collectMarkedPositions(board, 'queen');
    expect(queens).toHaveLength(2);
    expect(queens).toContainEqual({ row: 0, col: 1 });
    expect(queens).toContainEqual({ row: 1, col: 1 });
  });

  it('returns empty array when no matches', () => {
    const board = marks([
      [null, null],
      [null, null],
    ]);
    expect(collectMarkedPositions(board, 'queen')).toHaveLength(0);
  });
});

describe('deriveTargetQueenCountFromQueensString', () => {
  it('counts Q characters correctly', () => {
    expect(deriveTargetQueenCountFromQueensString('Q...Q..Q')).toBe(3);
  });

  it('returns 0 for no queens', () => {
    expect(deriveTargetQueenCountFromQueensString('........')).toBe(0);
  });
});

describe('deriveOrthogonalMinDistanceFromQueens', () => {
  it('returns boardSize when no queens share a row or column', () => {
    // Queens at (0,0) and (1,1) — diagonal, no shared line
    expect(
      deriveOrthogonalMinDistanceFromQueens(
        [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
        ],
        4
      )
    ).toBe(4);
  });

  it('derives minimum distance from queens in same row', () => {
    // Queens at (0,0) and (0,3) — distance 3 in same row
    expect(
      deriveOrthogonalMinDistanceFromQueens(
        [
          { row: 0, col: 0 },
          { row: 0, col: 3 },
        ],
        7
      )
    ).toBe(3);
  });

  it('derives minimum distance from queens in same column', () => {
    // Queens at (0,0) and (2,0) — distance 2 in same col
    expect(
      deriveOrthogonalMinDistanceFromQueens(
        [
          { row: 0, col: 0 },
          { row: 2, col: 0 },
        ],
        7
      )
    ).toBe(2);
  });

  it('returns boardSize for empty queen list', () => {
    expect(deriveOrthogonalMinDistanceFromQueens([], 5)).toBe(5);
  });
});

describe('requiresLineCoverage', () => {
  it('returns true when queens == boardSize and distance spans board', () => {
    expect(requiresLineCoverage(7, 7, 7)).toBe(true);
  });

  it('returns false when fewer queens than board size', () => {
    expect(requiresLineCoverage(3, 7, 7)).toBe(false);
  });

  it('returns false when orthogonalMinDistance is less than boardSize', () => {
    expect(requiresLineCoverage(7, 3, 7)).toBe(false);
  });
});

describe('snapshotBoardGroups', () => {
  it('serialises group colours correctly', () => {
    const g = grid([
      ['A', 'B'],
      ['B', undefined],
    ]);
    expect(snapshotBoardGroups(g)).toEqual(['AB', 'B.']);
  });
});

describe('snapshotPlayerMarks', () => {
  it('serialises marks correctly', () => {
    const board = marks([
      ['queen', 'flag'],
      ['invalid', null],
    ]);
    expect(snapshotPlayerMarks(board)).toEqual(['QF', 'X.']);
  });
});
