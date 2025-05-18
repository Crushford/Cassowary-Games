<template>
  <aside class="bg-slate-800 p-4 rounded-lg flex flex-col gap-4">
    <h2 class="text-xl font-semibold text-white mb-2">Color Palette Tool</h2>

    <!-- Toggle Button -->
    <button
      @click="gameStore.toggleColorToolActive()"
      :class="[
        'px-4 py-2 rounded font-medium transition',
        gameStore.colorToolActive
          ? 'bg-green-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
      ]"
    >
      {{ gameStore.colorToolActive ? 'Deactivate Tool' : 'Activate Tool' }}
    </button>

    <!-- Color Swatches -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="color in palette"
        :key="color"
        @click="selectColor(color)"
        :class="[
          'w-10 h-10 rounded-full border-2 flex items-center justify-center transition',
          gameStore.colorToolSelectedColor === color
            ? 'ring-4 ring-yellow-400 border-yellow-400'
            : 'border-slate-500',
          isColorUsed(color) ? 'border-4 border-green-500' : '',
        ]"
        :style="{ backgroundColor: color }"
        :aria-label="color"
      >
        <span v-if="isColorUsed(color)" class="text-xs font-bold text-white">✓</span>
      </button>
    </div>

    <!-- Selected Color Display -->
    <div class="mt-2 text-white">
      <span class="font-semibold">Selected Color:</span>
      <span
        v-if="gameStore.colorToolSelectedColor"
        :style="{ color: gameStore.colorToolSelectedColor }"
        >{{ gameStore.colorToolSelectedColor }}</span
      >
      <span v-else class="text-slate-400">None Selected</span>
    </div>

    <!-- Legend (Optional) -->
    <div class="mt-2">
      <h3 class="text-sm font-medium text-slate-300 mb-1">Colors in Use:</h3>
      <div class="flex gap-2">
        <span
          v-for="color in usedColors"
          :key="color"
          class="w-6 h-6 rounded-full border-2 border-green-500"
          :style="{ backgroundColor: color }"
        ></span>
        <span v-if="usedColors.length === 0" class="text-slate-400">None</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

const palette = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  // Add more colors if needed
];

const gameStore = useGameStore();

// Used colors on the board
const usedColors = computed(() => {
  const colors = new Set<string>();
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      const color = gameStore.grid[row][col].groupColor;
      if (color) colors.add(color);
    }
  }
  return Array.from(colors);
});

function isColorUsed(color: string) {
  return usedColors.value.includes(color);
}

function selectColor(color: string) {
  gameStore.setColorToolSelectedColor(color);
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
