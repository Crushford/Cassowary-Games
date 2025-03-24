<template>
  <div class="min-h-screen bg-background p-4">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-text mb-6">Game Mode</h1>

      <div class="mb-6 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="text-text">Level: {{ currentLevel }}</div>
          <div class="text-text">Grid: {{ gridSize }} × {{ gridSize }}</div>
        </div>
        <div class="flex gap-4">
          <button
            class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            @click="handlePreviousLevel"
          >
            Previous
          </button>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            @click="handleNextLevel"
          >
            Next
          </button>
        </div>
      </div>

      <GameGrid
        :grid="grid"
        :grid-size="gridSize"
        @square-click="handleSquareClick"
        @undo="handleUndo"
        @restart="handleRestart"
      />

      <div class="mt-6 flex justify-center">
        <button
          class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
          @click="handleCheckSolution"
        >
          Check Solution
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import type { GridSquare } from '../components/GameGrid.vue';

const currentLevel = ref(1);
const gridSize = ref(6);
const grid = ref<GridSquare[]>([]);
const moveHistory = ref<{ index: number; state: GridSquare['state'] }[]>([]);

// Initialize grid
const initializeGrid = () => {
  // TODO: Load level data from storage
  grid.value = Array(gridSize.value * gridSize.value)
    .fill(null)
    .map(() => ({
      state: 'empty',
    }));
};

// Watch for grid size changes
watch(gridSize, () => {
  initializeGrid();
  moveHistory.value = [];
});

// Handle square click
const handleSquareClick = (index: number) => {
  const currentState = grid.value[index].state;
  let newState: GridSquare['state'] = 'empty';

  if (currentState === 'empty') {
    newState = 'flag';
  } else if (currentState === 'flag') {
    newState = 'queen';
  }

  moveHistory.value.push({ index, state: currentState });
  grid.value[index].state = newState;
};

// Handle undo
const handleUndo = () => {
  if (moveHistory.value.length > 0) {
    const lastMove = moveHistory.value.pop();
    if (lastMove) {
      grid.value[lastMove.index].state = lastMove.state;
    }
  }
};

// Handle restart
const handleRestart = () => {
  initializeGrid();
  moveHistory.value = [];
};

// Handle check solution
const handleCheckSolution = () => {
  // TODO: Implement solution checking
  console.log('Checking solution:', grid.value);
};

// Handle level navigation
const handlePreviousLevel = () => {
  if (currentLevel.value > 1) {
    currentLevel.value--;
    initializeGrid();
  }
};

const handleNextLevel = () => {
  currentLevel.value++;
  initializeGrid();
};

// Initialize grid when component is mounted
initializeGrid();
</script>
