'use strict';

/**
 * generate.js
 * ------------
 * Standalone puzzle generator for the honeypot-ant logic.
 * Extracted from Pinia store: experimentCreateValidBoard and its helpers.
 *
 * Uses PuzzleDatabase for compact puzzle storage.
 */

/**
 * Iterate over every (row,col) in a size×size grid,
 * calling `fn(row, col)` for side-effects or return-values.
 */
function forEveryCell<T>(size: number, fn: (row: number, col: number) => T): T[] {
  const results: T[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      results.push(fn(r, c));
    }
  }
  return results;
}

// === Types ===
type GeneratorState = {
  grid: GridSquare[][];
  autoTestMarks: MarkType[][];
};

interface Summary {
  success: boolean;
  attempts: number;
  succeededOnAttempt: number | null;
  flagsPlaced: number;
  queensDug: number;
  colorSteps: {
    expandedNeighbor: number;
    addedPerRow: number;
    filledRemaining: number;
  };
  notFullCount: number;
  unsolvableCount: number;
  groupSizeValidationFailures: number;
  expandColorGridFailures: number;
}

// Constants
const SIZE = 8; // grid width/height
const RETRIES = 30000; // max generation attempts
const BATCH = 1; // number of puzzles to generate
const OUT: string | null = null; // null ⇒ stdout, or a file path

const summary: Summary = {
  success: false,
  attempts: 0,
  succeededOnAttempt: null,
  flagsPlaced: 0,
  queensDug: 0,
  colorSteps: {
    expandedNeighbor: 0,
    addedPerRow: 0,
    filledRemaining: 0,
  },
  notFullCount: 0,
  unsolvableCount: 0,
  groupSizeValidationFailures: 0,
  expandColorGridFailures: 0,
};

import fs from 'fs';
import type { GridSquare, MarkType, Pos, ColorName } from '../frontend/src/types/types';
import { PuzzleDatabase } from './puzzleDatabase';
import { COLOR_PALETTE, COLOR_SYMBOLS } from '../frontend/src/utils/colorPalette';

const puzzleDatabase = new PuzzleDatabase('../frontend/public/puzzles.json');

// === Logging Utility ===
let VERBOSE = false;

function logVerbose(...args: any[]): void {
  if (VERBOSE) {
    console.log(...args);
  }
}

function logError(...args: any[]): void {
  console.error(...args);
}

// === Validation Helper Functions ===
/**
 * Throws if the number of solution‐queens on the grid isn't exactly expectedCount.
 */
function validateQueenCount(grid: GridSquare[][], expectedCount: number): void {
  const count = grid.flat().filter((cell) => cell.isSolutionQueen).length;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} queens, found ${count}`);
  }
}

/**
 * Throws if the number of distinct queen colors isn't exactly expectedCount.
 */
function validateUniqueQueenColors(grid: GridSquare[][], expectedCount: number): void {
  const colors = new Set<string>();
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (cell.isSolutionQueen) colors.add(cell.groupColor!);
    })
  );
  if (colors.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} unique queen colors, got ${colors.size}`);
  }
}

/**
 * Returns true if all color groups contain exactly expectedSize cells, false otherwise.
 */
function validateGroupSizes(grid: GridSquare[][], expectedSize: number): boolean {
  const counts: Record<string, number> = {};
  for (const row of grid) {
    for (const cell of row) {
      if (cell.groupColor) {
        counts[cell.groupColor] = (counts[cell.groupColor] || 0) + 1;
      }
    }
  }
  const mismatches = Object.entries(counts).filter(([, n]) => n !== expectedSize);
  if (mismatches.length) {
    const details = mismatches.map(([c, n]) => `${c}:${n}`).join(', ');
    logVerbose(
      `Group size validation failed: Expected groups of size ${expectedSize}, but got ${details}`
    );
    return false;
  }
  return true;
}

const isSolvable = (state: GeneratorState): boolean => {
  clearAutoTestMarks(state);
  runAllSolverSteps(state);
  const isSolved = state.autoTestMarks.every((r) => r.every((c) => c === 'flag' || c === 'queen'));

  return isSolved;
};

/**
 * Throws if the board isn't fully solvable—i.e. wrong queen count, bad coloring, or uncolored cells.
 */
function validateSolvableAndFull(state: GeneratorState): void {
  if (!isSolvable(state)) {
    debugger;
    throw new Error('Board is not fully solvable');
  }

  const { queenCountValid, colorGroupsValid } = validatePuzzleState(state.grid, state.grid.length);
  const allColored = state.grid.every((r) => r.every((c) => !!c.groupColor));
  if (!queenCountValid || !colorGroupsValid || !allColored) {
    throw new Error('Board is not fully solvable and colored');
  }
}

// === Local utility functions moved from gridUtils.ts ===
function createEmptyGrid(size: number): GridSquare[][] {
  return Array(size)
    .fill(null)
    .map((_, row) =>
      Array(size)
        .fill(null)
        .map(
          (_, col) =>
            ({
              position: { row, col },
              groupColor: undefined,
            }) as GridSquare
        )
    );
}

