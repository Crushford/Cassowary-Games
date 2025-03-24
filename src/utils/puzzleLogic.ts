import type { GridSquare } from '../components/GameGrid.vue';

export interface PuzzleState {
  grid: GridSquare[];
  queens: number[];
  gridSize: number;
}

export interface PuzzleUpdateResult {
  success: boolean;
  state?: PuzzleState;
  error?: string;
}

export function getAttackedSquares(index: number, gridSize: number): number[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const attackedSquares: number[] = [];

  // Add all squares in the same row
  for (let c = 0; c < gridSize; c++) {
    if (c !== col) {
      attackedSquares.push(row * gridSize + c);
    }
  }

  // Add all squares in the same column
  for (let r = 0; r < gridSize; r++) {
    if (r !== row) {
      attackedSquares.push(r * gridSize + col);
    }
  }

  // Add all squares in the diagonals
  // Diagonal going up-right
  for (let r = row - 1, c = col + 1; r >= 0 && c < gridSize; r--, c++) {
    attackedSquares.push(r * gridSize + c);
  }
  // Diagonal going down-right
  for (let r = row + 1, c = col + 1; r < gridSize && c < gridSize; r++, c++) {
    attackedSquares.push(r * gridSize + c);
  }
  // Diagonal going down-left
  for (let r = row + 1, c = col - 1; r < gridSize && c >= 0; r++, c--) {
    attackedSquares.push(r * gridSize + c);
  }
  // Diagonal going up-left
  for (let r = row - 1, c = col - 1; r >= 0 && c >= 0; r--, c--) {
    attackedSquares.push(r * gridSize + c);
  }

  return attackedSquares;
}

export function isUnderAttack(index: number, state: PuzzleState): boolean {
  for (const queenIndex of state.queens) {
    const attackedSquares = getAttackedSquares(queenIndex, state.gridSize);
    if (attackedSquares.includes(index)) {
      return true;
    }
  }
  return false;
}

export function updateAttackedPositions(state: PuzzleState): PuzzleState {
  const newState = {
    ...state,
    grid: [...state.grid],
  };

  // Reset all flags
  for (let i = 0; i < newState.grid.length; i++) {
    if (newState.grid[i].state === 'flag') {
      newState.grid[i] = { state: 'empty' };
    }
  }

  // Mark all attacked positions
  for (let i = 0; i < newState.grid.length; i++) {
    if (newState.grid[i].state === 'empty' && isUnderAttack(i, newState)) {
      newState.grid[i] = { state: 'flag' };
    }
  }

  return newState;
}

export function placeNextQueen(state: PuzzleState): PuzzleUpdateResult {
  if (state.queens.length === 0) {
    // Place first queen randomly
    const randomIndex = Math.floor(Math.random() * (state.gridSize * state.gridSize));
    const newState = {
      ...state,
      queens: [...state.queens, randomIndex],
      grid: [...state.grid],
    };
    newState.grid[randomIndex] = { state: 'queen' };
    return { success: true, state: updateAttackedPositions(newState) };
  }

  // Try to find a valid position for the next queen
  let bestPosition = -1;
  let maxAttackedSquares = -1;

  // Try each empty position
  for (let i = 0; i < state.grid.length; i++) {
    if (state.grid[i].state === 'empty' && !isUnderAttack(i, state)) {
      // Count how many new squares would be attacked from this position
      const attackedSquares = getAttackedSquares(i, state.gridSize);
      const newAttackedSquares = attackedSquares.filter(
        (move) => state.grid[move].state === 'empty'
      ).length;

      if (newAttackedSquares > maxAttackedSquares) {
        maxAttackedSquares = newAttackedSquares;
        bestPosition = i;
      }
    }
  }

  if (bestPosition === -1) {
    return {
      success: false,
      error: 'No valid positions available for placing the next queen',
    };
  }

  const newState = {
    ...state,
    queens: [...state.queens, bestPosition],
    grid: [...state.grid],
  };
  newState.grid[bestPosition] = { state: 'queen' };
  return { success: true, state: updateAttackedPositions(newState) };
}

export function initializePuzzleState(gridSize: number): PuzzleState {
  return {
    grid: Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({ state: 'empty' })),
    queens: [],
    gridSize,
  };
}
