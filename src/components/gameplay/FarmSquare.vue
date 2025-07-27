<template>
  <div class="h-full aspect-square relative">
    <!-- Background Image -->
    <img
      :src="getCellImage(cell)"
      class="absolute inset-0 w-full h-full object-cover pointer-events-none"
      alt="cell background"
    />

    <!-- Emoji overlay -->
    <div class="relative z-10 flex items-center justify-center w-full h-full">
      <span v-if="shouldShowQueen(rowIndex, colIndex)" :class="getEmojiSizeClass()">🍯</span>
      <span v-else-if="shouldShowFlag(rowIndex, colIndex)" :class="getEmojiSizeClass()">🚧</span>
      <div
        v-else-if="shouldShowInvalid(rowIndex, colIndex)"
        class="flex items-center justify-center leading-none w-full h-full"
        :class="getEmojiSizeClass()"
      >
        <span>🐜</span>
      </div>
      <span v-else class="invisible">.</span>
    </div>

    <!-- Border overlay -->
    <div
      class="absolute inset-0 pointer-events-none z-20"
      :class="getWrapperBorderClasses(cell, rowIndex, colIndex)"
    />
  </div>
</template>

<script setup lang="ts">
import { useHarvestStore } from '../../stores/harvestStore';
import type { ColorName } from '../../types/types';

interface Props {
  cell: { groupColor?: string };
  rowIndex: number;
  colIndex: number;
}

const props = defineProps<Props>();
const harvestStore = useHarvestStore();

function getCellImage(cell: { groupColor?: string }) {
  if (cell.groupColor) {
    return `/assets/ant-nest-colors/${cell.groupColor}.png`;
  }
  return '/assets/ant-nest-colors/cell-background.png';
}

function shouldShowQueen(row: number, col: number): boolean {
  return harvestStore.playerMarks[row][col] === 'queen';
}

function shouldShowFlag(row: number, col: number): boolean {
  return harvestStore.playerMarks[row][col] === 'flag';
}

function shouldShowInvalid(row: number, col: number): boolean {
  return harvestStore.playerMarks[row][col] === 'invalid';
}

function getWrapperBorderClasses(cell: { groupColor?: string }, row: number, col: number) {
  const classes: string[] = [];
  const grid = harvestStore.grid;
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

function getEmojiSizeClass() {
  const size = harvestStore.gridSize;
  if (size <= 4) return 'text-3xl';
  if (size <= 6) return 'text-2xl';
  if (size <= 8) return 'text-xl';
  return 'text-lg';
}
</script>

<script lang="ts">
export default {
  name: 'FarmSquare',
};
</script>
