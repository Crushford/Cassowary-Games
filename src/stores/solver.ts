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
      const free: Pos[] = group.filter(({ row, col }) => grid[row][col].state === 'empty');
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
        if (grid[row][col].state === 'empty') free.push({ row, col });
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
        if (grid[row][col].state === 'empty') free.push({ row, col });
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
      if (grid[r][c].state === 'empty') {
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
      if (grid[row][col].state !== 'empty') continue;
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
      if (grid[r][c].state === 'empty') {
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
          if (grid[row][col].state === 'empty') {
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
      if (grid[r][c].state === 'empty') {
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
          if (grid[row][col].state === 'empty') {
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
      if (grid[r][c].state === 'empty') {
        freeRows.get(r)!.push({ row: r, col: c });
        freeCols.get(c)!.push({ row: r, col: c });
      }
    }
  }
  // Try each empty square and flag if it blocks an entire row or column
  outer: for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col].state !== 'empty') continue;
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
  getQueenPositions: () => { row: number; col: number }[],
  testLogs: string[]
): void {
  if (!testLogs || testLogs.length === 0) {
    testLogs = [];
  }
  testLogs.push('--- Starting Solver Loop ---');

  // Track statistics instead of verbose logs
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
    testLogs.push(`--- Loop ${loop} ---`);

    // Save previous state for comparison
    const prevQueenPositions = getQueenPositions().length;

    // Step 1: Track only number of queens placed
    let prevFlags = countFlags();
    let changed1 = placeLastFreeQueens(grid, gridSize, placeQueen);
    let newQueens = getQueenPositions().length - prevQueenPositions;
    stats.step1Queens += newQueens;

    // Log only if queens were placed
    if (newQueens > 0) {
      testLogs.push(`Step 1: Placed ${newQueens} queens`);
    }

    // Step 2: Track only number of flags placed
    prevFlags = countFlags();
    let changed2 = flagBlockingSquares(grid, gridSize, placeFlag);
    let newFlags = countFlags() - prevFlags;
    stats.step2Flags += newFlags;

    // Log only if flags were placed
    if (newFlags > 0) {
      testLogs.push(`Step 2: Placed ${newFlags} flags`);
    }

    // Step 3: Constrained Row Elimination
    prevFlags = countFlags();
    let changed3 = eliminateConstrainedRows(grid, gridSize, placeFlag);
    newFlags = countFlags() - prevFlags;
    stats.step3Flags += newFlags;

    if (newFlags > 0) {
      testLogs.push(`Step 3: Placed ${newFlags} flags`);
    }

    // Step 4: Constrained Column Elimination
    prevFlags = countFlags();
    let changed4 = eliminateConstrainedColumns(grid, gridSize, placeFlag);
    newFlags = countFlags() - prevFlags;
    stats.step4Flags += newFlags;

    if (newFlags > 0) {
      testLogs.push(`Step 4: Placed ${newFlags} flags`);
    }

    // Step 5: Flag Row/Column Blocking Squares
    prevFlags = countFlags();
    let changed5 = blockRowsAndColumns(grid, gridSize, placeFlag);
    newFlags = countFlags() - prevFlags;
    stats.step5Flags += newFlags;

    if (newFlags > 0) {
      testLogs.push(`Step 5: Placed ${newFlags} flags`);
    }

    anyChange = changed1 || changed2 || changed3 || changed4 || changed5;

    // More concise loop result reporting
    if (anyChange) {
      testLogs.push(`Loop ${loop}: Made progress`);
    }

    loop++;
  } while (anyChange);

  // Summarize the solver results
  testLogs.push(`--- Solver finished after ${stats.loops} loops ---`);
  testLogs.push(
    `Total placements: ${stats.step1Queens} queens, ${stats.step2Flags + stats.step3Flags + stats.step4Flags + stats.step5Flags} flags`
  );
}
