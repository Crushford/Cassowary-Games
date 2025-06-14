<template>
  <div class="flex flex-col bg-gray-900">
    <div class="w-full max-w-full mx-auto">
      <!-- Stats Bar -->
      <div class="flex justify-between items-center px-4 py-2 bg-gray-800 text-white">
        <div class="flex items-center space-x-2">
          <span class="text-amber-400">🍯</span>
          <span>{{ gameStore.honeyPots }}</span>
        </div>
        <!-- Health Display -->
        <div class="flex items-center space-x-2">
          <span class="text-red-400">❤️</span>
          <span>{{ gameStore.bites }}/{{ gameStore.maxHealth }}</span>
        </div>
      </div>

      <!-- Level Display -->
      <div class="flex justify-center py-2 bg-gray-800 text-white border-t border-gray-700">
        <div class="flex items-center space-x-2">
          <span class="text-lg font-semibold">Level {{ gameStore.currentLevel }}</span>
        </div>
      </div>

      <!-- Level Complete Animation -->
      <div
        v-if="gameStore.isComplete"
        class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        @click="gameStore.isComplete = false"
      >
        <div
          class="bg-gray-800 p-8 rounded-lg shadow-xl transform transition-all duration-500 scale-100 hover:scale-105"
        >
          <h2 class="text-2xl font-bold text-amber-400 mb-4">
            {{ gameStore.isAlive ? 'Level Complete!' : 'Game Over!' }}
          </h2>
          <p class="text-white mb-2">Honey Pots Collected: {{ gameStore.honeyPots }}</p>
          <p class="text-white mb-4">Ant Bites: {{ gameStore.bites }}/{{ gameStore.maxHealth }}</p>
          <p class="text-gray-400 text-sm">Click anywhere to continue</p>
        </div>
      </div>

      <div class="flex flex-col items-center w-full">
        <div class="w-full aspect-square">
          <PlayGrid />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import PlayGrid from '../components/PlayGrid.vue';
import { onMounted } from 'vue';

const gameStore = useGameStore();

onMounted(() => {
  gameStore.findValidPuzzleWithSteps();
});

defineOptions({
  name: 'GameMode',
});
</script>