function cloneGrid(grid: GridSquare[][]): GridSquare[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function validatePuzzleState(
  grid: GridSquare[][],
  gridSize: number
): {
  queenCountValid: boolean;
  colorGroupsValid: boolean;
} {
  const queens = forEveryCell(gridSize, (r, c) =>
    grid[r][c].isSolutionQueen ? { row: r, col: c } : null
  ).filter(Boolean) as Pos[];
  const queenCountValid = queens.length === gridSize;
  let colorGroupsValid = true;
  const queensByColor: Record<string, Pos[]> = {};
  for (const queen of queens) {
    const cell = grid[queen.row][queen.col];
    if (cell.groupColor) {
      if (!queensByColor[cell.groupColor]) {
        queensByColor[cell.groupColor] = [];
      }
      queensByColor[cell.groupColor].push(queen);
    }
  }
  for (const color in queensByColor) {
    if (queensByColor[color].length !== 1) {
      colorGroupsValid = false;
      break;
    }
  }
  return {
    queenCountValid,
    colorGroupsValid,
  };
}

// === Helpers ===
function initializeGrid(size: number = SIZE): GeneratorState {
  const grid = createEmptyGrid(size);
  const autoTestMarks: MarkType[][] = Array.from({ length: size }, () => Array(size).fill(null));
  return { grid, autoTestMarks };
}

function isValidMoveWithMarks(
  row: number,
  col: number,
  marks: MarkType[][],
  grid: GridSquare[][]
): boolean {
  const size = grid.length;
  for (let i = 0; i < size; i++) {
    if (marks[row][i] === 'queen' || marks[i][col] === 'queen') {
      return false;
    }
  }
  const diagonalPositions = [
    { r: row - 1, c: col - 1 },
    { r: row - 1, c: col + 1 },
    { r: row + 1, c: col - 1 },
    { r: row + 1, c: col + 1 },
  ];
  for (const pos of diagonalPositions) {
    if (
      pos.r >= 0 &&
      pos.r < size &&
      pos.c >= 0 &&
      pos.c < size &&
      marks[pos.r][pos.c] === 'queen'
    ) {
      return false;
    }
  }
  const square = grid[row][col];
  if (square.groupColor) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (marks[r][c] === 'queen' && grid[r][c].groupColor === square.groupColor) {
          return false;
        }
      }
    }
  }
  return true;
}

function placeAllQueens(state: GeneratorState, size: number): void {
  function countQueensInMarks(marks: MarkType[][]): number {
    let count = 0;
    forEveryCell(size, (row, col) => {
      if (marks[row][col] === 'queen') count++;
    });
    return count;
  }
  function clearTempMarks(marks: MarkType[][]): void {
    forEveryCell(size, (row, col) => {
      marks[row][col] = null;
    });
  }
  forEveryCell(size, (row, col) => {
    state.grid[row][col].isSolutionQueen = false;
  });
  const tempQueenMarks: MarkType[][] = Array.from({ length: size }, () => Array(size).fill(null));
  let attempts = 0;
  const maxAttempts = 100;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 5;
  while (countQueensInMarks(tempQueenMarks) < size && attempts < maxAttempts) {
    attempts++;
    const success = placeRandomQueen(tempQueenMarks, state.grid, size);
    if (!success) {
      consecutiveFailures++;
      if (consecutiveFailures >= maxConsecutiveFailures) {
        clearTempMarks(tempQueenMarks);
        consecutiveFailures = 0;
      }
    } else {
      consecutiveFailures = 0;
    }
  }
  const finalQueenCount = countQueensInMarks(tempQueenMarks);
  if (finalQueenCount === size) {
    forEveryCell(size, (row, col) => {
      if (tempQueenMarks[row][col] === 'queen') {
        state.grid[row][col].isSolutionQueen = true;
      }
    });
  } else {
    throw new Error(`Failed to place all ${size} queens after ${maxAttempts} attempts`);
  }
}

function placeRandomQueen(
  tempQueenMarks: MarkType[][],
  grid: GridSquare[][],
  size: number
): boolean {
  const maxAttempts = 1000;
  let attempts = 0;
  function getValidMoves(preferKnight: boolean): Pos[] {
    const moves: Pos[] = [];
    const knightMoves: Pos[] = [];
    let lastQueen: Pos | null = null;
    forEveryCell(size, (r, c) => {
      if (tempQueenMarks[r][c] === 'queen') lastQueen = { row: r, col: c };
    });
    forEveryCell(size, (row, col) => {
      if (
        tempQueenMarks[row][col] === null &&
        isValidMoveWithMarks(row, col, tempQueenMarks, grid)
      ) {
        moves.push({ row, col });
        if (lastQueen) {
          const dr = Math.abs(row - lastQueen.row);
          const dc = Math.abs(col - lastQueen.col);
          if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
            knightMoves.push({ row, col });
          }
        }
      }
    });
    return preferKnight && knightMoves.length > 0 ? knightMoves : moves;
  }
  function cloneMarks(marks: MarkType[][]): MarkType[][] {
    return marks.map((row) => [...row]);
  }
  function backtrack(queensPlaced: number): boolean {
    if (queensPlaced === size) return true;
    if (++attempts > maxAttempts) return false;
    const moves = getValidMoves(true);
    if (moves.length === 0) return false;
    for (let i = moves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [moves[i], moves[j]] = [moves[j], moves[i]];
    }
    for (const { row, col } of moves) {
      const prevMarks = cloneMarks(tempQueenMarks);
      tempQueenMarks[row][col] = 'queen';
      if (backtrack(queensPlaced + 1)) return true;
      forEveryCell(size, (r, c) => {
        tempQueenMarks[r][c] = prevMarks[r][c];
      });
    }
    return false;
  }
  forEveryCell(size, (row, col) => {
    tempQueenMarks[row][col] = null;
  });
  let success = backtrack(0);
  return success;
}

