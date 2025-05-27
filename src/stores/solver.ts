import type { GridSquare, Pos } from '../types/types';
import { queenAttacks } from './gameStoreUtils';

// Helper for step 1: Place queens in last free squares of color blocks, rows, or columns
export function placeLastFreeQueens(
  grid: GridSquare[][],
  gridSize: number,
  placeQueen: (row: number, col: number) => boolean
): boolean {
  let didSomething = false;
  let queensPlaced = 0;
  let placed;

  do {
    placed = false;
    // 1. Check color blocks
    const colorGroups = new Map<string, Pos[]>();
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const color = grid[row][col].groupColor;
        if (!color) continue;
        if (!colorGroups.has(color)) colorGroups.set(color, []);
        colorGroups.get(color)!.push({ row, col });
      }
    }
    for (const [color, group] of colorGroups.entries()) {
      const free: Pos[] = group.filter(({ row, col }) => grid[row][col].playerMark === 'empty');
      if (free.length === 1) {
        const { row, col } = free[0];
        placeQueen(row, col);
        queensPlaced++;
        placed = true;
        didSomething = true;
        break;
      }
    }
    if (placed) continue;
    // 2. Check rows
    for (let row = 0; row < gridSize; row++) {
      const free: Pos[] = [];
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col].playerMark === 'empty') free.push({ row, col });
      }
      if (free.length === 1) {
        const { row, col } = free[0];
        placeQueen(row, col);
        queensPlaced++;
        placed = true;
        didSomething = true;
        break;
      }
    }
    if (placed) continue;
    // 3. Check columns
    for (let col = 0; col < gridSize; col++) {
      const free: Pos[] = [];
      for (let row = 0; row < gridSize; row++) {
        if (grid[row][col].playerMark === 'empty') free.push({ row, col });
      }
      if (free.length === 1) {
        const { row, col } = free[0];
        placeQueen(row, col);
        queensPlaced++;
        placed = true;
        didSomething = true;
        break;
      }
    }
  } while (placed);

  return didSomething;
}

// Helper for step 2: Flag squares where a queen would block all remaining squares in other color groups
export function flagBlockingSquares(
  grid: GridSquare[][],
  gridSize: number,
  placeFlag: (row: number, col: number) => boolean
): boolean {
  let flagCount = 0;
  let didSomething = false;

  // Build map of empty squares by color group
  const emptyColorGroups = new Map<string, Pos[]>();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].playerMark === 'empty') {
        const grp = grid[r][c].groupColor;
        if (!grp) continue;
        if (!emptyColorGroups.has(grp)) emptyColorGroups.set(grp, []);
        emptyColorGroups.get(grp)!.push({ row: r, col: c });
      }
    }
  }

  // For each empty square, check all other color groups
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col].playerMark !== 'empty') continue;
      const myColor = grid[row][col].groupColor;
      if (!myColor) continue;
      for (const [otherColor, groupEmpty] of emptyColorGroups.entries()) {
        if (otherColor === myColor) continue;
        if (groupEmpty.length <= 1) continue;
        let allAttacked = true;
        for (const { row: r, col: c } of groupEmpty) {
          if (!queenAttacks(row, col, r, c)) {
            allAttacked = false;
            break;
          }
        }
        if (allAttacked) {
          placeFlag(row, col);
          flagCount++;
          didSomething = true;
          break;
        }
      }
    }
  }

  return didSomething;
}

