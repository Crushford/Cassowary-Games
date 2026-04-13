<template>
  <button
    type="button"
    role="gridcell"
    class="h-full w-full relative transition-colors"
    :style="backgroundStyle"
    :class="[
      backgroundColorClass,
      {
        'ring-4 ring-semantic-warning-500 ring-offset-2 ring-offset-semantic-neutral-900 animate-pulse':
          isTutorialTarget,
        'ring-4 ring-semantic-info-300 ring-offset-2 ring-offset-semantic-neutral-900':
          isHintEvidenceCell,
        'ring-4 ring-semantic-success-400 ring-offset-2 ring-offset-semantic-neutral-900':
          isHintOutputCell,
        'auto-flag-tint-blocked': isAutoFlagAnimating && autoFlagAnimationSource === 'blocked',
        'auto-flag-tint-pattern': isAutoFlagAnimating && autoFlagAnimationSource === 'pattern',
      },
    ]"
    :aria-label="ariaLabel"
    :aria-describedby="isTutorialTarget ? 'tutorial-instruction' : undefined"
    :aria-rowindex="rowIndex + 1"
    :aria-colindex="colIndex + 1"
    :data-row-index="rowIndex"
    :data-col-index="colIndex"
    @click="handleClick"
  >
    <div
      v-if="patternClass"
      class="absolute inset-0 pointer-events-none z-10 opacity-80"
      :class="patternClass"
    />

    <!-- Content overlay -->
    <div class="relative z-30 flex items-center justify-center w-full h-full">
      <!-- Error feedback (red X) -->
      <span
        v-if="showErrorFeedback"
        class="text-6xl absolute z-30 animate-bounce [text-shadow:0_0_10px_rgba(239,68,68,0.8)]"
      >
        ❌
      </span>
      <!-- Show player marks (flag or queen) -->
      <div class="relative flex items-center justify-center">
        <span v-if="shouldShowFlag()" :class="[getEmojiSizeClass(), getFlagAnimationClass()]">
          🚧
        </span>
        <span v-else-if="shouldShowQueen()" :class="getEmojiSizeClass()">👑</span>
        <span v-if="showAutoFlagRipple" :class="getRippleAnimationClass()" />
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
    <div class="absolute inset-0 pointer-events-none z-20 border border-queens-gridLine" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQueensStore } from '../../stores/queensStore';
import type { GridSquare, QueensPatternVariant } from '../../types/types';
import { getRegionAppearanceBackgroundClass } from '../../utils/colorPalette';

