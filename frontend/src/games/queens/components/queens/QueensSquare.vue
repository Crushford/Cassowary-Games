<template>
  <button
    :id="squareId"
    type="button"
    role="gridcell"
    class="h-full w-full relative transition-colors"
    :style="backgroundStyle"
    :class="[
      backgroundColorClass,
      frameClass,
      {
        'ring-4 ring-semantic-warning-500 ring-offset-2 ring-offset-semantic-neutral-900 animate-pulse':
          isTutorialTarget,
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
      v-if="overlayClass"
      class="absolute inset-0 pointer-events-none z-10 opacity-80"
      :class="overlayClass"
    />
    <div
      v-if="blackoutColorInsetClass"
      class="absolute inset-0 pointer-events-none z-20 flex items-center justify-center"
      aria-hidden="true"
    >
      <div
        class="h-[58%] w-[58%] rounded-sm border border-white/45 shadow-[0_0_0_1px_rgba(15,23,42,0.65)]"
        :class="blackoutColorInsetClass"
      />
    </div>

    <div class="relative z-30 flex items-center justify-center w-full h-full">
      <span
        v-if="showErrorFeedback"
        class="text-6xl absolute z-30 animate-bounce [text-shadow:0_0_10px_rgba(239,68,68,0.8)]"
      >
        ❌
      </span>

      <div class="relative flex items-center justify-center">
        <span
          v-if="shouldShowFlag"
          :class="[getEmojiSizeClass(), getFlagAnimationClass()]"
          aria-hidden="true"
        >
          🚧
        </span>
        <span v-else-if="shouldShowQueen" :class="getEmojiSizeClass()" aria-hidden="true">
          👑
        </span>
        <span
          v-else-if="showSeamFill"
          class="text-white/45 text-[10px] uppercase tracking-[0.22em]"
          aria-hidden="true"
        >
          {{ seamFillLabel ?? '•' }}
        </span>
        <span v-if="showAutoFlagRipple" :class="getRippleAnimationClass()" />
        <span
          v-if="(shouldShowFlag || shouldShowQueen) && isInError"
          class="absolute z-40 [text-shadow:0_0_8px_rgba(239,68,68,0.9)]"
          :class="getEmojiSizeClass()"
          aria-hidden="true"
        >
          ❌
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GridSquare, MarkType } from '../../types/types';
import type { PuzzleBoardCellViewModel } from './puzzleBoardTypes';
import { useQueensStore } from '../../stores/queensStore';
import { getRegionAppearanceBackgroundClass } from '../../utils/colorPalette';

interface FallbackStore {
  grid: GridSquare[][];
  gridSize: number;
  playerMarks: MarkType[][];
  showSolution: boolean;
  isTutorialMode: boolean;
  currentTutorialTarget: { row: number; col: number } | null;
  showErrorFeedback: boolean;
  errorFeedbackSquare: { row: number; col: number } | null;
  isSquareInError(row: number, col: number): boolean;
  isAutoFlagAnimating(row: number, col: number): boolean;
  getAutoFlagAnimationSource(row: number, col: number): 'blocked' | 'pattern' | null;
  handleSquareClick(row: number, col: number): void;
}

type QueensStoreInstance = ReturnType<typeof useQueensStore>;

const props = defineProps<{
  cell?: PuzzleBoardCellViewModel | null;
  rowIndex: number;
  colIndex: number;
  boardSize?: number;
  store?: QueensStoreInstance | FallbackStore | null;
  onActivate?: (() => void) | null;
}>();

const fallbackStore = computed(() => props.store ?? null);