function assignInitialColorsToState(state: GeneratorState): void {
  const size = state.grid.length;
  const queenPositions: Pos[] = [];
  forEveryCell(size, (row, col) => {
    if (state.grid[row][col].isSolutionQueen) {
      queenPositions.push({ row, col });
    }
  });

  // Reset all colors
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      state.grid[r][c].groupColor = undefined;
    }
  }

  // Assign unique colors to each queen using colorPalette.ts
  const palette = [...COLOR_PALETTE];
  if (queenPositions.length > palette.length) {
    debugger;
    throw new Error(`Not enough colors for ${queenPositions.length} queens`);
  }
  queenPositions.forEach(({ row, col }) => {
    state.grid[row][col].groupColor = palette.pop();
  });
}
function expandColorGroupsInPlace(grid: GridSquare[][]): void {
  const gridSize = grid.length;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const byColor: Record<string, Array<{ row: number; col: number; square: GridSquare }>> = {};
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const square = grid[row][col];
      if (!square.groupColor) continue;
      if (!byColor[square.groupColor]) byColor[square.groupColor] = [];
      byColor[square.groupColor].push({ row, col, square });
    }
  }

  for (const color in byColor) {
    const group = byColor[color];
    let expanded = false;

    // Shuffle the order of source cells to randomize expansion
    const sources = group.slice().sort(() => Math.random() - 0.5);

    for (const base of sources) {
      const shuffledDirs = dirs.slice().sort(() => Math.random() - 0.5);
      for (const [dr, dc] of shuffledDirs) {
        const r = base.row + dr;
        const c = base.col + dc;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !grid[r][c].groupColor) {
          grid[r][c].groupColor = color;
          expanded = true;
          break;
        }
      }
      if (expanded) break;
    }

    // If no square was added, log warning
    if (!expanded) {
      logVerbose(`Warning: Could not expand color group ${color}`);
    }
  }
}

function expandColorGridSafely(state: GeneratorState): boolean {
  const backup = cloneGrid(state.grid);
  let solvable = false;
  let attempts = 0;

  while (!solvable && attempts < 100) {
    attempts++;
    expandColorGroupsInPlace(state.grid);

    solvable = isSolvable(state);

    if (!solvable) {
      // console.log(`expandColorGridSafely: Failed attempt:${attempts} attempts, reverting…`);
      // printDebugState(state);
      // dumpMarks(state.autoTestMarks);
      state.grid = cloneGrid(backup);
    }
  }
  if (!solvable) {
    logVerbose(`expandColorGridSafely: Failed after ${attempts} attempts`);
    return false;
  }

  logVerbose(`expandColorGridSafely: Success after ${attempts} attempts`);
  if (VERBOSE) {
    printDebugState(state);
    dumpMarks(state.autoTestMarks);
  }
  return true;
}

// === Auto-test solver loop and helpers ===
function placeQueen(state: GeneratorState, row: number, col: number): void {
  const size = state.grid.length;
  // Validate that this is actually a solution queen
  if (!state.grid[row][col].isSolutionQueen) {
    debugger;
    state.autoTestMarks[row][col] = 'invalid';
    throw new Error(`Attempted to place queen at (${row}, ${col}) but it's not a solution queen`);
  }

  // Place the queen
  state.autoTestMarks[row][col] = 'queen';

  // Update blocked moves (flag squares that are no longer valid)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (state.autoTestMarks[r][c] === null) {
        if (!isValidMoveWithMarks(r, c, state.autoTestMarks, state.grid)) {
          placeFlag(
            state,
            r,
            c,
            'placeQueen blocked moves',
            `blocked by queen at (${row}, ${col})`
          );
        }
      }
    }
  }
}

// Function to place a flag with validation and context
function placeFlag(
  state: GeneratorState,
  row: number,
  col: number,
  context: string,
  reason?: string
): void {
  // Validate that we're not flagging a solution queen
  if (state.grid[row][col].isSolutionQueen) {
    debugger;
    const errorMsg = `Attempted to flag solution queen at (${row}, ${col}) in ${context}`;
    const reasonMsg = reason ? ` - Reason: ${reason}` : '';
    throw new Error(errorMsg + reasonMsg);
  }

  // Place the flag
  state.autoTestMarks[row][col] = 'flag';
  summary.flagsPlaced++;
}

