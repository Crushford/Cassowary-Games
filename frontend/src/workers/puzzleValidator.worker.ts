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
  const previousQueenPositions: Pos[] = []; // Track queen positions from previous solutions

  // Create a temporary playerMarks array for validation
  let playerMarks: PlayerMarks = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  // First, flag all squares with null color groups
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col].groupColor === null) {
        playerMarks[row][col] = 'flag';
      }
    }
  }

  const stepStates: PlayerMarks[] = [];

  // Helper function to get queen positions
  function getQueenPositions(): Pos[] {
    const positions: Pos[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (playerMarks[row][col] === 'queen') {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  function tryPlaceQueen(pos: Pos): boolean {
    // If this position was a queen in a previous solution, we must place a flag instead
    if (previousQueenPositions.some((p) => p.row === pos.row && p.col === pos.col)) {
      playerMarks[pos.row][pos.col] = 'flag';
      return false;
    }

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
    // Early exit if we've found enough solutions
    if (solutionsFound >= maxSolutions) {
      return false;
    }

    const pos = findNextEmptySquare(playerMarks);
    if (!pos) {
      // No more empty squares - check if we have a valid solution
      const queenCount = playerMarks.flat().filter((mark) => mark === 'queen').length;
      if (queenCount === gridSize) {
        // Store the queen positions for this solution
        const queenPositions = getQueenPositions();

        // Check if this solution is different from previous ones
        const isNewSolution = !previousQueenPositions.some((prevPos) =>
          queenPositions.some(
            (currPos) => currPos.row === prevPos.row && currPos.col === prevPos.col
          )
        );

        if (isNewSolution) {
          solutionsFound++;
          // Store one queen position from this solution to force a different path next time
          if (queenPositions.length > 0) {
            previousQueenPositions.push(queenPositions[0]);
          }
        }
        return solutionsFound < maxSolutions;
      }
      return true;
    }

    // Try placing a queen
    if (tryPlaceQueen(pos)) {
      // Continue solving with the queen placed
      if (!solve()) return false;
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
  const { grid, maxSolutions = 2 } = e.data;
  const solutions = validatePuzzle(grid, maxSolutions);
  self.postMessage({ solutions });
};