const resolvedCell = computed<PuzzleBoardCellViewModel | null>(() => {
  if (props.cell) {
    return props.cell;
  }

  if (!fallbackStore.value) {
    return null;
  }

  const store = fallbackStore.value;
  const gridCell = store.grid[props.rowIndex]?.[props.colIndex];
  const playerMark = store.playerMarks[props.rowIndex]?.[props.colIndex] ?? null;
  const appearance = gridCell?.groupAppearance;
  const color = gridCell?.groupColor ?? 'unknown';
  const rowLabel = String.fromCharCode(65 + props.rowIndex);
  const colLabel = props.colIndex + 1;

  let ariaLabel = `Square at row ${rowLabel}, column ${colLabel}, color ${color}`;
  if (playerMark === 'queen') {
    ariaLabel += ', contains queen';
  } else if (playerMark === 'flag') {
    ariaLabel += ', flagged';
  } else {
    ariaLabel += ', empty';
  }

  if (
    store.isTutorialMode &&
    store.currentTutorialTarget &&
    store.currentTutorialTarget.row === props.rowIndex &&
    store.currentTutorialTarget.col === props.colIndex
  ) {
    ariaLabel += ', this is the target square for the current tutorial step';
  }

  const overlayClass =
    appearance?.pattern && appearance.pattern !== 'solid'
      ? {
          diagonal: 'region-pattern-diagonal',
          dots: 'region-pattern-dots',
          crosshatch: 'region-pattern-crosshatch',
        }[appearance.pattern]
      : null;
  const blackoutColorInsetClass =
    gridCell?.isBlackout === true && !!gridCell?.groupColor
      ? appearance
        ? getRegionAppearanceBackgroundClass(appearance)
        : 'bg-semantic-primary-500'
      : null;

  return {
    rowIndex: props.rowIndex,
    colIndex: props.colIndex,
    boardSize: props.boardSize ?? store.gridSize,
    backgroundClass: appearance
      ? getRegionAppearanceBackgroundClass(appearance)
      : 'bg-semantic-neutral-700',
    frameClass: 'border border-queens-gridLine',
    overlayClass,
    blackoutColorInsetClass,
    backgroundStyle: undefined,
    playerMark,
    showSolutionQueen: store.showSolution && gridCell?.isSolutionQueen === true,
    showSeamFill: false,
    seamFillLabel: null,
    showErrorFeedback:
      store.showErrorFeedback &&
      !!store.errorFeedbackSquare &&
      store.errorFeedbackSquare.row === props.rowIndex &&
      store.errorFeedbackSquare.col === props.colIndex,
    isInError: store.isSquareInError(props.rowIndex, props.colIndex),
    isAutoFlagAnimating: store.isAutoFlagAnimating(props.rowIndex, props.colIndex),
    autoFlagAnimationSource: store.getAutoFlagAnimationSource(props.rowIndex, props.colIndex),
    isTutorialTarget:
      store.isTutorialMode &&
      !!store.currentTutorialTarget &&
      store.currentTutorialTarget.row === props.rowIndex &&
      store.currentTutorialTarget.col === props.colIndex,
    ariaLabel,
  };
});

const rowIndex = computed(() => props.cell?.rowIndex ?? props.rowIndex);
const colIndex = computed(() => props.cell?.colIndex ?? props.colIndex);
const boardSize = computed(() => resolvedCell.value?.boardSize ?? props.boardSize ?? 0);
const backgroundColorClass = computed(
  () => resolvedCell.value?.backgroundClass ?? 'bg-semantic-neutral-700'
);
const frameClass = computed(
  () => resolvedCell.value?.frameClass ?? 'border border-queens-gridLine'
);
const overlayClass = computed(() => resolvedCell.value?.overlayClass ?? null);
const blackoutColorInsetClass = computed(() => resolvedCell.value?.blackoutColorInsetClass ?? null);
const backgroundStyle = computed(() => resolvedCell.value?.backgroundStyle);
const ariaLabel = computed(() => resolvedCell.value?.ariaLabel ?? 'Queens puzzle square');
const squareId = computed(() => `queens-square-${rowIndex.value}-${colIndex.value}`);
const shouldShowQueen = computed(() => {
  const cell = resolvedCell.value;
  if (!cell) return false;
  return cell.playerMark === 'queen' || cell.showSolutionQueen;
});
const shouldShowFlag = computed(() => resolvedCell.value?.playerMark === 'flag');
const showSeamFill = computed(() => resolvedCell.value?.showSeamFill ?? false);
const seamFillLabel = computed(() => resolvedCell.value?.seamFillLabel ?? null);
const showErrorFeedback = computed(() => resolvedCell.value?.showErrorFeedback ?? false);
const isInError = computed(() => resolvedCell.value?.isInError ?? false);
const isTutorialTarget = computed(() => resolvedCell.value?.isTutorialTarget ?? false);
const isAutoFlagAnimating = computed(() => resolvedCell.value?.isAutoFlagAnimating ?? false);
const autoFlagAnimationSource = computed(() => resolvedCell.value?.autoFlagAnimationSource ?? null);
const showAutoFlagRipple = computed(() => shouldShowFlag.value && isAutoFlagAnimating.value);

function handleClick(): void {
  if (props.cell) {
    props.onActivate?.();
    return;
  }

  const store = fallbackStore.value;
  if (!store) return;
  store.handleSquareClick(props.rowIndex, props.colIndex);
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

function getEmojiSizeClass(): string {
  const size = boardSize.value;
  if (size <= 4) return 'text-3xl';
  if (size <= 6) return 'text-2xl';
  if (size <= 8) return 'text-xl';
  return 'text-lg';
}

defineOptions({
  name: 'QueensSquare',
});
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
  70% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes auto-flag-ripple {
  0% {
    transform: scale(0.55);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes auto-flag-tint-pattern {
  0% {
    filter: brightness(1.08) saturate(1.1);
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

@keyframes auto-flag-tint-blocked {
  0% {
    filter: brightness(1.06) saturate(1.04);
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}
</style>
