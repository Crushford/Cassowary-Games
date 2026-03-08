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
  const mark = queensStore.playerMarks[props.rowIndex]?.[props.colIndex];
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

// High-separation color-only palette for queens game.
const DARK_PASTEL_COLORS: Record<ColorName, { bg: string; hover: string }> = {
  red: { bg: 'bg-[#991B1B]', hover: 'hover:bg-[#B91C1C]' },
  blue: { bg: 'bg-[#2563EB]', hover: 'hover:bg-[#3B82F6]' },
  green: { bg: 'bg-[#166534]', hover: 'hover:bg-[#15803D]' },
  yellow: { bg: 'bg-[#FDE047]', hover: 'hover:bg-[#FACC15]' },
  purple: { bg: 'bg-[#7E22CE]', hover: 'hover:bg-[#9333EA]' },
  pink: { bg: 'bg-[#EC4899]', hover: 'hover:bg-[#F472B6]' },
  orange: { bg: 'bg-[#C2410C]', hover: 'hover:bg-[#EA580C]' },
  teal: { bg: 'bg-[#0891B2]', hover: 'hover:bg-[#06B6D4]' },
  indigo: { bg: 'bg-[#312E81]', hover: 'hover:bg-[#4338CA]' },
  amber: { bg: 'bg-[#92400E]', hover: 'hover:bg-[#B45309]' },
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
  return queensStore.playerMarks[props.rowIndex]?.[props.colIndex] === 'queen';
}

function shouldShowFlag(): boolean {
  return queensStore.playerMarks[props.rowIndex]?.[props.colIndex] === 'flag';
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
