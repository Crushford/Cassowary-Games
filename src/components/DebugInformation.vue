<template>
  <div class="bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg">
    <!-- Game State Section (Always expanded) -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-gray-100">Game State</h3>
      </div>

      <div class="bg-gray-900 p-3 rounded text-gray-200">
        <pre class="text-xs font-mono whitespace-pre overflow-x-auto">{{ formattedGameState }}</pre>
      </div>
    </div>

    <!-- Color Groups Section -->
    <div class="mb-4">
      <button
        @click="isColorGroupsExpanded = !isColorGroupsExpanded"
        class="flex items-center justify-between w-full text-left font-semibold mb-2 text-gray-100"
      >
        <span>Color Groups</span>
        <span class="text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform duration-200"
            :class="isColorGroupsExpanded ? 'rotate-180' : ''"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </button>

      <div v-show="isColorGroupsExpanded" class="bg-gray-900 p-3 rounded text-gray-200">
        <div class="grid grid-cols-2 gap-2">
          <div v-for="(count, color) in colorCounts" :key="color" class="flex items-center">
            <div
              class="w-4 h-4 mr-2 rounded"
              :style="{ backgroundColor: getColorHex(color) }"
            ></div>
            <span class="text-sm">
              {{ color }}: {{ count }} squares
              <span :class="colorConnected[color] ? 'text-green-500' : 'text-red-500'">
                {{ colorConnected[color] ? '✓' : '✗' }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Move History Section -->
    <div class="mb-4">
      <button
        @click="isMoveHistoryExpanded = !isMoveHistoryExpanded"
        class="flex items-center justify-between w-full text-left font-semibold mb-2 text-gray-100"
      >
        <span>Last 3 Moves</span>
        <span class="text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform duration-200"
            :class="isMoveHistoryExpanded ? 'rotate-180' : ''"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </button>

      <div v-show="isMoveHistoryExpanded" class="space-y-4">
        <div v-if="lastThreeMoves.length === 0" class="text-gray-400 text-sm p-2">
          No moves yet.
        </div>
        <div
          v-else
          v-for="(move, index) in lastThreeMoves"
          :key="index"
          class="bg-gray-900 p-3 rounded"
        >
          <div class="text-sm text-gray-300 mb-1">
            Move {{ gameStore.moveHistory.length - index }}
          </div>
          <div class="text-xs text-gray-400">Queens: {{ countQueens(move.grid) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import type { GridSquare } from '../types/grid';

const gameStore = useGameStore();

// Collapsible sections state
const isColorGroupsExpanded = ref(true);
const isMoveHistoryExpanded = ref(false);

// Get the text representation of the game state
const formattedGameState = computed(() => {
  return gameStore.exportGameState();
});

// Get last three moves from history
const lastThreeMoves = computed(() => {
  return gameStore.moveHistory.slice(-3).reverse();
});

// Helper to count queens in a grid
const countQueens = (grid: GridSquare[][]) => {
  let count = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col].state === 'queen') {
        count++;
      }
    }
  }
  return count;
};

// Compute color counts
const colorCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (let row = 0; row < gameStore.grid.length; row++) {
    for (let col = 0; col < gameStore.grid[row].length; col++) {
      const color = gameStore.grid[row][col].groupColor;
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

// Helper to get color hexcode
const getColorHex = (color: string): string => {
  const colorMap: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#f59e0b',
    purple: '#8b5cf6',
    pink: '#ec4899',
  };

  return colorMap[color] || '#888888';
};
</script>
