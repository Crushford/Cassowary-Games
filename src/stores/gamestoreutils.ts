import type { GridSquare, Pos } from '../types/types';

// Create an empty grid with specified dimensions
export function createEmptyGrid(size: number): GridSquare[][] {
  return Array(size)
    .fill(null)
    .map((_, row) =>
      Array(size)
        .fill(null)
        .map(
          (_, col) =>
            ({
              position: { row, col },
              playerMark: 'empty',
              groupColor: undefined,
            }) as GridSquare
        )
    );
}

// Clone a grid for history management
export function cloneGrid(grid: GridSquare[][]): GridSquare[][] {
  return grid.map((row) =>
    row.map((cell) => ({
      position: { ...cell.position },
      playerMark: cell.playerMark,
      groupColor: cell.groupColor,
    }))
  );
}

// Check if a position is valid on the grid
export function isValidPosition(grid: GridSquare[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

// Get all queen positions from the grid
export function getQueenPositions(grid: GridSquare[][]): Pos[] {
  const positions: Pos[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].playerMark === 'queen') {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

// Compute available moves based on current grid state
export function computeAvailableMoves(
  grid: GridSquare[][],
  isValidMoveFn: (row: number, col: number) => boolean
): Pos[] {
  const availableMoves: Pos[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].playerMark === 'empty' && isValidMoveFn(row, col)) {
        availableMoves.push({ row, col });
      }
    }
  }
  return availableMoves;
}

// Clear all markers (queens & flags) from the grid
export function clearMarkers(grid: GridSquare[][]): void {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].playerMark !== 'empty') {
        grid[row][col].playerMark = 'empty';
      }
    }
  }
}

// Check if a queen would attack between two positions
export function queenAttacks(aRow: number, aCol: number, tRow: number, tCol: number): boolean {
  // Same row
  if (aRow === tRow) return true;
  // Same column
  if (aCol === tCol) return true;
  // Diagonal
  return Math.abs(aRow - tRow) === Math.abs(aCol - tCol);
}

// Count cells with a specific state
export function countCellsWithState(
  grid: GridSquare[][],
  targetState: 'queen' | 'flag' | 'invalid' | 'empty'
): number {
  let count = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].playerMark === targetState) {
        count++;
      }
    }
  }
  return count;
}

// Count empty cells in a grid
export function countEmptyCells(grid: GridSquare[][]): number {
  return countCellsWithState(grid, 'empty');
}

// Get distribution of colors in the grid
export function getColorDistribution(grid: GridSquare[][]): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      const color = grid[row][col].groupColor;
      if (color) {
        distribution[color] = (distribution[color] || 0) + 1;
      }
    }
  }

  return distribution;
}

// Validate a puzzle's state (queen count and color groups)
export function validatePuzzleState(
  grid: GridSquare[][],
  gridSize: number,
  minQueensPerColor = 1
): {
  queenCountValid: boolean;
  colorGroupsValid: boolean;
} {
  // Count queens
  const queens = getQueenPositions(grid);
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
