import type { GridSquare } from '../components/GameGrid.vue';
import type { Pos } from '../stores/gameStoreUtils';

// Helper function to check if a position is valid within the grid
function isValidPosition(grid: GridSquare[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

// Helper to ensure no color block has a singleton square
export function ensureNoSingletonColorBlocks(grid: GridSquare[][]): GridSquare[][] {
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  const colorGroups: Record<string, { row: number; col: number }[]> = {};
  // Build map of color groups
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const color = newGrid[row][col].groupColor;
      if (!color) continue;
      if (!colorGroups[color]) colorGroups[color] = [];
      colorGroups[color].push({ row, col });
    }
  }

  const directions = [
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
  ];

  // Reassign any singleton cell to a neighbor's color
  for (const [color, positions] of Object.entries(colorGroups)) {
    if (positions.length === 1) {
      const { row, col } = positions[0];
      // Skip singleton if it's a queen to avoid duplicating color among queens
      if (newGrid[row][col].state === 'queen') continue;
      const neighborColors = new Set<string>();
      for (const dir of directions) {
        const newR = row + dir.dr;
        const newC = col + dir.dc;
        if (
          isValidPosition(newGrid, newR, newC) &&
          newGrid[newR][newC].groupColor &&
          newGrid[newR][newC].groupColor !== color
        ) {
          neighborColors.add(newGrid[newR][newC].groupColor!);
        }
      }
      if (neighborColors.size > 0) {
        const choices = Array.from(neighborColors);
        const newColor = choices[Math.floor(Math.random() * choices.length)];
        newGrid[row][col].groupColor = newColor;
      }
    }
  }

  return newGrid;
}

// Helper to add one square to each color group
function addOneToEachColorGroup(grid: GridSquare[][]): GridSquare[][] {
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  // Group colored squares by color, with full coordinates
  const byColor: Record<string, { row: number; col: number; square: GridSquare }[]> = {};

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const square = newGrid[row][col];
      if (!square.groupColor) continue;
      (byColor[square.groupColor] ??= []).push({ row, col, square });
    }
  }

  // For each color group, try to add one neighbor square
  for (const group of Object.values(byColor)) {
    const base = group[0]; // pick first square in group
    const shuffled = dirs.slice().sort(() => Math.random() - 0.5);

    for (const [dr, dc] of shuffled) {
      const r = base.row + dr;
      const c = base.col + dc;

      if (isValidPosition(newGrid, r, c)) {
        const neighbor = newGrid[r][c];
        if (!neighbor.groupColor && neighbor.playerMark !== 'queen') {
          neighbor.groupColor = base.square.groupColor;
          break; // only one added per group
        }
      }
    }
  }

  return newGrid;
}

// Main function to assign colors to the grid
export function assignColors(
  grid: GridSquare[][],
  queenPositions: Pos[],
  logsOrNull?: string[] | null
): GridSquare[][] {
  // Create a safe logs array that's guaranteed to be an array even if null or undefined is passed
  const logs = Array.isArray(logsOrNull) ? logsOrNull : [];

  // Create a deep copy of the grid
  let newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  // 1. Reset all colors
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      newGrid[r][c].groupColor = undefined;
    }
  }

  // 2. Color queens
  const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
  if (queenPositions.length > palette.length) {
    logs.push(`Not enough colors for ${queenPositions.length} queens`);
    return newGrid;
  }

  queenPositions.forEach(({ row, col }) => {
    newGrid[row][col].groupColor = palette.pop();
  });

  // 3. Region growth (BFS)
  // Add one square to each color group three times
  newGrid = addOneToEachColorGroup(newGrid);
  newGrid = addOneToEachColorGroup(newGrid);
  newGrid = addOneToEachColorGroup(newGrid);

  // 4. Add colors to each row
  newGrid = addColorToEachRow(newGrid, logs);

  // 5. Ensure no singleton color blocks
  newGrid = ensureNoSingletonColorBlocks(newGrid);

  return newGrid;
}

// Function to add color to each row
export function addColorToEachRow(
  grid: GridSquare[][],
  logsOrNull?: string[] | null
): GridSquare[][] {
  // Create a safe logs array that's guaranteed to be an array even if null or undefined is passed
  const logs = Array.isArray(logsOrNull) ? logsOrNull : [];

  // Create a deep copy of the grid to avoid mutating the original
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  for (let row = 0; row < gridSize; row++) {
    // 1. Collect un-colored squares in this row
    const uncolored = newGrid[row]
      .map((square, col) => ({ square, col }))
      .filter(({ square }) => !square.groupColor);

    // 2. If none, log and continue
    if (uncolored.length === 0) {
      logs.push(`Row ${row} is already full`);
      continue;
    }

    // 3. Pick one at random
    const { col } = uncolored[Math.floor(Math.random() * uncolored.length)];

    // 4. Gather neighbor colors
    const neighborColors: string[] = [];
    for (const [dr, dc] of dirs) {
      const r = row + dr,
        c = col + dc;
      if (isValidPosition(newGrid, r, c)) {
        const color = newGrid[r][c].groupColor;
        if (color) neighborColors.push(color);
      }
    }

    // Count occurrences of each color
    const counts: Record<string, number> = {};
    neighborColors.forEach((c) => (counts[c] = (counts[c] || 0) + 1));

    // 5. Exclude any color with count ≥ 2
    const validColors = Object.keys(counts).filter((c) => counts[c] < 2);

    if (validColors.length === 0) {
      // 6. Nothing valid → skip
      logs.push(`Skipping row ${row}: no valid neighbor colors`);
      continue;
    }

    // 7. Assign a random valid color
    const chosen = validColors[Math.floor(Math.random() * validColors.length)];
    newGrid[row][col].groupColor = chosen;
    logs.push(`Row ${row}, col ${col}: colored "${chosen}"`);
  }

  return newGrid;
}
