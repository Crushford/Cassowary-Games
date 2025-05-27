<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-4xl mx-auto p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">
          {{ gameStore.currentPuzzle ? gameStore.currentPuzzle : `Level ${currentLevel}` }}
        </h1>
        <div class="flex gap-2">
          <button
            v-if="!gameStore.currentPuzzle"
            class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            @click="handlePrevLevel"
            :disabled="currentLevel === 1"
          >
            Previous Level
          </button>
          <button
            v-if="!gameStore.currentPuzzle"
            class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            @click="handleNextLevel"
            :disabled="!isComplete"
          >
            Next Level
          </button>
          <button
            v-if="gameStore.currentPuzzle"
            class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
            @click="backToLevelSelect"
          >
            Back to Puzzles
          </button>
        </div>
      </div>

      <!-- Saved Puzzles List -->
      <div v-if="showPuzzleSelect" class="mb-6">
        <h2 class="text-xl font-semibold mb-2">Select a Saved Puzzle</h2>

        <div v-if="!gameStore.savedPuzzles.length" class="p-4 bg-gray-100 rounded-lg text-center">
          No puzzles saved yet. Create puzzles in the Level Builder.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="puzzle in gameStore.savedPuzzles"
            :key="puzzle.name"
            class="p-4 bg-white rounded-lg shadow hover:shadow-md cursor-pointer border border-gray-200"
            @click="loadPuzzle(puzzle.name)"
          >
            <div class="font-bold">{{ puzzle.name }}</div>
            <div class="text-sm text-gray-600">{{ puzzle.gridSize }}x{{ puzzle.gridSize }}</div>
            <button
              class="mt-2 text-xs text-red-600 hover:text-red-800"
              @click.stop="deletePuzzle(puzzle.name)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <GameGrid v-if="!showPuzzleSelect" @undo="handleUndo" @restart="clearQueensAndFlags" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import GameGrid from '../components/GameGrid.vue';
import { storeToRefs } from 'pinia';
import { ref, onMounted } from 'vue';
import type { StoreGeneric } from 'pinia';

const gameStore = useGameStore();
const { currentLevel, isComplete } = storeToRefs(gameStore as StoreGeneric);
const showPuzzleSelect = ref(false);

onMounted(() => {
  gameStore.loadPuzzlesFromLocalStorage();
  gameStore.initializeGrid();
});

const handleUndo = () => {
  gameStore.handleUndo();
};

const clearQueensAndFlags = () => {
  gameStore.clearQueensAndFlags();
};

const handlePrevLevel = () => {
  gameStore.handlePreviousLevel();
};

const handleNextLevel = () => {
  gameStore.handleNextLevel();
};

const loadPuzzle = (puzzleName: string) => {
  gameStore.loadPuzzle(puzzleName);
  showPuzzleSelect.value = false;
};

const deletePuzzle = (puzzleName: string) => {
  if (confirm(`Are you sure you want to delete "${puzzleName}"?`)) {
    gameStore.deletePuzzle(puzzleName);
  }
};

const backToLevelSelect = () => {
  gameStore.currentPuzzle = null;
  showPuzzleSelect.value = true;
};

defineOptions({
  name: 'GameMode',
});
</script>
