<template>
  <div class="flex items-center justify-between w-full">
    <!-- Left side: Puzzle info -->
    <div class="flex items-center space-x-4">
      <div class="text-sm">
        <div class="font-semibold text-lg">Queens</div>
        <div class="text-gray-400">{{ queensStore.gridSize }}x{{ queensStore.gridSize }}</div>
      </div>
    </div>

    <!-- Right side: Stats -->
    <div class="flex items-center space-x-4">
      <!-- Queens found -->
      <div class="flex items-center space-x-2">
        <span class="text-lg">👑</span>
        <span class="text-sm font-semibold"
          >{{ queensStore.queenPositions.length }}/{{ queensStore.gridSize }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQueensStore } from '../../stores/queensStore';

const queensStore = useQueensStore();

defineOptions({
  name: 'QueensHeader',
});
</script>
