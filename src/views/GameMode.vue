<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900">
    <div class="w-full max-w-4xl mx-auto p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold text-gray-100">
          {{ gameStore.currentPuzzle ? gameStore.currentPuzzle : `Level ${currentLevel}` }}
        </h1>
        <div class="flex gap-2">
          <button
            v-if="gameStore.currentPuzzle"
            class="rounded-lg bg-purple-900 px-4 py-2 text-white hover:bg-purple-700"
            @click="backToLevelSelect"
          >
            Back to Puzzles
          </button>
        </div>
      </div>

      <!-- Saved Puzzles List -->
      <div v-if="showPuzzleSelect" class="mb-6">
        <h2 class="text-xl font-semibold mb-2 text-gray-100">Select a Saved Puzzle</h2>

        <div
          v-if="!gameStore.savedPuzzles.length"
          class="p-4 bg-gray-800 rounded-lg text-center text-gray-300"
        >
          No puzzles saved yet. Create puzzles in the Level Builder.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="puzzle in gameStore.savedPuzzles"
            :key="puzzle.name"
            class="p-4 bg-gray-800 rounded-lg shadow hover:shadow-lg cursor-pointer border border-gray-700 transition-all duration-200"
            @click="loadPuzzle(puzzle.name)"
          >
            <div class="font-bold text-gray-100">{{ puzzle.name }}</div>
            <div class="text-sm text-gray-400">{{ puzzle.gridSize }}x{{ puzzle.gridSize }}</div>
            <button
              class="mt-2 text-xs text-red-400 hover:text-red-300"
              @click.stop="deletePuzzle(puzzle.name)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <GameGrid v-else @undo="handleUndo" @restart="clearQueensAndFlags" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import GameGrid from '../components/GameGrid.vue';
import { storeToRefs } from 'pinia';
import { ref, onMounted } from 'vue';

const gameStore = useGameStore();
const { currentLevel, isComplete } = storeToRefs(gameStore);
const showPuzzleSelect = ref(true);

onMounted(() => {
  gameStore.loadPuzzlesFromLocalStorage();
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
