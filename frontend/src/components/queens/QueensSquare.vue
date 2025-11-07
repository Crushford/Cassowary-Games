<template>
  <button
    class="h-full w-full relative transition-colors"
    :class="[backgroundColorClass, hoverClass]"
    @click="handleClick"
  >
    <!-- Content overlay -->
    <div class="relative z-10 flex items-center justify-center w-full h-full">
      <!-- Show player marks (flag or queen) -->
      <span v-if="shouldShowFlag()" :class="getEmojiSizeClass()">🚧</span>
      <span v-else-if="shouldShowQueen()" :class="getEmojiSizeClass()">👑</span>
    </div>

    <!-- Border overlay -->
    <div class="absolute inset-0 pointer-events-none z-20 border border-gray-200" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQueensStore } from '../../stores/queensStore';
import type { ColorName } from '../../types/types';

interface Props {
  rowIndex: number;
  colIndex: number;
  store: any;
}

const props = defineProps<Props>();
const queensStore = useQueensStore();

// Dark pastel color mapping for queens game
const DARK_PASTEL_COLORS: Record<ColorName, { bg: string; hover: string }> = {
  red: { bg: 'bg-red-800', hover: 'hover:bg-red-700' },
  blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-500' }, // Lighter blue to differentiate from purple
  green: { bg: 'bg-green-800', hover: 'hover:bg-green-700' },
  yellow: { bg: 'bg-yellow-600', hover: 'hover:bg-yellow-500' }, // Lighter yellow
  purple: { bg: 'bg-purple-900', hover: 'hover:bg-purple-800' }, // Darker purple to differentiate from blue
  pink: { bg: 'bg-pink-700', hover: 'hover:bg-pink-600' }, // Different shade
  orange: { bg: 'bg-orange-700', hover: 'hover:bg-orange-600' }, // Different shade
  teal: { bg: 'bg-teal-700', hover: 'hover:bg-teal-600' }, // Different shade
  indigo: { bg: 'bg-indigo-700', hover: 'hover:bg-indigo-600' }, // Different shade
  amber: { bg: 'bg-amber-700', hover: 'hover:bg-amber-600' }, // Different shade
};

const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex];
});

const backgroundColorClass = computed(() => {
  const color = gridCell.value?.groupColor as ColorName | undefined;
  if (color && DARK_PASTEL_COLORS[color]) {
    return DARK_PASTEL_COLORS[color].bg;
  }
  return 'bg-gray-700';
});

const hoverClass = computed(() => {
  const color = gridCell.value?.groupColor as ColorName | undefined;
  if (color && DARK_PASTEL_COLORS[color]) {
    return DARK_PASTEL_COLORS[color].hover;
  }
  return 'hover:bg-gray-600';
});

function handleClick() {
  queensStore.handleSquareClick(props.rowIndex, props.colIndex);
}

function shouldShowQueen(): boolean {
  return queensStore.playerMarks[props.rowIndex][props.colIndex] === 'queen';
}

function shouldShowFlag(): boolean {
  return queensStore.playerMarks[props.rowIndex][props.colIndex] === 'flag';
}

function getEmojiSizeClass() {
  const size = queensStore.gridSize;
  if (size <= 4) return 'text-3xl';
  if (size <= 6) return 'text-2xl';
  if (size <= 8) return 'text-xl';
  return 'text-lg';
}
</script>

<script lang="ts">
export default {
  name: 'QueensSquare',
};
</script>
