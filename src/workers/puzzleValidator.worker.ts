import type { GridSquare, MarkType, Pos } from '../types/types';

type PlayerMarks = MarkType[][];

function findNextEmptySquare(playerMarks: MarkType[][]): Pos | null {
  for (let row = 0; row < playerMarks.length; row++) {
    for (let col = 0; col < playerMarks[row].length; col++) {
      if (playerMarks[row][col] === null) {
        return { row, col };
      }
    }
  }
  return null;
}

function placeQueen(grid: GridSquare[][], oldPlayerMarks: PlayerMarks, pos: Pos): PlayerMarks {
  // Create a deep copy of playerMarks
  const newPlayerMarks = oldPlayerMarks.map((row) => [...row]);

  // Place the queen
  newPlayerMarks[pos.row][pos.col] = 'queen';

  // Get the color of the square (if any)
  const queenColor = grid[pos.row][pos.col].groupColor;

  // Flag squares in the same row and column
  for (let i = 0; i < grid.length; i++) {
    // Flag squares in the same row
    if (newPlayerMarks[pos.row][i] === null) {
      newPlayerMarks[pos.row][i] = 'flag';
    }
    // Flag squares in the same column
    if (newPlayerMarks[i][pos.col] === null) {
      newPlayerMarks[i][pos.col] = 'flag';
    }
  }

  // Flag squares in the same color group
  if (queenColor) {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid.length; col++) {
        if (grid[row][col].groupColor === queenColor && newPlayerMarks[row][col] === null) {
          newPlayerMarks[row][col] = 'flag';
        }
      }
    }
  }

  return newPlayerMarks;
}

function isPuzzleBlocked(grid: GridSquare[][], playerMarks: PlayerMarks): boolean {
  const gridSize = grid.length;

  // Check rows
  if (playerMarks.some((row) => row.every((mark) => mark === 'flag'))) {
    return true;
  }

  // Check columns
  if (
    Array.from({ length: gridSize }, (_, col) =>
      playerMarks.every((row) => row[col] === 'flag')
    ).includes(true)
  ) {
    return true;
  }

  // Check color groups
  const groups: { [color: string]: MarkType[] } = {};

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const color = grid[row][col].groupColor;
      const mark = playerMarks[row][col];
      if (!color) continue;

      if (!groups[color]) {
        groups[color] = [];
      }

      groups[color].push(mark);
    }
  }

  for (const color in groups) {
    if (groups[color].every((mark) => mark === 'flag')) {
      return true;
    }
  }

  return false;
}

function validatePuzzle(grid: GridSquare[][], maxSolutions: number = 2): number {
  const gridSize = grid.length;
  let solutionsFound = 0;

  // Create a temporary playerMarks array for validation
  let playerMarks: PlayerMarks = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const stepStates: PlayerMarks[] = [];

  // First, flag all squares with null color groups
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col].groupColor === null) {
        playerMarks[row][col] = 'flag';
      }
    }
  }

  function tryPlaceQueen(pos: Pos): boolean {
    // Save current state
    stepStates.push(JSON.parse(JSON.stringify(playerMarks)));

    // Try placing queen
    playerMarks = placeQueen(grid, playerMarks, pos);

    // Check if this makes the puzzle blocked
    if (isPuzzleBlocked(grid, playerMarks)) {
      // Revert to previous state
      playerMarks = stepStates.pop()!;
      // Place flag instead
      playerMarks[pos.row][pos.col] = 'flag';

      // Check if placing flag makes it blocked
      if (isPuzzleBlocked(grid, playerMarks)) {
        // If still blocked, revert again
        playerMarks = stepStates.pop()!;
        return false;
      }
    }

    return true;
  }

  function solve(): boolean {
    const pos = findNextEmptySquare(playerMarks);
    if (!pos) {
      // No more empty squares - check if we have a valid solution
      const queenCount = playerMarks.flat().filter((mark) => mark === 'queen').length;
      if (queenCount === gridSize) {
        solutionsFound++;
        if (solutionsFound > maxSolutions) {
          return false; // Too many solutions
        }
        return true;
      }
    } else {
      // Try placing a queen
      if (tryPlaceQueen(pos)) {
        // Continue solving with the queen placed
        if (!solve()) return false;
      }
    }

    // If we get here, either placing a queen failed or we need to backtrack
    // Try the next empty square
    return solve();
  }

  // Start solving
  solve();
  return solutionsFound;
}

// Handle messages from the main thread
self.onmessage = (e: MessageEvent) => {
  const { grid, maxSolutions } = e.data;
  const solutions = validatePuzzle(grid, maxSolutions);
  self.postMessage({ solutions });
};
