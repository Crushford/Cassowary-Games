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
        :grid="grid"
        :grid-size="gridSize"
        @square-click="handleSquareClick"
        @undo="handleUndo"
        @restart="handleRestart"
      />

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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import type { GridSquare } from '../components/GameGrid.vue';

const gridSize = ref(6);
const grid = ref<GridSquare[]>([]);
const moveHistory = ref<{ index: number; state: GridSquare['state'] }[]>([]);

// Initialize grid
const initializeGrid = () => {
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

// Handle save
const handleSave = () => {
  // TODO: Implement save functionality
  console.log('Saving level:', grid.value);
};

// Handle test
const handleTest = () => {
  // TODO: Implement test functionality
  console.log('Testing level:', grid.value);
};

// Initialize grid when component is mounted
initializeGrid();
</script>
