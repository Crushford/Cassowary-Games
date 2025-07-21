'use strict';

/**
 * generate.js
 * ------------
 * Standalone puzzle generator for the honeypot-ant logic.
 * Extracted from Pinia store: experimentCreateValidBoard and its helpers.
 * Outputs a JSON report containing puzzles, summary counters, and success status.
 */

// === Fixed Parameters ===
const SIZE = 5; // grid width/height
const RETRIES = 30; // max generation attempts
const SEED = 12345; // deterministic RNG seed
const BATCH = 1; // number of puzzles to generate
const OUT = null; // null ⇒ stdout, or a file path

// === Summary Counters ===
const summary = {
  success: false, // did we eventually find a valid board?
  attempts: 0, // how many retry iterations we performed
  succeededOnAttempt: null, // which iteration succeeded (1‐based)
  flagsPlaced: 0, // total “flag” events in auto‐test solver
  queensDug: 0, // total “queen” digs in auto‐test solver
  colorSteps: {
    // counts for each color‐assignment phase
    expandedNeighbor: 0,
    addedPerRow: 0,
    filledRemaining: 0,
  },
};

import fs from 'fs';
import { createEmptyGrid, validatePuzzleState } from './src/stores/gridUtils.ts';
import {
  assignInitialColorsToQueens as assignInitialColors,
  expandColorGroups as expandGroups,
  addColorOnePerRow,
  fillRemainingSingleSquares,
} from './src/utils/colorAssignment.ts';

// === Seedable RNG ===
let _seed = SEED;
function random() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}
function seedRandom(s) {
  _seed = s;
}

// === Helpers ===
function initializeGrid() {
  const grid = createEmptyGrid(SIZE);
  const playerMarks = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const autoTestMarks = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  return { grid, playerMarks, autoTestMarks };
}

function isValidMoveWithMarks(row, col, marks, grid) {
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

function placeAllQueens(state) {
  function countQueensInMarks(marks) {
    let count = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (marks[row][col] === 'queen') count++;
      }
    }
    return count;
  }
  function clearTempMarks(marks) {
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
  const tempQueenMarks = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
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

function placeRandomQueen(tempQueenMarks, grid) {
  const maxAttempts = 1000;
  let attempts = 0;
  function getValidMoves(preferKnight) {
    const moves = [];
    let knightMoves = [];
    let lastQueen = null;
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
  function cloneMarks(marks) {
    return marks.map((row) => [...row]);
  }
  function backtrack(queensPlaced) {
    if (queensPlaced === SIZE) return true;
    if (++attempts > maxAttempts) return false;
    const moves = getValidMoves(true);
    if (moves.length === 0) return false;
    for (let i = moves.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
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

function assignInitialColorsToState(state) {
  const queenPositions = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (state.grid[row][col].isSolutionQueen) {
        queenPositions.push({ row, col });
      }
    }
  }
  state.grid = assignInitialColors(state.grid, queenPositions);
}

function expandGroupsOnState(state) {
  state.grid = expandGroups(state.grid);
  summary.colorSteps.expandedNeighbor++;
  state.grid = addColorOnePerRow(state.grid);
  summary.colorSteps.addedPerRow++;
  state.grid = fillRemainingSingleSquares(state.grid);
  summary.colorSteps.filledRemaining++;
}

// === Auto-test solver loop and helpers ===
function runAllSolverSteps(state) {
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
function clearAutoTestMarks(state) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      state.autoTestMarks[row][col] = null;
    }
  }
}
function countAutoTestFlags(state) {
  let count = 0;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (state.autoTestMarks[row][col] === 'flag') count++;
    }
  }
  return count;
}
function flagSquaresWithoutColorGroups(state) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!state.grid[row][col].groupColor && state.autoTestMarks[row][col] === null) {
        state.autoTestMarks[row][col] = 'flag';
        summary.flagsPlaced++;
      }
    }
  }
}
function placeLastFreeQueens(state) {
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
function flagBlockingSquares(state) {
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
      const isLineFullyBlocked = (getterFn) => {
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
function eliminateConstrainedRows(state) {
  eliminateConstrainedLines(state, false);
}
function eliminateConstrainedColumns(state) {
  eliminateConstrainedLines(state, true);
}
function eliminateConstrainedLines(state, isColumn) {
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

function isBoardSolvableAndFull(state) {
  const { queenCountValid, colorGroupsValid } = validatePuzzleState(
    state.grid,
    state.playerMarks,
    SIZE
  );
  const allColored = state.grid.every((row) => row.every((cell) => cell.groupColor));
  return queenCountValid && colorGroupsValid && allColored;
}

function experimentCreateValidBoard() {
  const state = initializeGrid();
  placeAllQueens(state);
  assignInitialColorsToState(state);
  expandGroupsOnState(state);
  runAllSolverSteps(state);
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    summary.attempts++;
    if (isBoardSolvableAndFull(state)) {
      summary.success = true;
      summary.succeededOnAttempt = summary.attempts;
      return { success: true, grid: state.grid };
    }
    expandGroupsOnState(state);
    runAllSolverSteps(state);
  }
  return { success: false, grid: null, error: `Exceeded ${RETRIES}` };
}

function main() {
  seedRandom(SEED);
  const results = [];
  for (let i = 0; i < BATCH; i++) {
    const { success, grid, error } = experimentCreateValidBoard();
    results.push({ success, grid, error });
    if (!success) break;
  }
  const output = {
    params: { size: SIZE, retries: RETRIES, seed: SEED, batch: BATCH },
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