interface Props {
  rowIndex: number;
  colIndex: number;
  store: {
    grid: GridSquare[][];
  };
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

const isInError = computed(() => {
  return queensStore.isSquareInError(props.rowIndex, props.colIndex);
});
const isHintEvidenceCell = computed(() => {
  return queensStore.isHintEvidenceCell(props.rowIndex, props.colIndex);
});
const isHintOutputCell = computed(() => {
  return queensStore.isHintOutputCell(props.rowIndex, props.colIndex);
});
const isAutoFlagAnimating = computed(() => {
  return queensStore.isAutoFlagAnimating(props.rowIndex, props.colIndex);
});
const autoFlagAnimationSource = computed(() => {
  return queensStore.getAutoFlagAnimationSource(props.rowIndex, props.colIndex);
});
const showAutoFlagRipple = computed(() => {
  return shouldShowFlag() && isAutoFlagAnimating.value;
});

const backgroundColorClass = computed(() => {
  const appearance = gridCell.value?.groupAppearance;
  if (appearance) {
    return getRegionAppearanceBackgroundClass(appearance);
  }
  return 'bg-semantic-neutral-700';
});

const PATTERN_CLASS_MAP: Record<Exclude<QueensPatternVariant, 'solid'>, string> = {
  diagonal: 'region-pattern-diagonal',
  dots: 'region-pattern-dots',
  crosshatch: 'region-pattern-crosshatch',
};

const patternClass = computed(() => {
  const pattern = gridCell.value?.groupAppearance?.pattern;
  if (!pattern || pattern === 'solid') return '';
  return PATTERN_CLASS_MAP[pattern];
});

const backgroundStyle = computed(() => {
  return undefined;
});

function handleClick() {
  queensStore.handleSquareClick(props.rowIndex, props.colIndex);
}

function shouldShowQueen(): boolean {
  if (queensStore.playerMarks[props.rowIndex]?.[props.colIndex] === 'queen') {
    return true;
  }

  return queensStore.showSolution && gridCell.value?.isSolutionQueen === true;
}

function shouldShowFlag(): boolean {
  return queensStore.playerMarks[props.rowIndex]?.[props.colIndex] === 'flag';
}

function getFlagAnimationClass(): string {
  if (!isAutoFlagAnimating.value) {
    return '';
  }
  if (autoFlagAnimationSource.value === 'pattern') {
    return 'auto-flag-pop auto-flag-pattern';
  }
  return 'auto-flag-pop auto-flag-blocked';
}

function getRippleAnimationClass(): string {
  if (autoFlagAnimationSource.value === 'pattern') {
    return 'auto-flag-ripple auto-flag-ripple-pattern';
  }
  return 'auto-flag-ripple auto-flag-ripple-blocked';
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

<style scoped>
.region-pattern-diagonal {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(248, 250, 252, 0.14) 0,
    rgba(248, 250, 252, 0.14) 2px,
    transparent 2px,
    transparent 8px
  );
}

.region-pattern-dots {
  background-image: radial-gradient(rgba(248, 250, 252, 0.16) 18%, transparent 20%);
  background-size: 8px 8px;
}

.region-pattern-crosshatch {
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(248, 250, 252, 0.12) 0,
      rgba(248, 250, 252, 0.12) 1px,
      transparent 1px,
      transparent 7px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(248, 250, 252, 0.12) 0,
      rgba(248, 250, 252, 0.12) 1px,
      transparent 1px,
      transparent 7px
    );
}

.auto-flag-pop {
  animation: auto-flag-pop 220ms ease-out;
}

.auto-flag-pattern {
  filter: drop-shadow(0 0 10px rgba(45, 212, 191, 0.85));
}

.auto-flag-blocked {
  filter: drop-shadow(0 0 9px rgba(125, 211, 252, 0.65));
}

.auto-flag-ripple {
  position: absolute;
  width: 62%;
  height: 62%;
  border-radius: 9999px;
  border: 2px solid transparent;
  animation: auto-flag-ripple 320ms ease-out;
}

.auto-flag-ripple-pattern {
  border-color: rgba(45, 212, 191, 0.85);
}

.auto-flag-ripple-blocked {
  border-color: rgba(125, 211, 252, 0.75);
}

.auto-flag-tint-pattern {
  animation: auto-flag-tint-pattern 180ms ease-out;
}

.auto-flag-tint-blocked {
  animation: auto-flag-tint-blocked 180ms ease-out;
}

@keyframes auto-flag-pop {
  0% {
    transform: scale(0.72);
    opacity: 0.7;
  }

  65% {
    transform: scale(1.15);
    opacity: 1;
  }

  100% {
    transform: scale(1);
  }
}

@keyframes auto-flag-ripple {
  0% {
    transform: scale(0.45);
    opacity: 0.45;
  }

  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}

@keyframes auto-flag-tint-pattern {
  0% {
    box-shadow: inset 0 0 0 9999px rgba(45, 212, 191, 0.16);
  }

  100% {
    box-shadow: inset 0 0 0 9999px rgba(45, 212, 191, 0);
  }
}

@keyframes auto-flag-tint-blocked {
  0% {
    box-shadow: inset 0 0 0 9999px rgba(125, 211, 252, 0.14);
  }

  100% {
    box-shadow: inset 0 0 0 9999px rgba(125, 211, 252, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auto-flag-pop,
  .auto-flag-ripple,
  .auto-flag-tint-pattern,
  .auto-flag-tint-blocked {
    animation: none;
  }
}
</style>
