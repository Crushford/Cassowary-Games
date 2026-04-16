/**
 * queensEngineIntegration.spec.ts
 *
 * End-to-end composition tests for the Queens engine layer.
 * These exercise the same pipeline that queensStore wires together:
 *   isValidMoveOnBoard → getAutoFlagPositions → detectConstraintViolations → evaluateBoardCompletion
 *
 * Tests do not import queensStore (which carries an @/router dependency that breaks
 * the Vitest environment). They confirm that the shared utilities compose correctly
 * when used in the same sequence as the store.
 */

import { describe, it, expect } from 'vitest';
import type { GridSquare, MarkType } from '../types/types';
import { isValidMoveOnBoard } from './queensMoveValidation';
import { getAutoFlagPositions } from './queensAutoFlagging';
import { evaluateBoardCompletion } from './queensBoardValidation';
import { detectConstraintViolations, deriveErrorMessage } from './queensErrorDetection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBoard(layout: string, queens: string) {
  const gridSize = Math.sqrt(layout.length);
  const grid: GridSquare[][] = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => {
      const idx = r * gridSize + c;
      return {
        position: { row: r, col: c },
        groupColor: layout[idx] === '.' ? undefined : layout[idx],
        isSolutionQueen: queens[idx] === 'Q',
      };
    })
  );
  const playerMarks: MarkType[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );
  return {
    grid,
    playerMarks,
    gridSize,
    orthogonalMinDistance: gridSize,
    targetQueenCount: gridSize,
  };
}

function placeQueen(playerMarks: MarkType[][], row: number, col: number): MarkType[][] {
  const next = playerMarks.map((r) => [...r]);
  next[row][col] = 'queen';
  return next;
}

function applyFlags(playerMarks: MarkType[][], positions: { row: number; col: number }[]) {
  const next = playerMarks.map((r) => [...r]);
  for (const pos of positions) {
    if (next[pos.row][pos.col] === null) next[pos.row][pos.col] = 'flag';
  }
  return next;
}

// ---------------------------------------------------------------------------
// 4×4 puzzle with a known unique solution
//
// Layout:  AABB
//          AABB
//          CCDD
//          CCDD
//
// Solution queens: (0,1), (1,3), (2,0), (3,2) — one per color group, one per row/col.
// ---------------------------------------------------------------------------

const LAYOUT_4x4 = 'AABBAABBCCDDCCDD';
const QUEENS_4x4 = '.Q...Q.QQ...Q...'; // wrong — let me set correct positions

// Correct solution for the layout above: one queen per group A/B/C/D,
// one per row, one per column with no diagonal touch.
// A: rows 0-1, cols 0-1  → queen at (0,1)
// B: rows 0-1, cols 2-3  → queen at (1,3)
// C: rows 2-3, cols 0-1  → queen at (3,0)
// D: rows 2-3, cols 2-3  → queen at (2,2)
//
// Check: rows 0,1,2,3 each have one queen ✓
//        cols 1,3,2,0 each have one queen ✓
//        no diagonal touches: (0,1)→(1,3) diff (1,2) not diagonal ✓
//                             (0,1)→(2,2) diff (2,1) not diagonal ✓
//                             (0,1)→(3,0) diff (3,1) not diagonal ✓
//                             (1,3)→(2,2) diff (1,1) diagonal touch! ✗
//
// Use different solution: A(0,0), B(1,2), C(3,1), D(2,3)
// rows 0,1,2(wait — D at row 2, C at row 3) → 0,1,3,2 ✓
// cols 0,2,3,1 ✓
// diagonals: (0,0)→(1,2) diff (1,2) not diagonal ✓
//            (0,0)→(2,3) diff (2,3) not diagonal ✓
//            (0,0)→(3,1) diff (3,1) not diagonal ✓
//            (1,2)→(2,3) diff (1,1) diagonal touch! ✗
//
// Let's try: A(1,0), B(0,3), C(2,1), D(3,2)
// rows 1,0,2,3 ✓
// cols 0,3,1,2 ✓
// diagonals: (1,0)→(0,3) diff (1,3) ✓
//            (1,0)→(2,1) diff (1,1) diagonal touch! ✗
//
// Simpler: use a 4×4 single-group puzzle for simplicity —
// 4 distinct colors, standard placement.
// A(0,1), B(1,3), C(2,0), D(3,2):
// row-col: 0→1, 1→3, 2→0, 3→2 ✓ each unique
// diagonals: (0,1)↔(1,3)=(1,2)✓  (0,1)↔(2,0)=(2,1)✓  (0,1)↔(3,2)=(3,1)✓
//            (1,3)↔(2,0)=(1,3)✓  (1,3)↔(3,2)=(2,1)✓  (2,0)↔(3,2)=(1,2)✓
// ✓ Valid solution!

const SOLUTION_4x4 = 'AABBAABBCCDDCCDD'; // layout
// Build solution string: queen at (0,1),(1,3),(2,0),(3,2)
// 0*4+1=1, 1*4+3=7, 2*4+0=8, 3*4+2=14
const SOL_QUEENS_4x4 = Array(16).fill('.') as string[];
SOL_QUEENS_4x4[1] = 'Q';
SOL_QUEENS_4x4[7] = 'Q';
SOL_QUEENS_4x4[8] = 'Q';
SOL_QUEENS_4x4[14] = 'Q';
const QUEENS_STR_4x4 = SOL_QUEENS_4x4.join('');

