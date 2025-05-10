<template>
  <div class="relative flex flex-col items-center">
    <!-- Grid Size Controls -->
    <div class="mb-4 flex gap-2 items-center">
      <input
        v-model="localGridSize"
        type="range"
        min="4"
        max="8"
        step="1"
        class="w-32 accent-blue-500"
        @change="updateGridSize"
      />
      <span class="text-sm font-semibold text-white">{{ localGridSize }}x{{ localGridSize }}</span>
    </div>

    <!-- Game Grid -->
    <div
      class="grid bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg"
      :style="{
        gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
        gap: '2px',
      }"
    >
      <template v-for="(row, rowIndex) in gameStore.grid" :key="rowIndex">
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="w-12 h-12 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
          :class="getCellClasses(cell)"
          @click="handleCellClick(rowIndex, colIndex)"
          @contextmenu.prevent="handleRightClick(rowIndex, colIndex)"
        >
          <span v-if="cell.state === 'queen'" class="text-xl text-white">♛</span>
          <span v-else-if="cell.state === 'flag'" class="text-sm text-yellow-400">🚩</span>
          <span v-else-if="cell.state === 'invalid'" class="text-xl text-red-500">⚠️</span>
          <span v-else class="text-transparent">.</span>
        </div>
      </template>
    </div>

    <!-- Control Buttons -->
    <div class="mt-4 flex gap-4">
      <button
        @click="gameStore.handleUndo()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Undo
      </button>
      <button
        @click="gameStore.clearQueensAndFlags()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Restart
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { COLOR_BG_HOVER_CLASSES, ColorName } from '@/utils/colorPalette';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const localGridSize = ref(gameStore.gridSize);

// Default background/hover class for cells
const defaultBgClass = 'bg-slate-700 hover:bg-slate-600';

// Function to get cell classes
function getCellClasses(cell: { groupColor?: string; state?: string }) {
  // Start with an empty array
  const classes = [];

  // Add background color class
  if (cell.groupColor) {
    try {
      // Try to get the color class - if it fails, we'll use the default
      classes.push(COLOR_BG_HOVER_CLASSES[cell.groupColor as ColorName]);
    } catch (e) {
      classes.push(defaultBgClass);
    }
  } else {
    classes.push(defaultBgClass);
  }

  // Add rings for special states
  if (cell.state === 'queen') {
    classes.push('ring-2 ring-white ring-opacity-70');
  } else if (cell.state === 'invalid') {
    classes.push('ring-2 ring-red-500 ring-opacity-70');
  }

  return classes;
}

// Watch for grid size changes from the store
watch(
  () => gameStore.gridSize,
  (newSize) => {
    localGridSize.value = newSize;
  }
);

// Initialize localGridSize from store on mount
onMounted(() => {
  localGridSize.value = gameStore.gridSize;
});

// Handle cell clicks
function handleCellClick(row: number, col: number) {
  gameStore.placeQueen(row, col);
}

// Handle right-clicks for flags
function handleRightClick(row: number, col: number) {
  gameStore.placeFlag(row, col);
}

// Update grid size
function updateGridSize() {
  gameStore.setGridSize(localGridSize.value);
}
</script>
