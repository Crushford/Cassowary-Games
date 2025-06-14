<template>
  <div class="flex flex-col bg-gray-900">
    <div class="w-full max-w-full mx-auto">
      <!-- Stats Bar -->
      <div class="flex justify-between items-center px-4 py-2 bg-gray-800 text-white">
        <div class="flex items-center space-x-2">
          <span class="text-amber-400">🍯</span>
          <span>{{ gameStore.honeyPots }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-gray-400">🐜</span>
          <span>{{ gameStore.bites }}</span>
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