function runAllSolverSteps(state: GeneratorState): void {
  clearAutoTestMarks(state);
  let previousFlagCount = -1;
  let currentFlagCount = countAutoTestFlags(state);

  while (previousFlagCount !== currentFlagCount) {
    previousFlagCount = currentFlagCount;
    flagSquaresWithoutColorGroups(state);
    placeLastFreeQueens(state);
    flagBlockingSquares(state);
    placeLastFreeQueens(state);
    eliminateConstrainedRows(state);
    placeLastFreeQueens(state);
    eliminateConstrainedColumns(state);
    placeLastFreeQueens(state);
    currentFlagCount = countAutoTestFlags(state);
  }
}
function clearAutoTestMarks(state: GeneratorState) {
  const size = state.grid.length;
  forEveryCell(size, (row, col) => {
    state.autoTestMarks[row][col] = null;
  });
  flagSquaresWithoutColorGroups(state);
}
function countAutoTestFlags(state: GeneratorState) {
  const size = state.grid.length;
  let count = 0;
  forEveryCell(size, (row, col) => {
    if (state.autoTestMarks[row][col] === 'flag') count++;
  });
  return count;
}
function flagSquaresWithoutColorGroups(state: GeneratorState) {
  const size = state.grid.length;
  forEveryCell(size, (row, col) => {
    if (!state.grid[row][col].groupColor && state.autoTestMarks[row][col] === null) {
      placeFlag(state, row, col, 'flagSquaresWithoutColorGroups', 'square has no color group');
    }
  });
}
function placeLastFreeQueens(state: GeneratorState) {
  const size = state.grid.length;
  const colorGroups = new Map();
  forEveryCell(size, (row, col) => {
    const color = state.grid[row][col].groupColor;
    if (color) {
      if (!colorGroups.has(color)) colorGroups.set(color, []);
      colorGroups.get(color).push({ row, col });
    }
  });
  for (const [color, positions] of colorGroups.entries()) {
    let unflagged = positions.filter(
      ({ row, col }: { row: number; col: number }) => state.autoTestMarks[row][col] !== 'flag'
    );
    if (unflagged.length === 1) {
      const { row, col } = unflagged[0];
      placeQueen(state, row, col);
      summary.queensDug++;
    }
  }
  for (let row = 0; row < size; row++) {
    let unflagged: number[] = [];
    for (let col = 0; col < size; col++) {
      if (state.autoTestMarks[row][col] !== 'flag') unflagged.push(col);
    }
    if (unflagged.length === 1) {
      placeQueen(state, row, unflagged[0]);
      summary.queensDug++;
    }
  }
  for (let col = 0; col < size; col++) {
    let unflagged: number[] = [];
    for (let row = 0; row < size; row++) {
      if (state.autoTestMarks[row][col] !== 'flag') unflagged.push(row);
    }
    if (unflagged.length === 1) {
      placeQueen(state, unflagged[0], col);
      summary.queensDug++;
    }
  }
}
function flagBlockingSquares(state: GeneratorState) {
  const size = state.grid.length;
  forEveryCell(size, (row, col) => {
    if (state.autoTestMarks[row][col] !== null) return;
    const simulatedMarks = state.autoTestMarks.map((r) => [...r]);
    simulatedMarks[row][col] = 'queen';
    forEveryCell(size, (r, c) => {
      if (simulatedMarks[r][c] !== null) return;
      if (!isValidMoveWithMarks(r, c, simulatedMarks, state.grid)) {
        simulatedMarks[r][c] = 'flag';
      }
    });
    const isLineFullyBlocked = (getterFn: (index: number) => MarkType[]) => {
      for (let i = 0; i < size; i++) {
        const line = getterFn(i);
        if (line.every((mark) => mark === 'flag')) return true;
      }
      return false;
    };
    const rowFullyBlocked = isLineFullyBlocked((r) => simulatedMarks[r]);
    const colFullyBlocked = isLineFullyBlocked((c) => simulatedMarks.map((r) => r[c]));
    const colorGroups = new Map();
    forEveryCell(size, (r, c) => {
      const color = state.grid[r][c].groupColor;
      if (color) {
        if (!colorGroups.has(color)) colorGroups.set(color, []);
        colorGroups.get(color).push({ row: r, col: c });
      }
    });
    let colorGroupBlocked = false;
    for (const positions of colorGroups.values()) {
      if (
        positions.every(
          ({ row, col }: { row: number; col: number }) => simulatedMarks[row][col] === 'flag'
        )
      ) {
        colorGroupBlocked = true;
        break;
      }
    }
    if (rowFullyBlocked || colFullyBlocked || colorGroupBlocked) {
      const reasons = [];
      if (rowFullyBlocked) reasons.push('row fully blocked');
      if (colFullyBlocked) reasons.push('column fully blocked');
      if (colorGroupBlocked) reasons.push('color group blocked');
      const reason = reasons.join(', ');
      placeFlag(state, row, col, 'flagBlockingSquares', reason);
    }
  });
}
function eliminateConstrainedRows(state: GeneratorState) {
  eliminateConstrainedLines(state, false);
}
function eliminateConstrainedColumns(state: GeneratorState) {
  eliminateConstrainedLines(state, true);
}
function eliminateConstrainedLines(state: GeneratorState, isColumn: boolean) {
  const size = state.grid.length;
  // step 1: map each color to the set of rows or columns (depending on axis) where it has unmarked squares
  const colorToAxisMap = new Map();
  forEveryCell(size, (row, col) => {
    const color = state.grid[row][col].groupColor;
    const mark = state.autoTestMarks[row][col];
    if (mark === null && color) {
      const coord = isColumn ? col : row;
      if (!colorToAxisMap.has(color)) colorToAxisMap.set(color, new Set());
      colorToAxisMap.get(color).add(coord);
    }
  });
  // Step 2: Invert the map to find sets of colors that share the same row or column sets

  const axisSetToColors = new Map();
  for (const [color, axisSet] of colorToAxisMap.entries()) {
    // make a string of the columns or rows that a color group have to see if it matches any other color group
    const key = Array.from(axisSet).sort().join(',');
    if (!axisSetToColors.has(key)) axisSetToColors.set(key, new Set());
    axisSetToColors.get(key).add(color);
  }
  if (axisSetToColors.size === 0) return;
  for (const [axisKey, allowedColors] of axisSetToColors.entries()) {
    //no point in flagging if there is only 1 color in the row or column as it must be a solution queen
    if (allowedColors.size < 2) continue;

    const axisValues = axisKey.split(',').map(Number);

    // there should be the same number of colors as the number of rows or columns in the axis
    if (axisValues !== allowedColors.size) continue;

    for (const primaryIndex of axisValues) {
      for (let secondaryIndex = 0; secondaryIndex < size; secondaryIndex++) {
        const row = isColumn ? secondaryIndex : primaryIndex;
        const col = isColumn ? primaryIndex : secondaryIndex;
        const squareColor = state.grid[row][col].groupColor;
        const mark = state.autoTestMarks[row][col];
        const isUnmarked = mark === null;
        const isOutsideAllowedColors = !squareColor || !allowedColors.has(squareColor);
        if (isUnmarked && isOutsideAllowedColors) {
          //temp
          if (state.grid[row][col].isSolutionQueen) {
            debugger;
          }

          const reason = `outside allowed colors for ${Array.from(allowedColors).join(
            ','
          )} on ${isColumn ? 'column' : 'row'} ${primaryIndex}`;
          placeFlag(state, row, col, 'eliminateConstrainedLines', reason);
        }
      }
    }
  }
}

function getColorGroupSizes(grid: GridSquare[][]): { [key: string]: number } {
  const colorCounts: { [key: string]: number } = {};
  forEveryCell(grid.length, (row, col) => {
    const color = grid[row][col].groupColor;
    if (color) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  });
  return colorCounts;
}

function countColoredSquares(grid: GridSquare[][]): number {
  let count = 0;
  forEveryCell(grid.length, (row, col) => {
    if (grid[row][col].groupColor) count++;
  });
  return count;
}

