<template>
  <div class="min-h-screen bg-background p-4">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-text mb-6">Game Mode</h1>

      <div class="mb-6 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="text-text">Level: {{ currentLevel }}</div>
          <div class="text-text">Grid: {{ gameState.gridSize }} × {{ gameState.gridSize }}</div>
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

      <div class="flex gap-6">
        <!-- Game Section -->
        <div class="flex-1">
          <GameGrid
            :grid="gameState.grid"
            :grid-size="gameState.gridSize"
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

        <!-- Debug Panel -->
        <DebugPanel
          :grid="gameState.grid"
          :grid-size="gameState.gridSize"
          :move-history="gameState.moveHistory"
          @make-move="handleSquareClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import DebugPanel from '../components/DebugPanel.vue';
import type { GridSquare } from '../components/GameGrid.vue';

const currentLevel = ref(1);
const gameState = inject('gameState') as {
  grid: GridSquare[];
  gridSize: number;
  moveHistory: { grid: GridSquare[] }[];
};

// Initialize grid
const initializeGrid = () => {
  // TODO: Load level data from storage
  gameState.grid = Array(gameState.gridSize * gameState.gridSize)
    .fill(null)
    .map(() => ({
      state: 'empty',
    }));
  gameState.moveHistory = [];
};

// Watch for grid size changes
watch(
  () => gameState.gridSize,
  () => {
    initializeGrid();
  }
);

// Handle square click
const handleSquareClick = (index: number) => {
  const currentState = gameState.grid[index].state;
  let newState: GridSquare['state'] = 'empty';

  if (currentState === 'empty') {
    newState = 'flag';
  } else if (currentState === 'flag') {
    newState = 'queen';
  }

  // Save current state to history before making changes
  gameState.moveHistory.push({
    grid: JSON.parse(JSON.stringify(gameState.grid)),
  });

  gameState.grid[index].state = newState;
};

// Handle undo
const handleUndo = () => {
  if (gameState.moveHistory.length > 0) {
    const lastState = gameState.moveHistory.pop();
    if (lastState) {
      gameState.grid = lastState.grid;
    }
  }
};

// Handle restart
const handleRestart = () => {
  initializeGrid();
};

// Handle check solution
const handleCheckSolution = () => {
  // TODO: Implement solution checking
  console.log('Checking solution:', gameState.grid);
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

// Handle debug panel moves
const handleDebugMove = (event: CustomEvent) => {
  handleSquareClick(event.detail.index);
};

// Set up event listeners
onMounted(() => {
  window.addEventListener('debug-move', handleDebugMove as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('debug-move', handleDebugMove as EventListener);
});

// Initialize grid when component is mounted
initializeGrid();
</script>
