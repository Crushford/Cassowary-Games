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
            @change="handleGridSizeChange"
          />
          <span class="text-text">× {{ gridSize }}</span>
        </div>
      </div>

      <GameGrid
        :grid="gameStore.grid"
        :grid-size="gridSize"
        @undo="handleUndo"
        @restart="handleRestart"
      />

      <div v-if="gameStore.errorMessage" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
        {{ gameStore.errorMessage }}
      </div>

      <div class="mt-6 flex justify-center gap-4 flex-wrap">
        <button
          class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          @click="handlePlaceRandomQueen"
        >
          Place Next Queen
        </button>
        <button
          class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
          @click="handleGenerateSolution"
        >
          Generate Solution
        </button>
      </div>

      <!-- Color Group Controls -->
      <div class="mt-4" v-if="gameStore.isComplete">
        <button
          class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover w-full"
          @click="handleAssignColorGroups"
        >
          Assign Color Groups
        </button>
        <div class="mt-2 text-sm text-center text-text">
          This will assign color groups to ensure a unique solution.
        </div>

        <!-- Save to Local Storage button -->
        <div v-if="hasColorGroups" class="mt-4">
          <button
            class="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-white w-full"
            @click="handleSavePuzzle"
          >
            Save Puzzle to Local Storage
          </button>
          <div
            v-if="savedMessage"
            class="mt-2 p-2 bg-green-100 text-green-700 rounded-lg text-center"
          >
            {{ savedMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const gridSize = ref(gameStore.gridSize);
const savedMessage = ref('');

// Check if grid has color groups assigned
const hasColorGroups = computed(() => {
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].groupColor) {
        return true;
      }
    }
  }
  return false;
});

// Save puzzle to local storage
const handleSavePuzzle = () => {
  const puzzleName = gameStore.savePuzzleToLocalStorage();
  if (puzzleName) {
    savedMessage.value = `Puzzle saved as "${puzzleName}"`;
    setTimeout(() => {
      savedMessage.value = '';
    }, 3000);
  }
};

// Handle grid size changes
const handleGridSizeChange = () => {
  gameStore.setGridSize(gridSize.value);
};

// Handle undo
const handleUndo = () => {
  gameStore.handleUndo();
};

// Handle restart
const handleRestart = () => {
  gameStore.handleRestart();
};

// Handle place random queen
const handlePlaceRandomQueen = () => {
  gameStore.placeRandomQueen();
};

// Handle generate solution
const handleGenerateSolution = () => {
  gameStore.generateFullSolution();
};

// Handle assign color groups
const handleAssignColorGroups = () => {
  gameStore.assignColorGroups();
};
</script>
