import type { GridSquare, Pos } from '../types/types';

// Helper function to check if a position is valid within the grid
function isInGridBounds(grid: GridSquare[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

// Helper to ensure no color block has a singleton square
export function ensureNoSingletonColorBlocks(grid: GridSquare[][]): GridSquare[][] {
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  const colorGroups: Record<string, Pos[]> = {};
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
      const neighborColors = new Set<string>();
      for (const dir of directions) {
        const newR = row + dir.dr;
        const newC = col + dir.dc;
        if (
          isInGridBounds(newGrid, newR, newC) &&
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
export function addOneToEachColorGroup(grid: GridSquare[][]): GridSquare[][] {
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

      if (isInGridBounds(newGrid, r, c)) {
        const neighbor = newGrid[r][c];
        if (!neighbor.groupColor) {
          neighbor.groupColor = base.square.groupColor;
          break; // only one added per group
        }
      }
    }
  }

  return newGrid;
}

// Function to add color to a specific row or all rows if no row is specified
export function addColorToEachRow(
  grid: GridSquare[][],
  logFn?: ((message: string) => void) | null,
  targetRow?: number
): GridSquare[][] {
  // Create a safe logging function that does nothing if none provided
  const log = logFn || (() => {});

  // Create a deep copy of the grid to avoid mutating the original
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  // If a specific targetRow is provided, only process that row
  const startRow = targetRow !== undefined ? targetRow : 0;
  const endRow = targetRow !== undefined ? targetRow + 1 : gridSize;

  for (let row = startRow; row < endRow; row++) {
    // 1. Collect un-colored squares in this row
    const uncolored = newGrid[row]
      .map((square, col) => ({ square, col }))
      .filter(({ square }) => !square.groupColor);

    // 2. If none, log and continue
    if (uncolored.length === 0) {
      log(`Row ${row} is already full`);
      continue;
    }

    // 3. Pick one at random
    const { col } = uncolored[Math.floor(Math.random() * uncolored.length)];

    // 4. Gather neighbor colors
    const neighborColors: string[] = [];
    for (const [dr, dc] of dirs) {
      const r = row + dr,
        c = col + dc;
      if (isInGridBounds(newGrid, r, c)) {
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
      log(`Skipping row ${row}: no valid neighbor colors`);
      continue;
    }

    // 7. Assign a random valid color
    const chosen = validColors[Math.floor(Math.random() * validColors.length)];
    newGrid[row][col].groupColor = chosen;
    log(`Row ${row}, col ${col}: colored "${chosen}"`);
  }

  return newGrid;
}

// Function to fill remaining uncolored squares with neighboring colors
export function fillRemainingSquares(
  grid: GridSquare[][],
  logFn?: ((message: string) => void) | null
): GridSquare[][] {
  // Create a safe logging function that does nothing if none provided
  const log = logFn || (() => {});
  log('Filling remaining uncolored squares');

  // Create a deep copy of the grid
  const newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;

  // First, check if there are any uncolored squares
  let uncoloredSquares = 0;
  let uncoloredPositions: Pos[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (!newGrid[row][col].groupColor) {
        uncoloredSquares++;
        uncoloredPositions.push({ row, col });
      }
    }
  }

  if (uncoloredSquares === 0) {
    log('No uncolored squares found - all squares already have colors');
    return newGrid;
  }

  log(`Found ${uncoloredSquares} uncolored squares to process`);

  // Show the first few uncolored positions for debugging
  const samplesToShow = Math.min(5, uncoloredPositions.length);
  if (samplesToShow > 0) {
    log(`Sample uncolored positions:`);
    for (let i = 0; i < samplesToShow; i++) {
      const { row, col } = uncoloredPositions[i];
      log(`  - Position (${row}, ${col}): no groupColor`);
    }
  }

  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 }, // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 }, // right
  ];

  let filledCount = 0;
  let skippedCount = 0;

  // First pass: Try to fill squares with neighbor colors
  log('Pass 1: Filling squares with neighbor colors');
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Skip if already colored
      if (newGrid[row][col].groupColor) continue;

      // Check all adjacent squares for a color
      const neighborColors: string[] = [];
      const neighbors: { row: number; col: number; color: string }[] = [];

      for (const { dr, dc } of directions) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (isInGridBounds(newGrid, newRow, newCol) && newGrid[newRow][newCol].groupColor) {
          neighborColors.push(newGrid[newRow][newCol].groupColor!);
          neighbors.push({ row: newRow, col: newCol, color: newGrid[newRow][newCol].groupColor! });
        }
      }

      // If we found any neighboring colors, assign one to this square
      if (neighborColors.length > 0) {
        // Pick a random neighbor color
        const randomColor = neighborColors[Math.floor(Math.random() * neighborColors.length)];
        newGrid[row][col].groupColor = randomColor;
        filledCount++;

        if (filledCount <= 5) {
          log(`Filled square at (${row}, ${col}) with color ${randomColor} from neighbors`);
        }
      } else {
        skippedCount++;
      }
    }
  }

  // Second pass: For any remaining uncolored squares, look at extended neighbors (2 squares away)
  if (skippedCount > 0) {
    log(`Pass 2: Checking extended neighbors for ${skippedCount} remaining squares`);
    let extendedFilledCount = 0;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Skip if already colored
        if (newGrid[row][col].groupColor) continue;

        // Check extended neighbors (up to 2 squares away)
        const extendedColors: string[] = [];

        // Check in all 8 directions with distance 1 and 2
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            // Skip the current square
            if (dr === 0 && dc === 0) continue;

            const newRow = row + dr;
            const newCol = col + dc;

            if (isInGridBounds(newGrid, newRow, newCol) && newGrid[newRow][newCol].groupColor) {
              extendedColors.push(newGrid[newRow][newCol].groupColor!);
            }
          }
        }

        if (extendedColors.length > 0) {
          // Pick a random extended neighbor color
          const randomColor = extendedColors[Math.floor(Math.random() * extendedColors.length)];
          newGrid[row][col].groupColor = randomColor;
          extendedFilledCount++;

          if (extendedFilledCount <= 5) {
            log(
              `Filled square at (${row}, ${col}) with color ${randomColor} from extended neighbors`
            );
          }
        }
      }
    }

    skippedCount -= extendedFilledCount;
    filledCount += extendedFilledCount;
    log(`Filled ${extendedFilledCount} squares from extended neighbors`);
  }

  // Third pass: Assign colors from the palette for any truly isolated squares
  if (skippedCount > 0) {
    log(`Pass 3: Using color palette for ${skippedCount} isolated squares`);
    const standardPalette = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
    let paletteFilledCount = 0;

    // First, find existing colors in the grid to prioritize those
    const existingColors = new Set<string>();
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const color = newGrid[row][col].groupColor;
        if (color) {
          existingColors.add(color);
        }
      }
    }

    // Convert to array for random selection
    const priorityColors = Array.from(existingColors);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!newGrid[row][col].groupColor) {
          // First try to use existing colors in the grid
          let chosenColor: string;
          if (priorityColors.length > 0) {
            chosenColor = priorityColors[Math.floor(Math.random() * priorityColors.length)];
          } else {
            // Fall back to standard palette if needed
            chosenColor = standardPalette[Math.floor(Math.random() * standardPalette.length)];
          }

          newGrid[row][col].groupColor = chosenColor;
          paletteFilledCount++;

          if (paletteFilledCount <= 5) {
            log(`Assigned color ${chosenColor} to isolated square at (${row}, ${col})`);
          }
        }
      }
    }

    log(`Assigned colors to ${paletteFilledCount} isolated squares`);
    filledCount += paletteFilledCount;
    skippedCount = 0; // Should be 0 now since we've colored everything
  }

  // Final verification
  let remainingUncolored = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (!newGrid[row][col].groupColor) {
        remainingUncolored++;
      }
    }
  }

  if (remainingUncolored > 0) {
    log(`⚠️ WARNING: Still found ${remainingUncolored} uncolored squares after all passes!`);
    log('Forcing colors on ALL remaining squares with emergency fallback...');

    // Emergency fallback - brute force coloring of any remaining squares
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!newGrid[row][col].groupColor) {
          const emergencyColor = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'][
            Math.floor(Math.random() * 6)
          ];
          newGrid[row][col].groupColor = emergencyColor;
          log(`EMERGENCY: Forced color ${emergencyColor} on square at (${row}, ${col})`);
        }
      }
    }
  } else {
    log(`✅ Successfully filled all ${filledCount} uncolored squares`);
  }

  return newGrid;
}

