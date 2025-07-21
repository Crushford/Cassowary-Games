'use strict';

/**
 * generate.js
 * ------------
 * Standalone puzzle generator for the honeypot-ant logic.
 * Extracted from Pinia store: experimentCreateValidBoard and its helpers.
 * Outputs a JSON report containing puzzles, summary counters, and success status.
 */

// === Types ===
interface GeneratorState {
  grid: GridSquare[][];
  playerMarks: MarkType[][];
  autoTestMarks: MarkType[][];
}

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
import type { GridSquare, MarkType, Pos } from './src/types/types';

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

function getQueenPositions(grid: GridSquare[][], playerMarks: MarkType[][]): Pos[] {
  const positions: Pos[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (playerMarks[row][col] === 'queen') {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

function validatePuzzleState(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  gridSize: number
): {
  queenCountValid: boolean;
  colorGroupsValid: boolean;
} {
  // Count queens
  const queens = getQueenPositions(grid, playerMarks);
  const queenCountValid = queens.length === gridSize;

  // Check color groups
  let colorGroupsValid = true;

  // Group queens by color
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

  // Every color should have exactly one queen
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

function assignInitialColorsToQueens(
  grid: GridSquare[][],
  queenPositions: Pos[],
  log?: (...args: any[]) => void
): GridSquare[][] {
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;
  // Reset all colors
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      newGrid[r][c].groupColor = undefined;
    }
  }
  // Assign unique colors to each queen
  const palette: string[] = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
  if (queenPositions.length > palette.length) {
    if (typeof log === 'function') log(`Not enough colors for ${queenPositions.length} queens`);
    return newGrid;
  }
  queenPositions.forEach(({ row, col }) => {
    newGrid[row][col].groupColor = palette.pop();
  });
  if (typeof log === 'function') log('Assigned initial colors to queens');
  return newGrid;
}
// === Helpers ===
function initializeGrid(): GeneratorState {
  const grid = createEmptyGrid(SIZE);
  const playerMarks: MarkType[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const autoTestMarks: MarkType[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  return { grid, playerMarks, autoTestMarks };
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
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (marks[row][col] === 'queen') count++;
      }
    }
    return count;
  }
  function clearTempMarks(marks: MarkType[][]): void {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        marks[row][col] = null;
      }
    }
  }
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      state.grid[row][col].isSolutionQueen = false;
    }
  }
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
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (tempQueenMarks[row][col] === 'queen') {
          state.grid[row][col].isSolutionQueen = true;
        }
      }
    }
  }
}

function placeRandomQueen(tempQueenMarks: MarkType[][], grid: GridSquare[][]): boolean {
  const maxAttempts = 1000;
  let attempts = 0;
  function getValidMoves(preferKnight: boolean): Pos[] {
    const moves: Pos[] = [];
    const knightMoves: Pos[] = [];
    let lastQueen: Pos | null = null;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (tempQueenMarks[r][c] === 'queen') lastQueen = { row: r, col: c };
      }
    }
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
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
      }
    }
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
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          tempQueenMarks[r][c] = prevMarks[r][c];
        }
      }
    }
    return false;
  }
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      tempQueenMarks[row][col] = null;
    }
  }
  let success = backtrack(0);
  return success;
}

function assignInitialColorsToState(state: GeneratorState) {
  const queenPositions: Pos[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (state.grid[row][col].isSolutionQueen) {
        queenPositions.push({ row, col });
      }
    }
  }
  state.grid = assignInitialColorsToQueens(state.grid, queenPositions, console.log);
}
function expandColorGroups(grid: GridSquare[][], log?: (...args: any[]) => void): GridSquare[][] {
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const byColor = {};
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const square = newGrid[row][col];
      if (!square.groupColor) continue;
      if (!byColor[square.groupColor]) byColor[square.groupColor] = [];
      byColor[square.groupColor].push({ row, col, square });
    }
  }
  for (const group of Object.values(byColor)) {
    const base = group[0];
    const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
    for (const [dr, dc] of shuffled) {
      const r = base.row + dr;
      const c = base.col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !newGrid[r][c].groupColor) {
        newGrid[r][c].groupColor = base.square.groupColor;
        break;
      }
    }
  }
  if (typeof log === 'function') log('Expanded color groups by one neighbor');
  return newGrid;
}

