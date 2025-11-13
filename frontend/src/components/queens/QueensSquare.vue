<template>
  <button
    class="h-full w-full relative transition-colors"
    :class="[
      backgroundColorClass,
      hoverClass,
      {
        'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800 animate-pulse': isTutorialTarget,
      },
    ]"
    @click="handleClick"
    :aria-label="ariaLabel"
    :aria-describedby="isTutorialTarget ? 'tutorial-instruction' : undefined"
  >
    <!-- Content overlay -->
    <div class="relative z-10 flex items-center justify-center w-full h-full">
      <!-- Error feedback (red X) -->
      <span
        v-if="showErrorFeedback"
        class="text-6xl absolute z-30 animate-bounce [text-shadow:0_0_10px_rgba(239,68,68,0.8)]"
      >
        ❌
      </span>
      <!-- Show player marks (flag or queen) -->
      <div class="relative flex items-center justify-center">
        <span v-if="shouldShowFlag()" :class="getEmojiSizeClass()">🚧</span>
        <span v-else-if="shouldShowQueen()" :class="getEmojiSizeClass()">👑</span>
        <!-- Red X overlay for flags or queens in error state -->
        <span
          v-if="(shouldShowFlag() || shouldShowQueen()) && isInError"
          class="absolute z-40 [text-shadow:0_0_8px_rgba(239,68,68,0.9)]"
          :class="getEmojiSizeClass()"
        >
          ❌
        </span>
      </div>
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

const isTutorialTarget = computed(() => {
  if (!queensStore.isTutorialMode) return false;
  const target = queensStore.currentTutorialTarget;
  return target !== null && target.row === props.rowIndex && target.col === props.colIndex;
});

const showErrorFeedback = computed(() => {
  if (!queensStore.showErrorFeedback || !queensStore.errorFeedbackSquare) return false;
  return (
    queensStore.errorFeedbackSquare.row === props.rowIndex &&
    queensStore.errorFeedbackSquare.col === props.colIndex
  );
});

const gridCell = computed(() => {
  return props.store.grid[props.rowIndex]?.[props.colIndex];
});

const rowLabel = computed(() => String.fromCharCode(65 + props.rowIndex)); // A, B, C, etc.
const colLabel = computed(() => props.colIndex + 1); // 1-indexed

const ariaLabel = computed(() => {
  const mark = queensStore.playerMarks[props.rowIndex][props.colIndex];
  const color = gridCell.value?.groupColor || 'unknown';
  let label = `Square at row ${rowLabel.value}, column ${colLabel.value}, color ${color}`;

  if (mark === 'queen') {
    label += ', contains queen';
  } else if (mark === 'flag') {
    label += ', flagged';
  } else {
    label += ', empty';
  }

  if (isTutorialTarget.value) {
    label += ', this is the target square for the current tutorial step';
  }

  return label;
});

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

const isInError = computed(() => {
  return queensStore.isSquareInError(props.rowIndex, props.colIndex);
});

const backgroundColorClass = computed(() => {
  const color = gridCell.value?.groupColor as ColorName | undefined;
  if (color && DARK_PASTEL_COLORS[color]) {
    return DARK_PASTEL_COLORS[color].bg;
  }
  return 'bg-gray-700';
});

// Remove hover class - no hover effect
const hoverClass = computed(() => {
  return '';
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