// Main function to assign colors to the grid
export function assignColors(
  grid: GridSquare[][],
  queenPositions: Pos[],
  logFn?: ((message: string) => void) | null
): GridSquare[][] {
  // Create a safe logging function that does nothing if none provided
  const log = logFn || (() => {});

  // Create a deep copy of the grid
  let newGrid = grid.map((row) => row.map((square) => ({ ...square })));
  const gridSize = newGrid.length;
  const totalSquares = gridSize * gridSize;

  // 1. Reset all colors
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      newGrid[r][c].groupColor = undefined;
    }
  }
  log(
    `Starting color assignment process for ${gridSize}x${gridSize} grid (${totalSquares} total squares)`
  );

  // 2. Color queens
  const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
  if (queenPositions.length > palette.length) {
    log(`Not enough colors for ${queenPositions.length} queens`);
    return newGrid;
  }

  queenPositions.forEach(({ row, col }) => {
    newGrid[row][col].groupColor = palette.pop();
  });

  // Log progress after coloring queens
  let coloredCount = countColoredSquares(newGrid);
  log(
    `Step 2: Colored ${queenPositions.length} queens (${coloredCount}/${totalSquares} squares colored)`
  );

  // 3. Add one color to each group once
  log('Step 3: Adding one color to each group');
  newGrid = addOneToEachColorGroup(newGrid);

  // Log progress after adding one to each group
  let prevColored = coloredCount;
  coloredCount = countColoredSquares(newGrid);
  log(
    `Step 3: Added ${coloredCount - prevColored} squares (${coloredCount}/${totalSquares} squares colored)`
  );

  // 4. Keep adding colors to each row until no uncolored squares remain
  log('Step 4: Filling rows with colors');
  let allColored = false;
  let iterations = 0;
  const maxIterations = gridSize * gridSize; // Safety limit to prevent infinite loops

  while (!allColored && iterations < maxIterations) {
    allColored = true; // Assume all are colored until we find an uncolored square
    let rowsFilled = 0;

    // Add one color to each row that has uncolored squares
    for (let row = 0; row < gridSize; row++) {
      // Check if the row has any uncolored squares
      const hasUncoloredSquares = newGrid[row].some((square) => !square.groupColor);

      if (hasUncoloredSquares) {
        allColored = false; // We found an uncolored square, so not all are colored
        newGrid = addColorToEachRow(newGrid, log, row); // Only process this specific row
        rowsFilled++;
      }
    }

    iterations++;
    if (rowsFilled === 0) break; // No more rows to fill
  }

  if (iterations >= maxIterations) {
    log(`Warning: Reached max iterations (${maxIterations}) while coloring the grid`);
  } else {
    log(`Step 4: Completed row filling in ${iterations} iterations`);
  }

  // Log progress after row filling
  prevColored = coloredCount;
  coloredCount = countColoredSquares(newGrid);
  log(
    `Step 4: Added ${coloredCount - prevColored} squares (${coloredCount}/${totalSquares} squares colored)`
  );

  // 5. Fill any remaining uncolored squares, with retries if needed
  log('Step 5: Checking for any remaining uncolored squares...');

  // Count remaining uncolored squares
  let uncoloredCount = totalSquares - coloredCount;
  let retries = 0;
  const maxRetries = 5;

  // Keep trying to fill remaining squares until all are colored or we hit max retries
  while (uncoloredCount > 0 && retries < maxRetries) {
    log(`Remaining uncolored: ${uncoloredCount}/${totalSquares} squares`);
    log(`Retry #${retries + 1}: Filling remaining uncolored squares...`);

    newGrid = fillRemainingSquares(newGrid, log);

    // Recalculate uncolored count
    prevColored = coloredCount;
    coloredCount = countColoredSquares(newGrid);
    uncoloredCount = totalSquares - coloredCount;

    log(
      `Retry #${retries + 1}: Added ${coloredCount - prevColored} squares (${coloredCount}/${totalSquares} squares colored)`
    );
    log(`Retry #${retries + 1}: ${uncoloredCount} squares still remain uncolored`);

    retries++;
    if (uncoloredCount === 0) {
      log(`✅ Successfully colored all squares after ${retries} retries!`);
      break;
    }
  }

  if (uncoloredCount > 0) {
    log(
      `⚠️ Warning: After ${maxRetries} retries, ${uncoloredCount} squares still remain uncolored.`
    );

    // Last resort: Assign random colors to any remaining uncolored squares
    log('Using last resort method: assigning random colors to remaining squares');

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!newGrid[row][col].groupColor) {
          const randomColor =
            palette.length > 0
              ? palette[Math.floor(Math.random() * palette.length)]
              : ['red', 'blue', 'green', 'yellow', 'purple', 'pink'][Math.floor(Math.random() * 6)];

          newGrid[row][col].groupColor = randomColor;
          log(`Assigned random color ${randomColor} to square at (${row}, ${col})`);
        }
      }
    }

    // Final count
    coloredCount = countColoredSquares(newGrid);
    uncoloredCount = totalSquares - coloredCount;
    log(
      `Final result: ${coloredCount}/${totalSquares} squares colored, ${uncoloredCount} uncolored`
    );
  }

  return newGrid;
}

// Helper function to count colored squares in a grid
function countColoredSquares(grid: GridSquare[][]): number {
  let count = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].groupColor) {
        count++;
      }
    }
  }
  return count;
}