function expandColorGridSafely(
  grid: GridSquare[][],
  runAllSolverSteps: (state: GeneratorState) => void,
  autoTestMarks: MarkType[][]
): GridSquare[][] {
  const savedGridState = JSON.parse(JSON.stringify(grid));
  let solvable = false;
  let attempts = 0;
  let newGrid = grid;
  while (!solvable && attempts < 10) {
    attempts++;
    newGrid = expandColorGroups(newGrid, console.log);
    // Always pass a full GeneratorState
    runAllSolverSteps({ grid: newGrid, autoTestMarks, playerMarks: [] });
    solvable = autoTestMarks.every((row) =>
      row.every((cell) => cell !== null && cell !== 'invalid')
    );
    if (!solvable) {
      newGrid = JSON.parse(JSON.stringify(savedGridState));
    }
  }
  if (!solvable) {
    throw new Error(`expandColorGridSafely: Failed after ${attempts} attempt(s).`);
  }
  return newGrid;
}

// === Auto-test solver loop and helpers ===
function runAllSolverSteps(state: GeneratorState) {
  clearAutoTestMarks(state);
  let previousFlagCount = -1;
  let currentFlagCount = countAutoTestFlags(state);
  while (previousFlagCount !== currentFlagCount) {
    previousFlagCount = currentFlagCount;
    flagSquaresWithoutColorGroups(state);
    placeLastFreeQueens(state);
    flagBlockingSquares(state);
    eliminateConstrainedRows(state);
    eliminateConstrainedColumns(state);
    currentFlagCount = countAutoTestFlags(state);
  }
}
function clearAutoTestMarks(state: GeneratorState) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      state.autoTestMarks[row][col] = null;
    }
  }
}
function countAutoTestFlags(state: GeneratorState) {
  let count = 0;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (state.autoTestMarks[row][col] === 'flag') count++;
    }
  }
  return count;
}
function flagSquaresWithoutColorGroups(state: GeneratorState) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!state.grid[row][col].groupColor && state.autoTestMarks[row][col] === null) {
        state.autoTestMarks[row][col] = 'flag';
        summary.flagsPlaced++;
      }
    }
  }
}
function placeLastFreeQueens(state: GeneratorState) {
  const colorGroups = new Map();
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const color = state.grid[row][col].groupColor;
      if (color) {
        if (!colorGroups.has(color)) colorGroups.set(color, []);
        colorGroups.get(color).push({ row, col });
      }
    }
  }
  for (const [color, positions] of colorGroups.entries()) {
    let unflagged = positions.filter(({ row, col }) => state.autoTestMarks[row][col] !== 'flag');
    if (unflagged.length === 1) {
      const { row, col } = unflagged[0];
      state.autoTestMarks[row][col] = 'queen';
      summary.queensDug++;
    }
  }
  for (let row = 0; row < SIZE; row++) {
    let unflagged = [];
    for (let col = 0; col < SIZE; col++) {
      if (state.autoTestMarks[row][col] !== 'flag') unflagged.push(col);
    }
    if (unflagged.length === 1) {
      state.autoTestMarks[row][unflagged[0]] = 'queen';
      summary.queensDug++;
    }
  }
  for (let col = 0; col < SIZE; col++) {
    let unflagged = [];
    for (let row = 0; row < SIZE; row++) {
      if (state.autoTestMarks[row][col] !== 'flag') unflagged.push(row);
    }
    if (unflagged.length === 1) {
      state.autoTestMarks[unflagged[0]][col] = 'queen';
      summary.queensDug++;
    }
  }
}
function flagBlockingSquares(state: GeneratorState) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (state.autoTestMarks[row][col] !== null) continue;
      const simulatedMarks = state.autoTestMarks.map((r) => [...r]);
      simulatedMarks[row][col] = 'queen';
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (simulatedMarks[r][c] !== null) continue;
          if (!isValidMoveWithMarks(r, c, simulatedMarks, state.grid)) {
            simulatedMarks[r][c] = 'flag';
          }
        }
      }
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
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const color = state.grid[r][c].groupColor;
          if (color) {
            if (!colorGroups.has(color)) colorGroups.set(color, []);
            colorGroups.get(color).push({ row: r, col: c });
          }
        }
      }
      let colorGroupBlocked = false;
      for (const positions of colorGroups.values()) {
        if (positions.every(({ row, col }) => simulatedMarks[row][col] === 'flag')) {
          colorGroupBlocked = true;
          break;
        }
      }
      if (rowFullyBlocked || colFullyBlocked || colorGroupBlocked) {
        state.autoTestMarks[row][col] = 'flag';
        summary.flagsPlaced++;
      }
    }
  }
}
function eliminateConstrainedRows(state: GeneratorState) {
  eliminateConstrainedLines(state, false);
}
function eliminateConstrainedColumns(state: GeneratorState) {
  eliminateConstrainedLines(state, true);
}
function eliminateConstrainedLines(state: GeneratorState, isColumn: boolean) {
  const colorToAxisMap = new Map();
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const color = state.grid[row][col].groupColor;
      const mark = state.autoTestMarks[row][col];
      if (mark === null && color) {
        const coord = isColumn ? col : row;
        if (!colorToAxisMap.has(color)) colorToAxisMap.set(color, new Set());
        colorToAxisMap.get(color).add(coord);
      }
    }
  }
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
          state.autoTestMarks[row][col] = 'flag';
          summary.flagsPlaced++;
        }
      }
    }
  }
}

