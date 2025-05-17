import type { GridSquare, Pos } from '../types/types';

// Create an empty grid with specified dimensions
export function createEmptyGrid(size: number): GridSquare[][] {
  const grid: GridSquare[][] = [];
  for (let row = 0; row < size; row++) {
    const gridRow: GridSquare[] = [];
    for (let col = 0; col < size; col++) {
      gridRow.push({
        position: { row, col },
        state: 'empty',
        groupColor: undefined,
        playerMark: undefined as 'queen' | 'flag' | undefined,
      });
    }
    grid.push(gridRow);
  }
  return grid;
}

// Clone a grid for history management
export function cloneGrid(grid: GridSquare[][]): GridSquare[][] {
  return grid.map((row) =>
    row.map((cell) => ({
      position: { ...cell.position },
      state: cell.state,
      groupColor: cell.groupColor,
      playerMark: cell.playerMark,
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
      if (grid[row][col].state === 'queen') {
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
      if (grid[row][col].state === 'empty' && isValidMoveFn(row, col)) {
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
      if (grid[row][col].state !== 'empty') {
        grid[row][col].state = 'empty';
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

// Count empty cells in the grid
export function countEmptyCells(grid: GridSquare[][]): number {
  return countCellsWithState(grid, 'empty');
}

// Count cells with a specific state
export function countCellsWithState(grid: GridSquare[][], state: string): number {
  let count = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].state === state) {
        count++;
      }
    }
  }
  return count;
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
