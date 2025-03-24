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
const stateHistory = ref<PuzzleState[]>([]);
const errorMessage = ref<string | null>(null);

// Initialize grid
const initializeGrid = () => {
  puzzleState.value = initializePuzzleState(gridSize.value);
  stateHistory.value = [];
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
  }

  errorMessage.value = null;

  // Store current state in history before making any changes
  stateHistory.value.push({ ...puzzleState.value });

  // Update the clicked square
  puzzleState.value.grid[index].state = newState;

  // If placing a queen, update the queens array and attacked positions
  if (newState === 'queen') {
    puzzleState.value.queens.push(index);
    puzzleState.value = updateAttackedPositions(puzzleState.value);
  }
};

// Handle undo
const handleUndo = () => {
  if (stateHistory.value.length > 0) {
    // Restore the previous state
    puzzleState.value = stateHistory.value.pop()!;
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
    // Store current state in history before updating
    stateHistory.value.push({ ...puzzleState.value });

    // Update to the new state
    puzzleState.value = result.state;
    errorMessage.value = null;
  } else {
    errorMessage.value = result.error || 'Failed to place next queen';
  }
};

// Initialize grid when component is mounted
initializeGrid();
</script>
