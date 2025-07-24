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
}

const SIZE = 5; // grid width/height
const RETRIES = 30; // max generation attempts
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
};

import fs from 'fs';
import type { GridSquare, MarkType, Pos, ColorName } from '../src/types/types';
import { PuzzleDatabase } from './puzzleDatabase.ts';
import { COLOR_PALETTE, COLOR_SYMBOLS } from '../src/utils/colorPalette.ts';

const puzzleDatabase = new PuzzleDatabase('../public/puzzles.json');

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
 * Throws if any color group does not contain exactly expectedSize cells.
 */
function validateGroupSizes(grid: GridSquare[][], expectedSize: number): void {
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
    throw new Error(`Expected groups of size ${expectedSize}, but got ${details}`);
  }
}

/**
 * Throws if any cell on the grid remains un-colored.
 */
function validateAllColored(grid: GridSquare[][]): void {
  for (const row of grid) {
    for (const cell of row) {
      if (!cell.groupColor) throw new Error('Found an uncolored cell');
    }
  }
}

/**
 * Throws if the board isn't fully solvable—i.e. wrong queen count, bad coloring, or uncolored cells.
 */
function validateSolvableAndFull(state: GeneratorState): void {
  const { queenCountValid, colorGroupsValid } = validatePuzzleState(state.grid, SIZE);
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
function initializeGrid(): GeneratorState {
  const grid = createEmptyGrid(SIZE);
  const autoTestMarks: MarkType[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  return { grid, autoTestMarks };
}

function isValidMoveWithMarks(
  row: number,
  col: number,
  marks: MarkType[][],
  grid: GridSquare[][]
): boolean {
  for (let i = 0; i < SIZE; i++) {
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
      pos.r < SIZE &&
      pos.c >= 0 &&
      pos.c < SIZE &&
      marks[pos.r][pos.c] === 'queen'
    ) {
      return false;
    }
  }
  const square = grid[row][col];
  if (square.groupColor) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (marks[r][c] === 'queen' && grid[r][c].groupColor === square.groupColor) {
          return false;
        }
      }
    }
  }
  return true;
}