// ---------------------------------------------------------------------------

describe('Queens engine integration — 4×4 puzzle', () => {
  it('allows placing the first solution queen and rejects orthogonal/color conflicts', () => {
    const board = buildBoard(SOLUTION_4x4, QUEENS_STR_4x4);

    // Empty board — any cell should be placeable
    expect(isValidMoveOnBoard(board, 0, 1)).toBe(true);

    // Place first queen at (0,1) — color A
    const marks1 = placeQueen(board.playerMarks, 0, 1);
    const ctx1 = { ...board, playerMarks: marks1 };

    // Same row as queen (0,1): row 0 is blocked, and also col 1 is blocked
    expect(isValidMoveOnBoard(ctx1, 0, 0)).toBe(false); // same row
    expect(isValidMoveOnBoard(ctx1, 0, 2)).toBe(false); // same row
    expect(isValidMoveOnBoard(ctx1, 2, 1)).toBe(false); // same col
    // Diagonal touch: (1,0) and (1,2)
    expect(isValidMoveOnBoard(ctx1, 1, 0)).toBe(false);
    expect(isValidMoveOnBoard(ctx1, 1, 2)).toBe(false);
    // Same color group A: (1,0) and (1,1)
    expect(isValidMoveOnBoard(ctx1, 1, 1)).toBe(false); // same col AND same color
    // A valid position for the next queen
    expect(isValidMoveOnBoard(ctx1, 1, 3)).toBe(true);
  });

  it('auto-flags blocked cells after placing a queen', () => {
    const board = buildBoard(SOLUTION_4x4, QUEENS_STR_4x4);
    const marks1 = placeQueen(board.playerMarks, 0, 1);
    const flagPositions = getAutoFlagPositions({ ...board, playerMarks: marks1 });

    // Every flagged position must be a currently-null cell that is blocked
    for (const pos of flagPositions) {
      expect(marks1[pos.row][pos.col]).toBe(null); // was empty
      expect(isValidMoveOnBoard({ ...board, playerMarks: marks1 }, pos.row, pos.col)).toBe(false);
    }
    // The queen's own cell should not appear in flagged positions
    expect(flagPositions.some((p) => p.row === 0 && p.col === 1)).toBe(false);
  });

  it('detects a diagonal conflict and generates the expected error message', () => {
    const board = buildBoard(SOLUTION_4x4, QUEENS_STR_4x4);
    // Place two diagonally touching queens
    const marks = placeQueen(placeQueen(board.playerMarks, 1, 1), 2, 2);
    const ctx = { ...board, playerMarks: marks };

    const { hasDiagonalConflicts, immediateDiagonalErrors, allQueenPositions } =
      detectConstraintViolations(ctx);

    expect(hasDiagonalConflicts).toBe(true);
    expect(immediateDiagonalErrors).toHaveLength(2);

    const errorSquares = new Set(immediateDiagonalErrors.map((p) => `${p.row},${p.col}`));
    const message = deriveErrorMessage({
      ...ctx,
      errorSquares,
      queenPositions: allQueenPositions,
      hasDiagonalConflicts,
    });
    expect(message).toBe('Queens cannot touch diagonally');
  });

  it('evaluates a complete correct solution as valid', () => {
    const board = buildBoard(SOLUTION_4x4, QUEENS_STR_4x4);

    // Place all four solution queens
    let marks = board.playerMarks;
    marks = placeQueen(marks, 0, 1); // A
    marks = placeQueen(marks, 1, 3); // B
    marks = placeQueen(marks, 2, 0); // C
    marks = placeQueen(marks, 3, 2); // D

    // Apply auto-flags after each queen to simulate store behaviour
    marks = applyFlags(marks, getAutoFlagPositions({ ...board, playerMarks: marks }));

    const result = evaluateBoardCompletion({ ...board, playerMarks: marks });

    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeNull();

    // No errors on a solved board
    const { timedViolations, hasDiagonalConflicts } = detectConstraintViolations({
      ...board,
      playerMarks: marks,
    });
    expect(timedViolations).toHaveLength(0);
    expect(hasDiagonalConflicts).toBe(false);
  });

  it('evaluates an incorrect placement as invalid and detects constraint violations', () => {
    const board = buildBoard(SOLUTION_4x4, QUEENS_STR_4x4);

    // Place queens at wrong positions (two in same row)
    let marks = board.playerMarks;
    marks = placeQueen(marks, 0, 0);
    marks = placeQueen(marks, 0, 2); // same row as (0,0) — orthogonal conflict

    const result = evaluateBoardCompletion({ ...board, playerMarks: marks });
    // Only 2 queens placed, needs 4 — not yet complete
    expect(result.isValid).toBe(false);

    // The row conflict should show as a timed violation
    const { timedViolations } = detectConstraintViolations({ ...board, playerMarks: marks });
    const rowConflict = timedViolations.find((v) => v.groupKey === 'row-queen-0');
    expect(rowConflict).toBeDefined();
    expect(rowConflict!.affectedCells).toContainEqual({ row: 0, col: 0 });
    expect(rowConflict!.affectedCells).toContainEqual({ row: 0, col: 2 });
  });
});