// Step 3: Constrained Row Elimination
export function eliminateConstrainedRows(
  grid: GridSquare[][],
  gridSize: number,
  placeFlag: (row: number, col: number) => boolean
): boolean {
  const emptyColorGroups = new Map<string, Pos[]>();
  // Build map of empty squares by color group
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].playerMark === 'empty') {
        const grp = grid[r][c].groupColor;
        if (!grp) continue;
        if (!emptyColorGroups.has(grp)) emptyColorGroups.set(grp, []);
        emptyColorGroups.get(grp)!.push({ row: r, col: c });
      }
    }
  }
  // Generate all non-empty subsets of rows
  const rows = Array.from({ length: gridSize }, (_, i) => i);
  const subsets: number[][] = [];
  function genSubsets(arr: number[], start: number, curr: number[]) {
    for (let i = start; i < arr.length; i++) {
      const next = curr.concat(arr[i]);
      subsets.push(next);
      genSubsets(arr, i + 1, next);
    }
  }
  genSubsets(rows, 0, []);
  let flagCount = 0;
  let didSomething = false;
  for (const S of subsets) {
    const uniqueColors = Array.from(emptyColorGroups.entries())
      .filter(([, positions]) => positions.length > 0 && positions.every((p) => S.includes(p.row)))
      .map(([color]) => color);
    if (uniqueColors.length === S.length && uniqueColors.length > 0) {
      for (const row of S) {
        for (let col = 0; col < gridSize; col++) {
          if (grid[row][col].playerMark === 'empty') {
            const grp = grid[row][col].groupColor;
            if (!grp || !uniqueColors.includes(grp)) {
              placeFlag(row, col);
              flagCount++;
              didSomething = true;
            }
          }
        }
      }
    }
  }
  return didSomething;
}

// Step 4: Constrained Column Elimination
export function eliminateConstrainedColumns(
  grid: GridSquare[][],
  gridSize: number,
  placeFlag: (row: number, col: number) => boolean
): boolean {
  const emptyColorGroups = new Map<string, Pos[]>();
  // Build map of empty squares by color group
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].playerMark === 'empty') {
        const grp = grid[r][c].groupColor;
        if (!grp) continue;
        if (!emptyColorGroups.has(grp)) emptyColorGroups.set(grp, []);
        emptyColorGroups.get(grp)!.push({ row: r, col: c });
      }
    }
  }
  // Generate all non-empty subsets of columns
  const cols = Array.from({ length: gridSize }, (_, i) => i);
  const subsets: number[][] = [];
  function genSubsets(arr: number[], start: number, curr: number[]) {
    for (let i = start; i < arr.length; i++) {
      const next = curr.concat(arr[i]);
      subsets.push(next);
      genSubsets(arr, i + 1, next);
    }
  }
  genSubsets(cols, 0, []);
  let flagCount = 0;
  let didSomething = false;
  for (const S of subsets) {
    const uniqueColors = Array.from(emptyColorGroups.entries())
      .filter(([, positions]) => positions.length > 0 && positions.every((p) => S.includes(p.col)))
      .map(([color]) => color);
    if (uniqueColors.length === S.length && uniqueColors.length > 0) {
      for (const col of S) {
        for (let row = 0; row < gridSize; row++) {
          if (grid[row][col].playerMark === 'empty') {
            const grp = grid[row][col].groupColor;
            if (!grp || !uniqueColors.includes(grp)) {
              placeFlag(row, col);
              flagCount++;
              didSomething = true;
            }
          }
        }
      }
    }
  }
  return didSomething;
}

// Step 5: Flag squares where a queen would block all remaining free squares in any row or column
export function blockRowsAndColumns(
  grid: GridSquare[][],
  gridSize: number,
  placeFlag: (row: number, col: number) => boolean
): boolean {
  let flagCount = 0;
  let didSomething = false;

  // Build lists of empty positions per row and per column
  const freeRows = new Map<number, Pos[]>();
  const freeCols = new Map<number, Pos[]>();
  for (let i = 0; i < gridSize; i++) {
    freeRows.set(i, []);
    freeCols.set(i, []);
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].playerMark === 'empty') {
        freeRows.get(r)!.push({ row: r, col: c });
        freeCols.get(c)!.push({ row: r, col: c });
      }
    }
  }
  // Try each empty square and flag if it blocks an entire row or column
  outer: for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col].playerMark !== 'empty') continue;
      // Check other rows
      for (const [r, positions] of freeRows.entries()) {
        if (r === row || positions.length === 0) continue;
        if (positions.every((p) => queenAttacks(row, col, p.row, p.col))) {
          placeFlag(row, col);
          flagCount++;
          didSomething = true;
          break outer;
        }
      }
      // Check other columns
      for (const [c, positions] of freeCols.entries()) {
        if (c === col || positions.length === 0) continue;
        if (positions.every((p) => queenAttacks(row, col, p.row, p.col))) {
          placeFlag(row, col);
          flagCount++;
          didSomething = true;
          break outer;
        }
      }
    }
  }
  return didSomething;
}

