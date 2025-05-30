<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-4xl mx-auto p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">
          {{ gameStore.currentPuzzle ? gameStore.currentPuzzle : `Level ${currentLevel}` }}
        </h1>
      </div>
      <div class="flex flex-col bg-gray-900">
        <div class="w-full max-w-full mx-auto">
          <!-- Header -->
          <div class="flex flex-col justify-between items-center mb-4 gap-3">
            <h1 class="text-lg font-bold text-gray-100 text-center truncate">
              {{ gameStore.currentPuzzle || `Level ${currentLevel}` }}
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
            <button
              v-if="gameStore.currentPuzzle"
              class="rounded-lg bg-purple-900 px-4 py-2 text-white hover:bg-purple-700 text-sm"
              @click="backToLevelSelect"
            >
              Back to Puzzles
            </button>
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

          <!-- Game Grid -->
          <div v-if="!showPuzzleSelect" class="flex flex-col items-center w-full">
            <div class="w-full aspect-square">
              <PlayGrid />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import PlayGrid from '../components/PlayGrid.vue';

const gameStore = useGameStore();
const currentLevel = computed(() => gameStore.currentLevel);
const isComplete = computed(() => gameStore.isComplete);
const showPuzzleSelect = ref(false);

function handlePrevLevel() {
  gameStore.handlePreviousLevel();
}
function handleNextLevel() {
  gameStore.handleNextLevel();
}
function backToLevelSelect() {
  showPuzzleSelect.value = true;
}
function loadPuzzle(name: string) {
  gameStore.loadPuzzle(name);
  showPuzzleSelect.value = false;
}
function deletePuzzle(name: string) {
  gameStore.deletePuzzle(name);
}
</script>