function placeAllQueens(state: GeneratorState): void {
  function countQueensInMarks(marks: MarkType[][]): number {
    let count = 0;
    forEveryCell(SIZE, (row, col) => {
      if (marks[row][col] === 'queen') count++;
    });
    return count;
  }
  function clearTempMarks(marks: MarkType[][]): void {
    forEveryCell(SIZE, (row, col) => {
      marks[row][col] = null;
    });
  }
  forEveryCell(SIZE, (row, col) => {
    state.grid[row][col].isSolutionQueen = false;
  });
  const tempQueenMarks: MarkType[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  let attempts = 0;
  const maxAttempts = 100;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 5;
  while (countQueensInMarks(tempQueenMarks) < SIZE && attempts < maxAttempts) {
    attempts++;
    const success = placeRandomQueen(tempQueenMarks, state.grid);
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
  if (finalQueenCount === SIZE) {
    forEveryCell(SIZE, (row, col) => {
      if (tempQueenMarks[row][col] === 'queen') {
        state.grid[row][col].isSolutionQueen = true;
      }
    });
  }
}

function placeRandomQueen(tempQueenMarks: MarkType[][], grid: GridSquare[][]): boolean {
  const maxAttempts = 1000;
  let attempts = 0;
  function getValidMoves(preferKnight: boolean): Pos[] {
    const moves: Pos[] = [];
    const knightMoves: Pos[] = [];
    let lastQueen: Pos | null = null;
    forEveryCell(SIZE, (r, c) => {
      if (tempQueenMarks[r][c] === 'queen') lastQueen = { row: r, col: c };
    });
    forEveryCell(SIZE, (row, col) => {
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
    if (queensPlaced === SIZE) return true;
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
      forEveryCell(SIZE, (r, c) => {
        tempQueenMarks[r][c] = prevMarks[r][c];
      });
    }
    return false;
  }
  forEveryCell(SIZE, (row, col) => {
    tempQueenMarks[row][col] = null;
  });
  let success = backtrack(0);
  return success;
}

function assignInitialColorsToState(state: GeneratorState): void {
  const queenPositions: Pos[] = [];
  forEveryCell(SIZE, (row, col) => {
    if (state.grid[row][col].isSolutionQueen) {
      queenPositions.push({ row, col });
    }
  });

  // Reset all colors
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
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
      console.warn(`Warning: Could not expand color group ${color}`);
    }
  }
}

function expandColorGridSafely(state: GeneratorState): void {
  const backup = cloneGrid(state.grid);
  let solvable = false;
  let attempts = 0;

  while (!solvable && attempts < 100) {
    attempts++;
    expandColorGroupsInPlace(state.grid);
    runAllSolverSteps(state);

    solvable = state.autoTestMarks.every((row) =>
      row.every((cell) => cell !== null && cell !== 'invalid')
    );
    if (!solvable) {
      // console.log(`expandColorGridSafely: Failed attempt:${attempts} attempts, reverting…`);
      // printDebugState(state);
      // dumpMarks(state.autoTestMarks);
      state.grid = cloneGrid(backup);
    }
  }
  if (!solvable) {
    throw new Error(`expandColorGridSafely: Failed after ${attempts} attempt(s).`);
  }

  console.log(`expandColorGridSafely: Success after ${attempts} attempts`);
  printDebugState(state);
  dumpMarks(state.autoTestMarks);
}

// === Auto-test solver loop and helpers ===
function placeQueen(state: GeneratorState, row: number, col: number): void {
  // Validate that this is actually a solution queen
  if (!state.grid[row][col].isSolutionQueen) {
    state.autoTestMarks[row][col] = 'invalid';
    throw new Error(`Attempted to place queen at (${row}, ${col}) but it's not a solution queen`);
  }

  // Place the queen
  state.autoTestMarks[row][col] = 'queen';

  // Update blocked moves (flag squares that are no longer valid)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
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
  forEveryCell(SIZE, (row, col) => {
    state.autoTestMarks[row][col] = null;
  });
}
function countAutoTestFlags(state: GeneratorState) {
  let count = 0;
  forEveryCell(SIZE, (row, col) => {
    if (state.autoTestMarks[row][col] === 'flag') count++;
  });
  return count;
}
function flagSquaresWithoutColorGroups(state: GeneratorState) {
  forEveryCell(SIZE, (row, col) => {
    if (!state.grid[row][col].groupColor && state.autoTestMarks[row][col] === null) {
      placeFlag(state, row, col, 'flagSquaresWithoutColorGroups', 'square has no color group');
    }
  });
}
function placeLastFreeQueens(state: GeneratorState) {
  const colorGroups = new Map();
  forEveryCell(SIZE, (row, col) => {
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
  for (let row = 0; row < SIZE; row++) {
    let unflagged: number[] = [];
    for (let col = 0; col < SIZE; col++) {
      if (state.autoTestMarks[row][col] !== 'flag') unflagged.push(col);
    }
    if (unflagged.length === 1) {
      placeQueen(state, row, unflagged[0]);
      summary.queensDug++;
    }
  }
  for (let col = 0; col < SIZE; col++) {
    let unflagged: number[] = [];
    for (let row = 0; row < SIZE; row++) {
      if (state.autoTestMarks[row][col] !== 'flag') unflagged.push(row);
    }
    if (unflagged.length === 1) {
      placeQueen(state, unflagged[0], col);
      summary.queensDug++;
    }
  }
}
function flagBlockingSquares(state: GeneratorState) {
  forEveryCell(SIZE, (row, col) => {
    if (state.autoTestMarks[row][col] !== null) return;
    const simulatedMarks = state.autoTestMarks.map((r) => [...r]);
    simulatedMarks[row][col] = 'queen';
    forEveryCell(SIZE, (r, c) => {
      if (simulatedMarks[r][c] !== null) return;
      if (!isValidMoveWithMarks(r, c, simulatedMarks, state.grid)) {
        simulatedMarks[r][c] = 'flag';
      }
    });
    const isLineFullyBlocked = (getterFn: (index: number) => MarkType[]) => {
      for (let i = 0; i < SIZE; i++) {
        const line = getterFn(i);
        if (line.every((mark) => mark === 'flag')) return true;
      }
      return false;
    };
    const rowFullyBlocked = isLineFullyBlocked((r) => simulatedMarks[r]);
    const colFullyBlocked = isLineFullyBlocked((c) => simulatedMarks.map((r) => r[c]));
    const colorGroups = new Map();
    forEveryCell(SIZE, (r, c) => {
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
  const colorToAxisMap = new Map();
  forEveryCell(SIZE, (row, col) => {
    const color = state.grid[row][col].groupColor;
    const mark = state.autoTestMarks[row][col];
    if (mark === null && color) {
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
  for (const [axisKey, allowedColors] of axisSetToColors.entries()) {
    if (allowedColors.size < 2) continue;
    const axisValues = axisKey.split(',').map(Number);
    for (const primaryIndex of axisValues) {
      for (let secondaryIndex = 0; secondaryIndex < SIZE; secondaryIndex++) {
        const row = isColumn ? secondaryIndex : primaryIndex;
        const col = isColumn ? primaryIndex : secondaryIndex;
        const squareColor = state.grid[row][col].groupColor;
        const mark = state.autoTestMarks[row][col];
        const isUnmarked = mark === null;
        const isOutsideAllowedColors = !squareColor || !allowedColors.has(squareColor);
        if (isUnmarked && isOutsideAllowedColors) {
          const reason = `outside allowed colors for ${Array.from(allowedColors).join(',')} on ${isColumn ? 'column' : 'row'} ${primaryIndex}`;
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

function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function eliminateConstrainedLinesForExpansion(
  grid: GridSquare[][],
  isColumn: boolean
): Array<{ row: number; col: number; responsibleColors: string[] }> {
  const colorToAxisMap = new Map();
  forEveryCell(SIZE, (row, col) => {
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

  const blockedSquares: Array<{ row: number; col: number; responsibleColors: string[] }> = [];
  for (const [axisKey, allowedColors] of axisSetToColors.entries()) {
    if (allowedColors.size < 2) continue;
    const axisValues = axisKey.split(',').map(Number);
    for (const primaryIndex of axisValues) {
      for (let secondaryIndex = 0; secondaryIndex < SIZE; secondaryIndex++) {
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
  console.error('--- Debug State ---');
  if (errorMsg) console.error('Error:', errorMsg);
  // Print grid colors
  console.error('Grid colors:');
  for (let row = 0; row < SIZE; row++) {
    let line = '';
    for (let col = 0; col < SIZE; col++) {
      const cell = state.grid[row][col];
      const colorKey = cell.groupColor || 'undefined';
      line += COLOR_SYMBOLS[colorKey as ColorName | 'undefined'] + ' ';
    }
    console.error(line);
  }
  // Print queen positions
  console.error('Queen positions:');
  for (let row = 0; row < SIZE; row++) {
    let line = '';
    for (let col = 0; col < SIZE; col++) {
      line += (state.grid[row][col].isSolutionQueen ? 'Q' : '.') + ' ';
    }
    console.error(line);
  }
  // Print color group sizes
  const groupSizes = getColorGroupSizes(state.grid);
  console.error('Color group sizes:', groupSizes);
  console.error('------------------');
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

  // Keep expanding eligible blocked squares until no more can be expanded or board is full
  let keepExpanding = true;
  while (keepExpanding) {
    keepExpanding = false;
    // Recompute blocked squares after each expansion
    const blockedSquares = [
      ...eliminateConstrainedLinesForExpansion(state.grid, false),
      ...eliminateConstrainedLinesForExpansion(state.grid, true),
    ];
    // If board is full, stop
    const totalSquares = SIZE * SIZE;
    const coloredSquares = countColoredSquares(state.grid);
    if (coloredSquares === totalSquares) {
      console.log('Board is now full after expansions.');
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
        if (!isValidPosition(nRow, nCol)) continue;
        const neighborColor = state.grid[nRow][nCol].groupColor;
        if (neighborColor && !responsibleColors.includes(neighborColor)) {
          // Expand this color into the blocked square
          state.grid[row][col].groupColor = neighborColor;
          console.log(
            `Expanded color ${neighborColor} from (${nRow}, ${nCol}) into blocked square (${row}, ${col})`
          );
          keepExpanding = true;
          break; // Only expand one color per blocked square per iteration
        }
      }
    }
  }

  runAllSolverSteps(state);

  // Validate that Step 5 actually filled the board
  const totalSquares = SIZE * SIZE;
  const coloredSquares = countColoredSquares(state.grid);
  if (coloredSquares < totalSquares) {
    console.log(
      `Step 5 warning: Board not fully filled. ${coloredSquares}/${totalSquares} squares colored.`
    );
  } else {
    console.log(`Step 5 complete: Board fully filled (${coloredSquares}/${totalSquares} squares)`);
  }
}

function experimentCreateValidBoard() {
  const state = initializeGrid();
  const diagnosticsPerAttempt: { iterations: number; flags: number; marks: string }[] = [];
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    summary.attempts++;
    try {
      // Step 1: Place all queens
      placeAllQueens(state);
      validateQueenCount(state.grid, SIZE);
      console.log('Step 1 complete');
      // Step 2: Assign initial colors to queens
      assignInitialColorsToState(state);
      validateUniqueQueenColors(state.grid, SIZE);
      console.log('Step 2 complete');

      // Step 3: Expand color groups (should be 2 squares per color)
      expandColorGridSafely(state);
      validateGroupSizes(state.grid, 2);
      console.log('Step 3 complete');

      // Step 4: Expand color groups again (should be 3 squares per color)
      expandColorGridSafely(state);
      validateGroupSizes(state.grid, 3);
      console.log('Step 4 complete');

      // Step 5: Expand into blocked squares until board is full
      expandIntoBlockedSquares(state);

      try {
        validateSolvableAndFull(state);
        summary.success = true;
        summary.succeededOnAttempt = summary.attempts;
        return { success: true, grid: state.grid, diagnostics: diagnosticsPerAttempt };
      } catch {
        // classification logic continues…
      }
      // 3) Classify this failure:
      const isFull = state.grid.every((row) => row.every((cell) => cell.groupColor));
      if (!isFull) {
        summary.notFullCount++;
      } else {
        const { queenCountValid, colorGroupsValid } = validatePuzzleState(state.grid, SIZE);
        if (!(queenCountValid && colorGroupsValid)) {
          summary.unsolvableCount++;
        }
      }
      // 4) Prepare for next retry: clear auto-test marks, then loop
      clearAutoTestMarks(state);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      printDebugState(state, errorMessage);
      throw err;
    }
  }
  // After RETRIES exhausted, return failure with diagnostics
  const reason =
    summary.notFullCount === summary.attempts
      ? 'All attempts produced incomplete grids'
      : summary.unsolvableCount === summary.attempts
        ? 'All attempts produced full but invalid grids'
        : 'Mixed failures';
  return { success: false, error: reason, diagnostics: diagnosticsPerAttempt };
}

function main() {
  // Check command line arguments for different modes
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'list') {
    puzzleDatabase.listPuzzles();
    return;
  }

  if (command === 'stats') {
    puzzleDatabase.showStats();
    return;
  }

  if (command === 'export' && args[1]) {
    puzzleDatabase.exportPuzzle(args[1]);
    return;
  }

  if (command === 'delete' && args[1]) {
    puzzleDatabase.deletePuzzle(args[1]);
    return;
  }

  if (command === 'generate') {
    const batchSize = parseInt(args[1]) || BATCH;
    console.log(`Generating ${batchSize} new puzzles...`);

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

    for (let i = 0; i < batchSize; i++) {
      console.log(`\n--- Generating puzzle ${i + 1}/${batchSize} ---`);
      const { success, grid, error, diagnostics } = experimentCreateValidBoard();
      results.push({ success, grid, error, diagnostics });
      if (diagnostics) {
        diagnostics.forEach((diag, j) => {
          allDiagnostics.push({ attempt: i + 1, step: j + 1, ...diag });
        });
      }
      if (!success) {
        console.log(`Failed to generate puzzle ${i + 1}: ${error}`);
        break;
      }
    }

    console.log('\n–– Solver diagnostics per attempt ––');
    allDiagnostics.forEach(({ attempt, step, iterations, flags }) => {
      console.log(`Attempt ${attempt} Step ${step}: ${iterations} iterations, ${flags} flags`);
    });

    // Add successful puzzles to database
    const successfulPuzzles = results.filter((r) => r.success);
    if (successfulPuzzles.length > 0) {
      console.log(`\nAdding ${successfulPuzzles.length} successful puzzles to database...`);
      let addedCount = 0;
      successfulPuzzles.forEach((result, index) => {
        if (result.grid) {
          const wasAdded = puzzleDatabase.addPuzzle(result.grid);
          if (wasAdded) {
            addedCount++;
            console.log(`  Puzzle ${index + 1}: Added to database`);
          } else {
            console.log(`  Puzzle ${index + 1}: Duplicate, skipped`);
          }
        }
      });

      if (addedCount > 0) {
        console.log(`  ${addedCount} new puzzles saved to database`);
      }
    }

    // Output summary
    const output = {
      params: { size: SIZE, retries: RETRIES, batch: batchSize },
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

    process.exit(successfulPuzzles.length > 0 ? 0 : 1);
  }

  // Default behavior: generate one puzzle
  console.log('Generating 1 puzzle (default behavior)...');
  console.log('\nAvailable commands:');
  console.log('  yarn generate                    - Generate 1 puzzle');
  console.log('  yarn generate generate [number]  - Generate multiple puzzles');
  console.log('  yarn puzzle-db list              - List all puzzles in database');
  console.log('  yarn puzzle-db stats             - Show database statistics');
  console.log('  yarn puzzle-db export <puzzleId> - Export a specific puzzle');
  console.log('  yarn puzzle-db delete <puzzleId> - Delete a puzzle from database');

  const { success, grid, error, diagnostics } = experimentCreateValidBoard();

  if (success && grid) {
    const wasAdded = puzzleDatabase.addPuzzle(grid);
    if (wasAdded) {
      console.log(`\n=== Generation Summary ===`);
      console.log(`Successfully generated and saved puzzle`);
      console.log(`Generation attempts: ${summary.attempts}`);
      const stats = puzzleDatabase.getStats();
      console.log(`Database now contains ${stats.totalPuzzles} puzzles`);
    } else {
      console.log(`\n=== Generation Summary ===`);
      console.log(`Generated puzzle was duplicate, not saved`);
      console.log(`Generation attempts: ${summary.attempts}`);
      const stats = puzzleDatabase.getStats();
      console.log(`Database contains ${stats.totalPuzzles} puzzles`);
    }
  } else {
    console.log(`\nGeneration failed: ${error}`);
    process.exit(1);
  }
}

main();
