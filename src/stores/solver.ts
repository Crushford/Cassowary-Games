import type { GridSquare, Pos, MarkType } from '../types/types';

// Helper for step 1: Place queens in last free squares of color blocks, rows, or columns
export function placeLastFreeQueens(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  placeQueen: (row: number, col: number) => boolean
): boolean {
  const gridSize = grid.length;
  let placedAny = false;

  // For each row
  for (let row = 0; row < gridSize; row++) {
    let emptyCount = 0;
    let lastEmptyCol = -1;

    // Count empty squares in this row
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === null) {
        emptyCount++;
        lastEmptyCol = col;
      }
    }

    // If there's exactly one empty square, place a queen there
    if (emptyCount === 1) {
      if (placeQueen(row, lastEmptyCol)) {
        placedAny = true;
      }
    }
  }

  // For each column
  for (let col = 0; col < gridSize; col++) {
    let emptyCount = 0;
    let lastEmptyRow = -1;

    // Count empty squares in this column
    for (let row = 0; row < gridSize; row++) {
      if (playerMarks[row][col] === null) {
        emptyCount++;
        lastEmptyRow = row;
      }
    }

    // If there's exactly one empty square, place a queen there
    if (emptyCount === 1) {
      if (placeQueen(lastEmptyRow, col)) {
        placedAny = true;
      }
    }
  }

  return placedAny;
}

// Helper for step 2: Flag squares where a queen would block all remaining squares in other color groups
export function flagBlockingSquares(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  placeFlag: (row: number, col: number) => boolean
): boolean {
  const gridSize = grid.length;
  let placedAny = false;

  // For each queen
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === 'queen') {
        // Flag all squares in the same row and column
        for (let i = 0; i < gridSize; i++) {
          if (i !== col && playerMarks[row][i] === null) {
            if (placeFlag(row, i)) {
              placedAny = true;
            }
          }
          if (i !== row && playerMarks[i][col] === null) {
            if (placeFlag(i, col)) {
              placedAny = true;
            }
          }
        }

        // Flag diagonally adjacent squares
        const directions = [
          { dr: 1, dc: 1 }, // down-right
          { dr: 1, dc: -1 }, // down-left
          { dr: -1, dc: 1 }, // up-right
          { dr: -1, dc: -1 }, // up-left
        ];

        for (const dir of directions) {
          const newRow = row + dir.dr;
          const newCol = col + dir.dc;
          if (
            newRow >= 0 &&
            newRow < gridSize &&
            newCol >= 0 &&
            newCol < gridSize &&
            playerMarks[newRow][newCol] === null
          ) {
            if (placeFlag(newRow, newCol)) {
              placedAny = true;
            }
          }
        }
      }
    }
  }

  return placedAny;
}

// Step 3: Constrained Row Elimination
export function eliminateConstrainedRows(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  placeFlag: (row: number, col: number) => boolean
): boolean {
  const gridSize = grid.length;
  let placedAny = false;

  // For each row
  for (let row = 0; row < gridSize; row++) {
    // Count queens and empty squares
    let queenCount = 0;
    let emptySquares: number[] = [];

    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === 'queen') {
        queenCount++;
      } else if (playerMarks[row][col] === null) {
        emptySquares.push(col);
      }
    }

    // If we have exactly one empty square and one queen needed
    if (emptySquares.length === 1 && queenCount === 0) {
      if (placeFlag(row, emptySquares[0])) {
        placedAny = true;
      }
    }
  }

  return placedAny;
}

// Step 4: Constrained Column Elimination
export function eliminateConstrainedColumns(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  placeFlag: (row: number, col: number) => boolean
): boolean {
  const gridSize = grid.length;
  let placedAny = false;

  // For each column
  for (let col = 0; col < gridSize; col++) {
    // Count queens and empty squares
    let queenCount = 0;
    let emptySquares: number[] = [];

    for (let row = 0; row < gridSize; row++) {
      if (playerMarks[row][col] === 'queen') {
        queenCount++;
      } else if (playerMarks[row][col] === null) {
        emptySquares.push(row);
      }
    }

    // If we have exactly one empty square and one queen needed
    if (emptySquares.length === 1 && queenCount === 0) {
      if (placeFlag(emptySquares[0], col)) {
        placedAny = true;
      }
    }
  }

  return placedAny;
}

// Step 5: Flag squares where a queen would block all remaining free squares in any row or column
export function blockRowsAndColumns(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  placeFlag: (row: number, col: number) => boolean
): boolean {
  const gridSize = grid.length;
  let placedAny = false;

  // For each row
  for (let row = 0; row < gridSize; row++) {
    let queenCount = 0;
    let emptySquares: number[] = [];

    // Count queens and empty squares in this row
    for (let col = 0; col < gridSize; col++) {
      if (playerMarks[row][col] === 'queen') {
        queenCount++;
      } else if (playerMarks[row][col] === null) {
        emptySquares.push(col);
      }
    }

    // If we have exactly one queen and one empty square
    if (queenCount === 1 && emptySquares.length === 1) {
      // Flag all squares in the same column as the empty square
      const emptyCol = emptySquares[0];
      for (let r = 0; r < gridSize; r++) {
        if (r !== row && playerMarks[r][emptyCol] === null) {
          if (placeFlag(r, emptyCol)) {
            placedAny = true;
          }
        }
      }
    }
  }

  // For each column
  for (let col = 0; col < gridSize; col++) {
    let queenCount = 0;
    let emptySquares: number[] = [];

    // Count queens and empty squares in this column
    for (let row = 0; row < gridSize; row++) {
      if (playerMarks[row][col] === 'queen') {
        queenCount++;
      } else if (playerMarks[row][col] === null) {
        emptySquares.push(row);
      }
    }

    // If we have exactly one queen and one empty square
    if (queenCount === 1 && emptySquares.length === 1) {
      // Flag all squares in the same row as the empty square
      const emptyRow = emptySquares[0];
      for (let c = 0; c < gridSize; c++) {
        if (c !== col && playerMarks[emptyRow][c] === null) {
          if (placeFlag(emptyRow, c)) {
            placedAny = true;
          }
        }
      }
    }
  }

  return placedAny;
}

// Main solver loop that runs all steps until no changes
export function runAllSolverSteps(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  placeQueen: (row: number, col: number) => boolean,
  placeFlag: (row: number, col: number) => boolean,
  countFlags: () => number,
  getQueenPositions: () => Pos[],
  logFn: (message: string) => void,
  verbose: boolean = false
): void {
  const log = (message: string) => {
    if (verbose) {
      logFn(message);
    }
  };

  let previousFlagCount = -1;
  let currentFlagCount = countFlags();

  while (previousFlagCount !== currentFlagCount) {
    previousFlagCount = currentFlagCount;

    // Step 1: Place last free queens
    if (placeLastFreeQueens(grid, playerMarks, placeQueen)) {
      log('Placed last free queens');
    }

    // Step 2: Flag blocking squares
    if (flagBlockingSquares(grid, playerMarks, placeFlag)) {
      log('Flagged blocking squares');
    }

    // Step 3: Eliminate constrained rows
    if (eliminateConstrainedRows(grid, playerMarks, placeFlag)) {
      log('Eliminated constrained rows');
    }

    // Step 4: Eliminate constrained columns
    if (eliminateConstrainedColumns(grid, playerMarks, placeFlag)) {
      log('Eliminated constrained columns');
    }

    // Step 5: Block rows and columns
    if (blockRowsAndColumns(grid, playerMarks, placeFlag)) {
      log('Blocked rows and columns');
    }

    currentFlagCount = countFlags();
  }
}