function isValidPosition(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function eliminateConstrainedLinesForExpansion(
  grid: GridSquare[][],
  isColumn: boolean
): Array<{ row: number; col: number; responsibleColors: string[] }> {
  const size = grid.length;
  const colorToAxisMap = new Map();
  forEveryCell(size, (row, col) => {
    const color = grid[row][col].groupColor;
    if (color) {
      const coord = isColumn ? col : row;
      if (!colorToAxisMap.has(color)) colorToAxisMap.set(color, new Set());
      colorToAxisMap.get(color).add(coord);
    }
  });

  const axisSetToColors = new Map();
  for (const [color, axisSet] of colorToAxisMap.entries()) {
    const key = Array.from(axisSet).sort().join(',');
    if (!axisSetToColors.has(key)) axisSetToColors.set(key, new Set());
    axisSetToColors.get(key).add(color);
  }

  const blockedSquares: Array<{
    row: number;
    col: number;
    responsibleColors: string[];
  }> = [];
  for (const [axisKey, allowedColors] of axisSetToColors.entries()) {
    if (allowedColors.size < 2) continue;
    const axisValues = axisKey.split(',').map(Number);
    for (const primaryIndex of axisValues) {
      for (let secondaryIndex = 0; secondaryIndex < size; secondaryIndex++) {
        const row = isColumn ? secondaryIndex : primaryIndex;
        const col = isColumn ? primaryIndex : secondaryIndex;
        const squareColor = grid[row][col].groupColor;
        const isUnmarked = !squareColor;
        const isOutsideAllowedColors = !squareColor || !allowedColors.has(squareColor);
        if (isUnmarked && isOutsideAllowedColors) {
          blockedSquares.push({
            row,
            col,
            responsibleColors: Array.from(allowedColors),
          });
        }
      }
    }
  }
  return blockedSquares;
}

function printDebugState(state: GeneratorState, errorMsg?: string) {
  const size = state.grid.length;
  console.error('--- Debug State ---');
  if (errorMsg) console.error('Error:', errorMsg);
  // Print grid colors
  console.error('Grid colors:');
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const cell = state.grid[row][col];
      const colorKey = cell.groupColor || 'undefined';
      line += COLOR_SYMBOLS[colorKey as ColorName | 'undefined'] + ' ';
    }
    console.error(line);
  }
  // Print queen positions
  console.error('Queen positions:');
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      line += (state.grid[row][col].isSolutionQueen ? 'Q' : '.') + ' ';
    }
    console.error(line);
  }
  // Print color group sizes
  const groupSizes = getColorGroupSizes(state.grid);
  console.error('Color group sizes:', groupSizes);
  console.error('------------------');
  dumpMarks(state.autoTestMarks);
}

function dumpMarks(marks: MarkType[][]) {
  console.log('--- Auto-test marks ---');
  console.log(
    marks
      .map((row) =>
        row.map((cell) => (cell === 'queen' ? 'Q' : cell === 'flag' ? 'F' : '.')).join(' ')
      )
      .join('\n')
  );
}

function expandIntoBlockedSquares(state: GeneratorState): void {
  clearAutoTestMarks(state);

  // Track failed expansion attempts to avoid repeating them
  const failedAttempts = new Set<string>(); // Format: "row,col,color"

  const size = state.grid.length;
  // Keep expanding eligible blocked squares until no more can be expanded or board is full
  let keepExpanding = true;
  let expansionCount = 0;
  const maxExpansions = size * size; // Prevent infinite loops

  while (keepExpanding && expansionCount < maxExpansions) {
    keepExpanding = false;
    expansionCount++;

    // Recompute blocked squares after each expansion
    const blockedSquares = [
      ...eliminateConstrainedLinesForExpansion(state.grid, false),
      ...eliminateConstrainedLinesForExpansion(state.grid, true),
    ];

    // If board is full, stop
    const totalSquares = size * size;
    const coloredSquares = countColoredSquares(state.grid);
    if (coloredSquares === totalSquares) {
      logVerbose('Board is now full after expansions.');
      break;
    }

    for (const { row, col, responsibleColors } of blockedSquares) {
      const currentColor = state.grid[row][col].groupColor;
      if (currentColor) continue; // Skip already colored squares

      const directions = [
        { dr: 1, dc: 0 },
        { dr: -1, dc: 0 },
        { dr: 0, dc: 1 },
        { dr: 0, dc: -1 },
      ];

      for (const { dr, dc } of directions) {
        const nRow = row + dr;
        const nCol = col + dc;
        if (!isValidPosition(nRow, nCol, size)) continue;

        const neighborColor = state.grid[nRow][nCol].groupColor;
        if (!neighborColor || responsibleColors.includes(neighborColor)) continue;

        // Check if this specific expansion has already failed
        const attemptKey = `${row},${col},${neighborColor}`;
        if (failedAttempts.has(attemptKey)) continue;

        // Try the expansion
        const originalColor = state.grid[row][col].groupColor;
        state.grid[row][col].groupColor = neighborColor;

        // Check if the board is still solvable
        const wasSolvable = isSolvable(state);

        if (wasSolvable) {
          // Expansion successful
          logVerbose(
            `Expanded color ${neighborColor} from (${nRow}, ${nCol}) into blocked square (${row}, ${col})`
          );
          keepExpanding = true;
          break; // Only expand one color per blocked square per iteration
        } else {
          // Expansion failed - revert and record the failure
          state.grid[row][col].groupColor = originalColor;
          failedAttempts.add(attemptKey);
          logVerbose(
            `Failed expansion: color ${neighborColor} into (${row}, ${col}) - made board unsolvable`
          );
        }
      }
    }
  }

  if (expansionCount >= maxExpansions) {
    logVerbose(`Warning: Reached maximum expansion attempts (${maxExpansions})`);
  }

  runAllSolverSteps(state);

  // Validate that Step 5 actually filled the board
  const totalSquares = state.grid.length * state.grid.length;
  const coloredSquares = countColoredSquares(state.grid);
  if (coloredSquares < totalSquares) {
    logVerbose(
      `Step 5 warning: Board not fully filled. ${coloredSquares}/${totalSquares} squares colored.`
    );
    logVerbose(`Failed expansion attempts: ${failedAttempts.size}`);
  } else {
    logVerbose(`Step 5 complete: Board fully filled (${coloredSquares}/${totalSquares} squares)`);
  }
}

