# Game Store Utilities Integration Guide

This guide provides step-by-step instructions for integrating the utility functions into the main `gameStore.ts` file.

## Prerequisites

Ensure you have this file in your codebase:

- `src/stores/utils.ts`: Contains all utility functions for the game

## Integration Steps

### 1. Update the Imports

First, add the necessary imports at the top of `gameStore.ts`:

```typescript
import { defineStore } from 'pinia';
import type { GridSquare } from '../components/GameGrid.vue';
// Import utility functions
import {
  Pos,
  createEmptyGrid,
  getQueenPositions,
  computeAvailableMoves,
  clearMarkers,
  validatePuzzle as validatePuzzleUtil, // Rename to avoid conflicts
  isValidPosition,
  cloneGrid,
  queenAttacks,
  countEmptyCells,
  countCellsWithState,
  getColorGroupPositions,
  getColorDistribution,
  range,
  shuffle,
  deepClone,
} from './utils';
```

### 2. Change the State Initialization

Replace the manual grid creation with the utility function:

```typescript
state: (): GameState => ({
  grid: createEmptyGrid(6),
  gridSize: 6,
  // other state properties...
});
```

### 3. Update the Getters

Replace the `queenPositions` getter with the utility function:

```typescript
getters: {
  queenPositions: (state): Pos[] => {
    return getQueenPositions(state.grid);
  },
  // other getters...
}
```

Update the `isValidMove` getter to use utility functions:

```typescript
isValidMove: (state) => (row: number, col: number) => {
  // ...existing code...

  // Use isValidPosition utility
  for (const pos of diagonalPositions) {
    if (isValidPosition(state.grid, pos.r, pos.c) && state.grid[pos.r][pos.c].state === 'queen') {
      return false;
    }
  }

  // ...rest of the code...
};
```

### 4. Refactor the Actions

Replace these methods with their utility counterparts:

#### initializeGrid

```typescript
initializeGrid() {
  this.grid = createEmptyGrid(this.gridSize);
  this.moveHistory = [];
  this.isComplete = false;
  this.updateAvailableMoves();
}
```

#### updateAvailableMoves

```typescript
updateAvailableMoves() {
  this.availableMoves = computeAvailableMoves(this.grid, (row, col) => this.isValidMove(row, col));
}
```

#### saveToHistory

```typescript
saveToHistory() {
  this.moveHistory.push({
    grid: cloneGrid(this.grid),
  });
}
```

#### checkCompletion

```typescript
checkCompletion() {
  const { queenCountValid } = validatePuzzleUtil(this.grid, this.gridSize, 2);
  this.isComplete = queenCountValid;
}
```

#### clearQueensAndFlags

```typescript
clearQueensAndFlags() {
  clearMarkers(this.grid);
  this.isComplete = false;
  this.updateAvailableMoves();
}
```

#### Add new utility methods

Add these new methods to simplify validation and counting:

```typescript
countFlags() {
  return countCellsWithState(this.grid, 'flag');
}

countEmptySquares() {
  return countEmptyCells(this.grid);
}

validatePuzzle(requiredQueens: number = 7) {
  return validatePuzzleUtil(this.grid, requiredQueens, 2);
}
```

### 5. Refactor the Solver Steps

The solver steps can be refactored to use the `Pos` type and other utility functions. For example:

#### testStep1PlaceLastFreeQueens

```typescript
testStep1PlaceLastFreeQueens() {
  let didSomething = false;
  let queensPlaced = 0;
  let placed;

  do {
    placed = false;
    // 1. Check color blocks
    const colorGroups = new Map<string, Pos[]>();
    // ...existing logic...

    // Use queenAttacks utility in appropriate places

  } while (placed);

  return didSomething;
}
```

#### testStep2FlagBlockingSquares

```typescript
testStep2FlagBlockingSquares() {
  let flagCount = 0;
  let didSomething = false;

  // Build map of empty squares by color group
  const emptyColorGroups = new Map<string, Pos[]>();

  // ...existing logic...

  // Replace any custom attack checking with the utility function
  if (queenAttacks(row, col, r, c)) {
    // ...
  }

  return didSomething;
}
```

### 6. Refactor Color Distribution Logic

Use the `getColorDistribution` utility to simplify color reporting:

```typescript
logColorDistribution() {
  const { totalColored, totalSquares, colorCounts } = getColorDistribution(this.grid);
  this.testLogs.push(`Colors: ${totalColored}/${totalSquares} cells colored`);

  // Sort colors by frequency
  const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  let colorSummary = sortedColors.map(([color, count]) => `${color}:${count}`).join(', ');
  this.testLogs.push(`Distribution: ${colorSummary}`);
}
```

## Testing the Changes

After making these changes, test the game functionality to ensure everything works as expected:

1. Grid initialization
2. Queen and flag placement
3. Validation logic
4. Puzzle generation and solving

## Troubleshooting

If you encounter TypeScript errors:

- Check that the type names like `Pos` are used consistently
- Ensure arrays are properly typed (e.g., `const emptyCells: Pos[] = []`)

## Next Steps

After successfully integrating these utilities, consider:

1. Writing unit tests for the utility functions
2. Further refactoring complex methods
3. Improving algorithm efficiency
