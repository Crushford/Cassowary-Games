<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-4xl mx-auto p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Level {{ currentLevel }}</h1>
        <div class="flex gap-2">
          <button
            class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            @click="handlePrevLevel"
            :disabled="currentLevel === 1"
          >
            Previous Level
          </button>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
            @click="handleNextLevel"
            :disabled="!isComplete"
          >
            Next Level
          </button>
        </div>
      </div>
      <GameGrid @undo="handleUndo" @restart="handleRestart" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import GameGrid from '../components/GameGrid.vue';
import { storeToRefs } from 'pinia';

const gameStore = useGameStore();
const { currentLevel, isComplete } = storeToRefs(gameStore);

const handleUndo = () => {
  gameStore.handleUndo();
};

const handleRestart = () => {
  gameStore.handleRestart();
};

const handlePrevLevel = () => {
  gameStore.handlePreviousLevel();
};

const handleNextLevel = () => {
  gameStore.handleNextLevel();
};

defineOptions({
  name: 'GameMode',
});
</script>