// Main solver loop that runs all steps until no changes
export function runAllSolverSteps(
  grid: GridSquare[][],
  gridSize: number,
  placeQueen: (row: number, col: number) => boolean,
  placeFlag: (row: number, col: number) => boolean,
  countFlags: () => number,
  getQueenPositions: () => Pos[],
  logFn: (message: string) => void,
  verbose: boolean = false
): void {
  // Only log if verbose mode is enabled
  const log = (message: string) => {
    if (verbose) {
      logFn(message);
    }
  };

  // Log the start of solver
  log('--- Starting Solver ---');

  // Track statistics
  let stats = {
    loops: 0,
    step1Queens: 0,
    step2Flags: 0,
    step3Flags: 0,
    step4Flags: 0,
    step5Flags: 0,
  };

  let loop = 1;
  let anyChange;
  do {
    stats.loops++;

    // Save previous state for comparison
    const prevQueenPositions = getQueenPositions().length;
    const prevFlags = countFlags();

    // Step 1: Place last free queens
    let changed1 = placeLastFreeQueens(grid, gridSize, placeQueen);
    let newQueens = getQueenPositions().length - prevQueenPositions;
    stats.step1Queens += newQueens;

    // Step 2: Flag blocking squares
    let changed2 = flagBlockingSquares(grid, gridSize, placeFlag);
    let newFlags = countFlags() - prevFlags;
    stats.step2Flags += newFlags;

    // Step 3: Constrained Row Elimination
    let changed3 = eliminateConstrainedRows(grid, gridSize, placeFlag);
    newFlags = countFlags() - prevFlags;
    stats.step3Flags += newFlags;

    // Step 4: Constrained Column Elimination
    let changed4 = eliminateConstrainedColumns(grid, gridSize, placeFlag);
    newFlags = countFlags() - prevFlags;
    stats.step4Flags += newFlags;

    // Step 5: Flag Row/Column Blocking Squares
    let changed5 = blockRowsAndColumns(grid, gridSize, placeFlag);
    newFlags = countFlags() - prevFlags;
    stats.step5Flags += newFlags;

    anyChange = changed1 || changed2 || changed3 || changed4 || changed5;

    // Only log if there were changes
    if (anyChange) {
      log(`Loop ${loop}:`);
      if (newQueens > 0) log(`  - Placed ${newQueens} queens`);
      if (stats.step2Flags > 0) log(`  - Placed ${stats.step2Flags} blocking flags`);
      if (stats.step3Flags > 0) log(`  - Placed ${stats.step3Flags} row elimination flags`);
      if (stats.step4Flags > 0) log(`  - Placed ${stats.step4Flags} column elimination flags`);
      if (stats.step5Flags > 0) log(`  - Placed ${stats.step5Flags} row/column blocking flags`);
    }

    loop++;
  } while (anyChange);

  // Always log the final result, even if verbose is false
  const success = getQueenPositions().length === gridSize;
  if (success) {
    logFn('--- Solver Complete ---');
    logFn(
      `Total: ${stats.step1Queens} queens, ${stats.step2Flags + stats.step3Flags + stats.step4Flags + stats.step5Flags} flags in ${stats.loops} loops`
    );
  }
}