function experimentCreateValidBoard(size: number = SIZE, maxRetries: number = RETRIES) {
  const state = initializeGrid(size);
  const diagnosticsPerAttempt: {
    iterations: number;
    flags: number;
    marks: string;
  }[] = [];
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    summary.attempts++;
    try {
      // Step 1: Place all queens
      placeAllQueens(state, size);
      validateQueenCount(state.grid, size);
      logVerbose('Step 1 complete');
      // Step 2: Assign initial colors to queens
      assignInitialColorsToState(state);
      validateUniqueQueenColors(state.grid, size);
      logVerbose('Step 2 complete');
      if (!isSolvable(state)) {
        debugger;
        throw new Error('Board is not fully solvable');
      }
      // Step 3: Expand color groups (should be 2 squares per color)
      if (!expandColorGridSafely(state)) {
        summary.expandColorGridFailures++;
        throw new Error('expandColorGridSafely failed after maximum attempts');
      }
      if (!validateGroupSizes(state.grid, 2)) {
        summary.groupSizeValidationFailures++;
        throw new Error('Group size validation failed at step 3');
      }
      logVerbose('Step 3 complete');
      if (!isSolvable(state)) {
        debugger;
        throw new Error('Board is not fully solvable');
      }
      // Step 4: Expand color groups again (should be 3 squares per color)
      if (!expandColorGridSafely(state)) {
        summary.expandColorGridFailures++;
        throw new Error('expandColorGridSafely failed at step 4');
      }
      if (!validateGroupSizes(state.grid, 3)) {
        summary.groupSizeValidationFailures++;
        throw new Error('Group size validation failed at step 4');
      }
      logVerbose('Step 4 complete');
      if (!isSolvable(state)) {
        debugger;
        throw new Error('Board is not fully solvable');
      }
      // Step 5: Expand into blocked squares until board is full
      expandIntoBlockedSquares(state);
      if (!isSolvable(state)) {
        debugger;
        throw new Error('Board is not fully solvable');
      }
      try {
        validateSolvableAndFull(state);
        summary.success = true;
        summary.succeededOnAttempt = summary.attempts;
        return {
          success: true,
          grid: state.grid,
          diagnostics: diagnosticsPerAttempt,
        };
      } catch {
        // classification logic continues…
      }
      // 3) Classify this failure:
      const isFull = state.grid.every((row) => row.every((cell) => cell.groupColor));
      if (!isFull) {
        summary.notFullCount++;
      } else {
        const { queenCountValid, colorGroupsValid } = validatePuzzleState(state.grid, size);
        if (!(queenCountValid && colorGroupsValid)) {
          summary.unsolvableCount++;
        }
      }
      // 4) Prepare for next retry: clear auto-test marks, then loop
      clearAutoTestMarks(state);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Check if this is a group size validation failure
      if (errorMessage.includes('Group size validation failed')) {
        logVerbose(`Attempt ${attempt}: ${errorMessage} - retrying...`);
        // Reset the grid for the next attempt
        state.grid = createEmptyGrid(size);
        state.autoTestMarks = Array.from({ length: size }, () => Array(size).fill(null));
        continue; // Skip to next attempt
      }

      // Check if this is an expandColorGridSafely failure
      if (errorMessage.includes('expandColorGridSafely failed')) {
        logVerbose(`Attempt ${attempt}: ${errorMessage} - retrying...`);
        // Reset the grid for the next attempt
        state.grid = createEmptyGrid(size);
        state.autoTestMarks = Array.from({ length: size }, () => Array(size).fill(null));
        continue; // Skip to next attempt
      }

      // Check if this is a queen placement failure
      if (errorMessage.includes('Failed to place all') && errorMessage.includes('queens')) {
        logVerbose(`Attempt ${attempt}: ${errorMessage} - retrying...`);
        // Reset the grid for the next attempt
        state.grid = createEmptyGrid(size);
        state.autoTestMarks = Array.from({ length: size }, () => Array(size).fill(null));
        continue; // Skip to next attempt
      }

      // For other errors, log and re-throw
      printDebugState(state, errorMessage);
      throw err;
    }
  }
  // After RETRIES exhausted, return failure with diagnostics
  const reason =
    summary.groupSizeValidationFailures === summary.attempts
      ? 'All attempts failed group size validation'
      : summary.expandColorGridFailures === summary.attempts
        ? 'All attempts failed expandColorGridSafely'
        : summary.notFullCount === summary.attempts
          ? 'All attempts produced incomplete grids'
          : summary.unsolvableCount === summary.attempts
            ? 'All attempts produced full but invalid grids'
            : 'Mixed failures';
  return { success: false, error: reason, diagnostics: diagnosticsPerAttempt };
}

