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

      <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
        {{ errorMessage }}
      </div>

      <div class="mt-6 flex justify-center gap-4">
        <button
          class="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover"
          @click="handlePlaceRandomQueen"
        >
          Place Next Queen
        </button>
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
const errorMessage = ref<string | null>(null);

// Handle grid size changes
const handleGridSizeChange = () => {
  gameStore.setGridSize(gridSize.value);
};

// Handle undo
const handleUndo = () => {
  gameStore.handleUndo();
  errorMessage.value = null;
};

// Handle restart
const handleRestart = () => {
  gameStore.handleRestart();
  errorMessage.value = null;
};

// Handle place random queen
const handlePlaceRandomQueen = () => {
  const success = gameStore.placeRandomQueen();
  if (!success) {
    errorMessage.value = 'No valid moves available';
  }
  errorMessage.value = null;
};
</script>
