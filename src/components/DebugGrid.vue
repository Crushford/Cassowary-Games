<template>
  <div class="p-4 bg-surface rounded-lg">
    <h2 class="text-lg font-bold mb-2 text-text">Debug Information</h2>

    <!-- Visual Grid -->
    <div
      class="grid gap-1 max-w-[200px] mx-auto mb-4"
      :style="{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }"
    >
      <template v-for="(row, rowIndex) in grid" :key="rowIndex">
        <div
          v-for="(square, colIndex) in row"
          :key="`${rowIndex}-${colIndex}`"
          class="aspect-square w-full rounded border border-surface flex items-center justify-center text-xs relative"
          :class="{
            'bg-primary': square.playerMark === 'queen' && !square.groupColor,
            'bg-secondary': square.playerMark === 'flag',
            'bg-surface': square.playerMark === 'empty' && !square.groupColor,
            [`bg-group-${square.groupColor}-900`]:
              square.playerMark === 'queen' && square.groupColor,
            [`bg-group-${square.groupColor}-700`]:
              square.playerMark !== 'queen' && square.groupColor,
          }"
        >
          <span
            v-if="square.playerMark === 'queen'"
            class="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center"
            >👑</span
          >
          <span
            v-else-if="square.playerMark === 'flag'"
            class="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center"
            >🚩</span
          >
          <span class="absolute bottom-0 right-1 text-[8px]">{{ rowIndex }},{{ colIndex }}</span>
        </div>
      </template>
    </div>

    <!-- Text-based Game State -->
    <div class="mt-4">
      <h3 class="text-md font-bold mb-2 text-text">Game State</h3>
      <pre class="whitespace-pre-wrap bg-background p-2 rounded text-xs font-mono text-text">{{
        gameState
      }}</pre>
    </div>

    <!-- Color Group Stats -->
    <div class="mt-4">
      <h3 class="text-md font-bold mb-2 text-text">Color Groups</h3>
      <div class="grid grid-cols-2 gap-2">
        <div v-for="(count, color) in colorCounts" :key="color" class="flex items-center">
          <div class="w-4 h-4 mr-2 rounded" :class="`bg-group-${color}-700`"></div>
          <span class="text-sm text-text">
            {{ color }}: {{ count }} squares
            <span :class="colorConnected[color] ? 'text-green-500' : 'text-red-500'">
              {{ colorConnected[color] ? '✓' : '✗' }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GridSquare, DebugGridProps } from '../types/types';
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

const props = defineProps<DebugGridProps>();
const gameStore = useGameStore();

// Get the text representation of the game state
const gameState = computed(() => {
  return gameStore.exportGameState();
});

// Compute color counts and connections
const colorCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (let row = 0; row < props.grid.length; row++) {
    for (let col = 0; col < props.grid[row].length; col++) {
      const color = props.grid[row][col].groupColor;
      if (color) {
        counts[color] = (counts[color] || 0) + 1;
      }
    }
  }
  return counts;
});

// Check if each color forms a connected region
const colorConnected = computed(() => {
  const connected: Record<string, boolean> = {};
  Object.keys(colorCounts.value).forEach((color) => {
    connected[color] = gameStore.isColorConnected(color);
  });
  return connected;
});
</script>