function main() {
  // First, show total number of puzzles for each size
  const stats = puzzleDatabase.getStats();
  const sizeCounts = puzzleDatabase.getSizeCounts();

  console.log('\n=== Puzzle Database Summary ===');
  if (stats.totalPuzzles === 0) {
    console.log('No puzzles in database');
  } else {
    // Sort sizes numerically
    const sortedSizes = Object.keys(sizeCounts).sort((a, b) => {
      const aSize = parseInt(a.split('x')[0], 10);
      const bSize = parseInt(b.split('x')[0], 10);
      return aSize - bSize;
    });

    console.log(`Total puzzles: ${stats.totalPuzzles}`);
    console.log('\nPuzzles by size:');
    for (const sizeKey of sortedSizes) {
      console.log(`  ${sizeKey}: ${sizeCounts[sizeKey]}`);
    }
  }
  console.log('');

  // Check command line arguments for different modes
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse arguments
  let size: number | null = null; // null means size was not explicitly set
  let batchSize = BATCH;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--size' && i + 1 < args.length) {
      const sizeValue = parseInt(args[i + 1]);
      if (!isNaN(sizeValue) && sizeValue >= 3 && sizeValue <= 12) {
        size = sizeValue;
      }
      i++; // Skip next argument
    } else if (arg === '--verbose' || arg === '-v') {
      VERBOSE = true;
    } else if (command === 'generate' && i === 1) {
      // The second argument after 'generate' is the batch size
      const batchValue = parseInt(arg);
      if (!isNaN(batchValue) && batchValue > 0) {
        batchSize = batchValue;
      }
    }
  }

  // Set verbose mode for puzzle database
  puzzleDatabase.setVerbose(VERBOSE);

  // Track whether size was explicitly set by user
  const sizeExplicitlySet = size !== null;

  // If size was not explicitly set, we'll check the lowest count before each puzzle generation
  if (size === null) {
    size = puzzleDatabase.getSizeWithLowestCount([5, 6, 7, 8, 9]);
    logVerbose(
      `No size specified, will auto-select size with lowest puzzle count before each puzzle`
    );
  }

  // Validate that auto-selected size is within allowed range
  if (size !== null && (size < 4 || size > 9)) {
    console.error(
      `Error: Auto-selected size ${size}x${size} is not allowed. Only sizes 4-9 are supported for auto-generation.`
    );
    process.exit(1);
  }

  if (command === 'list') {
    puzzleDatabase.listPuzzles();
    return;
  }

  if (command === 'stats') {
    puzzleDatabase.showStats();
    return;
  }

  if (command === 'export') {
    // Find the puzzle ID argument (skip --size and its value)
    let puzzleId = null;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--size') {
        i++; // Skip the size value
      } else if (args[i] && !args[i].startsWith('-')) {
        puzzleId = args[i];
        break;
      }
    }
    if (puzzleId) {
      puzzleDatabase.exportPuzzle(puzzleId);
    } else {
      console.error('Error: export command requires a puzzle ID');
    }
    return;
  }

  if (command === 'delete') {
    // Find the puzzle ID argument (skip --size and its value)
    let puzzleId = null;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--size') {
        i++; // Skip the size value
      } else if (args[i] && !args[i].startsWith('-')) {
        puzzleId = args[i];
        break;
      }
    }
    if (puzzleId) {
      puzzleDatabase.deletePuzzle(puzzleId);
    } else {
      console.error('Error: delete command requires a puzzle ID');
    }
    return;
  }

  if (command === 'generate') {
    logVerbose(`Generating ${batchSize} new puzzles (${size}x${size})...`);

    type Result = {
      success: boolean;
      grid?: GridSquare[][];
      error?: string;
      diagnostics?: { iterations: number; flags: number; marks: string }[];
    };
    const results: Result[] = [];
    const allDiagnostics: {
      attempt: number;
      step: number;
      iterations: number;
      flags: number;
      marks: string;
    }[] = [];

    const sizeCounts: Record<number, number> = {}; // Track puzzles by size
    let addedCount = 0;
    let duplicateCount = 0;
    const consecutiveDuplicatesBySize: Record<number, number> = {}; // Track consecutive duplicates per size
    const exhaustedSizes = new Set<number>(); // Track sizes that are exhausted (10+ consecutive duplicates)

    for (let i = 0; i < batchSize; i++) {
      // If size wasn't explicitly set, check which size has the lowest count before each puzzle
      // Skip exhausted sizes
      if (!sizeExplicitlySet) {
        const availableSizes = [4, 5, 6, 7, 8, 9].filter((s) => !exhaustedSizes.has(s));
        if (availableSizes.length === 0) {
          console.log(
            `\n⚠️  All sizes exhausted (10+ consecutive duplicates each). Stopping generation.`
          );
          break;
        }
        size = puzzleDatabase.getSizeWithLowestCount(availableSizes);
        logVerbose(`Auto-selected size ${size}x${size} for puzzle ${i + 1} (lowest puzzle count)`);
      } else {
        // If size is explicitly set and exhausted, warn and break
        if (exhaustedSizes.has(size)) {
          console.log(
            `\n⚠️  Size ${size}x${size} is exhausted (10+ consecutive duplicates). Stopping generation.`
          );
          break;
        }
      }

      logVerbose(`\n--- Generating puzzle ${i + 1}/${batchSize} ---`);
      console.log(`Generating puzzle ${i + 1}/${batchSize} (${size}x${size})...`);
      const { success, grid, error, diagnostics } = experimentCreateValidBoard(size);
      results.push({ success, grid, error, diagnostics });
      if (diagnostics) {
        diagnostics.forEach((diag, j) => {
          allDiagnostics.push({ attempt: i + 1, step: j + 1, ...diag });
        });
      }
      if (!success) {
        console.log(`❌ Failed to generate puzzle ${i + 1}: ${error}`);
        break;
      }

      // Save puzzle immediately after generation
      if (grid) {
        const wasAdded = puzzleDatabase.addPuzzle(grid);
        if (wasAdded) {
          // Successfully added - reset consecutive duplicates for this size
          consecutiveDuplicatesBySize[size] = 0;
          addedCount++;
          sizeCounts[size] = (sizeCounts[size] || 0) + 1;
          const stats = puzzleDatabase.getStats();
          console.log(
            `  ✅ Puzzle ${i + 1} created and saved (${size}x${size}) - Database: ${
              stats.totalPuzzles
            } puzzles`
          );
        } else {
          // Duplicate - increment consecutive duplicates counter
          duplicateCount++;
          consecutiveDuplicatesBySize[size] = (consecutiveDuplicatesBySize[size] || 0) + 1;
          const consecutiveCount = consecutiveDuplicatesBySize[size];
          console.log(
            `  ⚠️  Puzzle ${
              i + 1
            } was duplicate, skipped (${consecutiveCount} consecutive duplicates for ${size}x${size})`
          );

          // If we hit 10 consecutive duplicates, mark this size as exhausted
          if (consecutiveCount >= 10) {
            exhaustedSizes.add(size);
            console.log(
              `  ⛔ Size ${size}x${size} exhausted (10 consecutive duplicates). Moving to next size.`
            );

            // If size was explicitly set, break the loop
            if (sizeExplicitlySet) {
              console.log(`\n⚠️  Size ${size}x${size} is exhausted. Stopping generation.`);
              break;
            }
            // Otherwise, continue to next iteration which will auto-select a new size
          }
        }
      }
    }

    logVerbose('\n–– Solver diagnostics per attempt ––');
    if (VERBOSE) {
      allDiagnostics.forEach(({ attempt, step, iterations, flags }) => {
        console.log(`Attempt ${attempt} Step ${step}: ${iterations} iterations, ${flags} flags`);
      });
    }

    // Show final summary
    const successfulPuzzles = results.filter((r) => r.success);
    if (successfulPuzzles.length > 0) {
      const stats = puzzleDatabase.getStats();
      const sizeBreakdown = Object.entries(sizeCounts)
        .map(([s, count]) => `${s}x${s}: ${count}`)
        .join(', ');

      console.log(`\n✅ Completed: Generated ${addedCount} new puzzle(s) (${sizeBreakdown})`);
      console.log(`📊 Database now has ${stats.totalPuzzles} total puzzles`);
      if (duplicateCount > 0) {
        console.log(`⚠️  ${duplicateCount} puzzle(s) were duplicates`);
      }
      if (exhaustedSizes.size > 0) {
        const exhaustedList = Array.from(exhaustedSizes)
          .sort((a, b) => a - b)
          .map((s) => `${s}x${s}`)
          .join(', ');
        console.log(`⛔ Exhausted sizes (10+ consecutive duplicates): ${exhaustedList}`);
      }
    } else {
      console.log(`\n❌ Failed to generate any puzzles`);
      if (exhaustedSizes.size > 0) {
        const exhaustedList = Array.from(exhaustedSizes)
          .sort((a, b) => a - b)
          .map((s) => `${s}x${s}`)
          .join(', ');
        console.log(`⛔ Exhausted sizes (10+ consecutive duplicates): ${exhaustedList}`);
      }
    }

    // Output detailed summary only in verbose mode
    if (VERBOSE) {
      const output = {
        params: { size, retries: RETRIES, batch: batchSize },
        summary,
        puzzlesGenerated: successfulPuzzles.length,
        puzzlesAdded: successfulPuzzles.length,
        errors: results.filter((r) => !r.success).map((r) => r.error),
      };

      if (OUT) {
        fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
      } else {
        console.log('\n=== Generation Summary ===');
        console.log(JSON.stringify(output, null, 2));
      }
    }

    process.exit(successfulPuzzles.length > 0 ? 0 : 1);
  }

  // Default behavior: generate one puzzle
  logVerbose(`Generating 1 puzzle (${size}x${size}) (default behavior)...`);
  if (VERBOSE) {
    console.log('\nAvailable commands:');
    console.log('  yarn generate                    - Generate 1 puzzle');
    console.log('  yarn generate generate [number]  - Generate multiple puzzles');
    console.log('  yarn puzzle-db list              - List all puzzles in database');
    console.log('  yarn puzzle-db stats             - Show database statistics');
    console.log('  yarn puzzle-db export <puzzleId> - Export a specific puzzle');
    console.log('  yarn puzzle-db delete <puzzleId> - Delete a puzzle from database');
  }

  // Track consecutive duplicates for single puzzle generation
  const consecutiveDuplicatesBySize: Record<number, number> = {};
  const exhaustedSizes = new Set<number>();

  // Check if current size is exhausted
  if (exhaustedSizes.has(size)) {
    console.log(`⚠️  Size ${size}x${size} is exhausted (10+ consecutive duplicates).`);
    console.log(`Try a different size or use auto-selection.`);
    process.exit(1);
  }

  const { success, grid, error, diagnostics } = experimentCreateValidBoard(size);

  if (success && grid) {
    const wasAdded = puzzleDatabase.addPuzzle(grid);
    const stats = puzzleDatabase.getStats();
    if (wasAdded) {
      // Reset consecutive duplicates on success
      consecutiveDuplicatesBySize[size] = 0;
      console.log(`✅ Generated 1 new puzzle (${size}x${size})`);
      console.log(`📊 Database now has ${stats.totalPuzzles} total puzzles`);
      if (VERBOSE) {
        console.log(`Generation attempts: ${summary.attempts}`);
      }
    } else {
      // Increment consecutive duplicates
      consecutiveDuplicatesBySize[size] = (consecutiveDuplicatesBySize[size] || 0) + 1;
      const consecutiveCount = consecutiveDuplicatesBySize[size];
      console.log(
        `⚠️  Generated puzzle was duplicate, not saved (${consecutiveCount} consecutive duplicates for ${size}x${size})`
      );
      console.log(`📊 Database contains ${stats.totalPuzzles} puzzles`);

      if (consecutiveCount >= 50) {
        exhaustedSizes.add(size);
        console.log(`⛔ Size ${size}x${size} is now exhausted (10 consecutive duplicates).`);
        console.log(`Consider trying a different size or using auto-selection.`);
      }

      if (VERBOSE) {
        console.log(`Generation attempts: ${summary.attempts}`);
      }
    }
  } else {
    console.log(`❌ Generation failed: ${error}`);
    process.exit(1);
  }
}

main();
