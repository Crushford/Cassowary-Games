<template>
  <div class="min-h-screen bg-background p-4">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-text mb-6">Level Builder</h1>

      <div class="mb-6">
        <label class="block text-sm font-medium text-text mb-2">
          Grid Size (squares per row/column)
        </label>
        <div class="flex items-center gap-4">
          <input
            type="number"
            v-model="gridSize"
            min="4"
            max="8"
            class="w-32 rounded-lg border border-surface bg-surface px-3 py-2 text-text"
          />
          <span class="text-text">× {{ gridSize }}</span>
        </div>
      </div>

      <GameGrid
        :grid="puzzleState.grid"
        :grid-size="gridSize"
        @square-click="handleSquareClick"
        @undo="handleUndo"
        @restart="handleRestart"
      />

      <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
        {{ errorMessage }}
      </div>

      <div class="mt-6 flex justify-center gap-4">
        <button
          class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          @click="handleSave"
        >
          Save Level
        </button>
        <button
          class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
          @click="handleTest"
        >
          Test Level
        </button>
        <button
          class="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover"
          @click="handlePlaceNextQueen"
        >
          Place Next Queen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import type { GridSquare } from '../components/GameGrid.vue';
import {
  type PuzzleState,
  initializePuzzleState,
  placeNextQueen,
  updateAttackedPositions,
  wouldBlockLastPosition,
} from '../utils/puzzleLogic';

const gridSize = ref(6);
const puzzleState = ref<PuzzleState>(initializePuzzleState(gridSize.value));
const moveHistory = ref<
  {
    index: number;
    state: GridSquare['state'];
    affectedSquares?: { index: number; state: GridSquare['state'] }[];
  }[]
>([]);
const errorMessage = ref<string | null>(null);

// Initialize grid
const initializeGrid = () => {
  puzzleState.value = initializePuzzleState(gridSize.value);
  moveHistory.value = [];
  errorMessage.value = null;
};

// Watch for grid size changes
watch(gridSize, () => {
  initializeGrid();
});

// Handle square click
const handleSquareClick = (index: number) => {
  const currentState = puzzleState.value.grid[index].state;
  let newState: GridSquare['state'] = 'empty';

  if (currentState === 'empty') {
    newState = 'flag';
  } else if (currentState === 'flag') {
    // Check if placing a queen here would block the last available position
    if (wouldBlockLastPosition(index, puzzleState.value)) {
      errorMessage.value =
        'Cannot place queen here as it would block the last available position in a row or column';
      return;
    }
    newState = 'queen';
    // When placing a queen, add it to the queens array and update attacked positions
    puzzleState.value.queens.push(index);
  }

  errorMessage.value = null;
  moveHistory.value.push({ index, state: currentState });
  puzzleState.value.grid[index].state = newState;

  // Update attacked positions after placing a queen
  if (newState === 'queen') {
    const oldState = { ...puzzleState.value };
    puzzleState.value = updateAttackedPositions(puzzleState.value);

    // Record all squares that were changed to flags
    const affectedSquares = puzzleState.value.grid
      .map((square, i) => ({
        index: i,
        state: square.state,
      }))
      .filter((square, i) => square.state === 'flag' && oldState.grid[i].state === 'empty');

    // Add the affected squares to the last move in history
    moveHistory.value[moveHistory.value.length - 1].affectedSquares = affectedSquares;
  }
};

// Handle undo
const handleUndo = () => {
  if (moveHistory.value.length > 0) {
    const lastMove = moveHistory.value.pop();
    if (lastMove) {
      const index = lastMove.index;
      puzzleState.value.grid[index].state = lastMove.state;

      // If we're removing a queen, remove it from the queens array
      if (lastMove.state === 'queen') {
        puzzleState.value.queens = puzzleState.value.queens.filter((q) => q !== index);

        // Restore all squares that were changed to flags
        if (lastMove.affectedSquares) {
          lastMove.affectedSquares.forEach((square) => {
            puzzleState.value.grid[square.index].state = 'empty';
          });
        }
      }
    }
  }
  errorMessage.value = null;
};

// Handle restart
const handleRestart = () => {
  initializeGrid();
};

// Handle place next queen
const handlePlaceNextQueen = () => {
  const result = placeNextQueen(puzzleState.value);
  if (result.success && result.state) {
    // Find the index where the queen was placed by comparing the queens arrays
    const newQueenIndex = result.state.queens.find((q) => !puzzleState.value.queens.includes(q));

    if (newQueenIndex !== undefined) {
      // Store the old state before updating
      const oldState = { ...puzzleState.value };

      // Add the move to history before updating the state
      moveHistory.value.push({
        index: newQueenIndex,
        state: 'empty',
      });

      // Update the state
      puzzleState.value = result.state;

      // Record all squares that were changed to flags
      const affectedSquares = puzzleState.value.grid
        .map((square, i) => ({
          index: i,
          state: square.state,
        }))
        .filter((square, i) => square.state === 'flag' && oldState.grid[i].state === 'empty');

      // Add the affected squares to the last move in history
      moveHistory.value[moveHistory.value.length - 1].affectedSquares = affectedSquares;
    }

    errorMessage.value = null;
  } else {
    errorMessage.value = result.error || 'Failed to place next queen';
  }
};

// Handle save
const handleSave = () => {
  // TODO: Implement save functionality
  console.log('Saving level:', puzzleState.value);
};

// Handle test
const handleTest = () => {
  // TODO: Implement test functionality
  console.log('Testing level:', puzzleState.value);
};

// Initialize grid when component is mounted
initializeGrid();
</script>
