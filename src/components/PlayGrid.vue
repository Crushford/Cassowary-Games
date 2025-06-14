<template>
  <div class="relative flex flex-col items-center">
    <!-- Game Grid -->
    <div
      class="grid bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg"
      :style="{
        gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
      }"
    >
      <template v-for="(row, rowIndex) in gameStore.grid" :key="rowIndex">
        <div v-for="(cell, colIndex) in row" :key="colIndex" class="relative">
          <div
            class="relative w-12 h-12 flex items-center justify-center cursor-pointer"
            :class="getCellClasses(cell)"
            :style="getCellBackgroundStyle(cell)"
            @click="handleCellClick(rowIndex, colIndex)"
            @contextmenu.prevent="handleRightClick(rowIndex, colIndex)"
          >
            <span v-if="shouldShowQueen(rowIndex, colIndex)" class="text-xl text-white">🍯</span>
            <span v-else-if="shouldShowFlag(rowIndex, colIndex)" class="text-sm text-yellow-400"
              >🚧</span
            >
            <div
              v-else-if="shouldShowInvalid(rowIndex, colIndex)"
              class="grid grid-cols-2 gap-1 text-xs leading-none"
            >
              <span>🐜</span>
              <span>🐜</span>
              <span>🐜</span>
              <span>🐜</span>
              <span>🐜</span>
              <span>🐜</span>
            </div>
            <span v-else class="text-transparent">.</span>
          </div>
          <!-- Border overlay -->
          <div
            class="absolute inset-0 pointer-events-none z-10"
            :class="getWrapperBorderClasses(cell, rowIndex, colIndex)"
          ></div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COLOR_BG_HOVER_CLASSES } from '@/utils/colorPalette';
import { COLOR_BG_IMAGES } from '@/utils/colorPalette';
import { ColorName } from '../types/types';
import { useGameStore } from '../stores/gameStore';
import { onMounted } from 'vue';

const gameStore = useGameStore();

onMounted(() => {
  gameStore.clearMarkers();
});

// Default background/hover class for cells with dirt texture
const defaultBgClass = 'bg-slate-700 hover:bg-slate-600';
const defaultBgStyle =
  'background-image: url("/assets/cell-background.png"); background-size: cover; background-position: center;';

// Function to get cell classes (background and state classes)
function getCellClasses(cell: { groupColor?: string; state?: string }) {
  const classes = [];
  if (cell.groupColor) {
    classes.push(COLOR_BG_HOVER_CLASSES[cell.groupColor as ColorName]);
  } else {
    classes.push(defaultBgClass);
  }
  return classes;
}

// Function to get background style for each cell
function getCellBackgroundStyle(cell: { groupColor?: string }) {
  if (cell.groupColor) {
    return COLOR_BG_IMAGES[cell.groupColor as ColorName];
  }
  return defaultBgStyle;
}

// Conditional display methods
function shouldShowQueen(row: number, col: number): boolean {
  return gameStore.playerMarks[row][col] === 'queen';
}

function shouldShowFlag(row: number, col: number): boolean {
  return gameStore.playerMarks[row][col] === 'flag';
}

function shouldShowInvalid(row: number, col: number): boolean {
  return gameStore.playerMarks[row][col] === 'invalid';
}

// Handle cell clicks
function handleCellClick(row: number, col: number) {
  gameStore.handleSquareClick(row, col);
}

// Handle right-clicks for flags
function handleRightClick(row: number, col: number) {
  gameStore.placeFlag(row, col);
}

// Function to handle wrapper border classes
function getWrapperBorderClasses(cell: { groupColor?: string }, row: number, col: number) {
  const classes = [];
  const grid = gameStore.grid;
  const maxRow = grid.length - 1;
  const maxCol = grid[0].length - 1;

  // Check right neighbor
  if (col < maxCol) {
    if (grid[row][col + 1].groupColor !== cell.groupColor) {
      classes.push('border-r-2 border-r-blue-700');
    } else {
      classes.push('border-r-2 border-r-green-500/10');
    }
  } else {
    classes.push('border-r-2 border-r-gray-500');
  }

  // Check left neighbor
  if (col > 0) {
    if (grid[row][col - 1].groupColor !== cell.groupColor) {
      classes.push('border-l-2 border-l-blue-700');
    } else {
      classes.push('border-l-2 border-l-green-500/10');
    }
  } else {
    classes.push('border-l-2 border-l-gray-500');
  }

  // Check bottom neighbor
  if (row < maxRow) {
    if (grid[row + 1][col].groupColor !== cell.groupColor) {
      classes.push('border-b-2 border-b-blue-700');
    } else {
      classes.push('border-b-2 border-b-green-500/10');
    }
  } else {
    classes.push('border-b-2 border-b-gray-500');
  }

  // Check top neighbor
  if (row > 0) {
    if (grid[row - 1][col].groupColor !== cell.groupColor) {
      classes.push('border-t-2 border-t-blue-700');
    } else {
      classes.push('border-t-2 border-t-green-500/10');
    }
  } else {
    classes.push('border-t-2 border-t-gray-500');
  }

  return classes;
}
</script>

<script lang="ts">
export default {
  name: 'PlayGrid',
};
</script>
