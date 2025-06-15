<template>
  <div class="flex items-center space-x-2">
    <div class="w-32 h-4 bg-gray-700 rounded-full overflow-hidden">
      <div
        class="h-full bg-red-500 transition-all duration-300 ease-in-out"
        :style="{ width: `${(gameStore.bites / gameStore.maxHealth) * 100}%` }"
      ></div>
    </div>
    <span class="text-red-400 text-sm">{{ gameStore.bites }}/{{ gameStore.maxHealth }}</span>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
</script>

<script lang="ts">
export default {
  name: 'BitesDisplay',
};
</script>