function isBoardSolvableAndFull(state: GeneratorState) {
  const { queenCountValid, colorGroupsValid } = validatePuzzleState(
    state.grid,
    state.playerMarks,
    SIZE
  );
  const allColored = state.grid.every((row) => row.every((cell) => cell.groupColor));
  return queenCountValid && colorGroupsValid && allColored;
}

function getColorGroupSizes(grid: GridSquare[][]): { [key: string]: number } {
  const colorCounts: { [key: string]: number } = {};
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      const color = grid[row][col].groupColor;
      if (color) {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }
    }
  }
  return colorCounts;
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
      line += (cell.groupColor ? cell.groupColor[0].toUpperCase() : '.') + ' ';
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

function experimentCreateValidBoard() {
  const state = initializeGrid();
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    summary.attempts++;
    try {
      // Step 1: Place all queens
      placeAllQueens(state);
      // Verify that the number of queens is equal to the grid size
      let queenCount = 0;
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (state.grid[row][col].isSolutionQueen) queenCount++;
        }
      }
      if (queenCount !== SIZE) {
        throw new Error(`Step 1 failed: Expected ${SIZE} queens, found ${queenCount}`);
      }

      // Step 2: Assign initial colors to queens
      assignInitialColorsToState(state);
      // Verify that each queen has a unique color
      const queenColors = new Set();
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (state.grid[row][col].isSolutionQueen) {
            queenColors.add(state.grid[row][col].groupColor);
          }
        }
      }
      if (queenColors.size !== SIZE) {
        throw new Error(
          `Step 2 failed: Expected ${SIZE} unique queen colors, found ${queenColors.size}`
        );
      }

      // Step 3: Expand color groups (should be 2 squares per color)
      state.grid = expandColorGridSafely(state.grid, runAllSolverSteps, state.autoTestMarks);
      // Verify that each color group has 2 squares
      let groupSizes = getColorGroupSizes(state.grid);
      if (!Object.values(groupSizes).every((n) => n === 2)) {
        throw new Error(
          `Step 3 failed: Expected all color groups to have 2 squares, got sizes: ${JSON.stringify(groupSizes)}`
        );
      }

      // Step 4: Expand color groups again (should be 3 squares per color)
      state.grid = expandColorGridSafely(state.grid, runAllSolverSteps, state.autoTestMarks);
      // Verify that each color group has 3 squares
      groupSizes = getColorGroupSizes(state.grid);
      if (!Object.values(groupSizes).every((n) => n === 3)) {
        throw new Error(
          `Step 4 failed: Expected all color groups to have 3 squares, got sizes: ${JSON.stringify(groupSizes)}`
        );
      }

      // Run solver steps
      if (!runAllSolverSteps(state)) {
        throw new Error('failed on step 4');
      }

      if (isBoardSolvableAndFull(state)) {
        summary.success = true;
        summary.succeededOnAttempt = summary.attempts;
        return { success: true, grid: state.grid };
      }
      // 3) Classify this failure:
      const isFull = state.grid.every((row) => row.every((cell) => cell.groupColor));
      if (!isFull) {
        summary.notFullCount++;
      } else {
        const { queenCountValid, colorGroupsValid } = validatePuzzleState(
          state.grid,
          state.playerMarks,
          SIZE
        );
        if (!(queenCountValid && colorGroupsValid)) {
          summary.unsolvableCount++;
        }
      }
      // 4) Prepare for next retry: clear auto-test marks, then loop
      clearAutoTestMarks(state);
    } catch (err) {
      printDebugState(state, err && err.message ? err.message : String(err));
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
  return { success: false, error: reason };
}

function main() {
  type Result = { success: boolean; grid?: GridSquare[][]; error?: string };
  const results: Result[] = [];
  for (let i = 0; i < BATCH; i++) {
    const { success, grid, error } = experimentCreateValidBoard();
    results.push({ success, grid, error });
    if (!success) break;
  }
  const output = {
    params: { size: SIZE, retries: RETRIES, batch: BATCH },
    summary,
    puzzles: results.map((r) => r.grid),
    errors: results.filter((r) => !r.success).map((r) => r.error),
  };
  const json = JSON.stringify(output, null, 2);
  if (OUT) fs.writeFileSync(OUT, json);
  else console.log(json);
  process.exit(summary.success ? 0 : 1);
}

main();
