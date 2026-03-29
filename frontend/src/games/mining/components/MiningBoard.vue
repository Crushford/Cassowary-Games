<template>
  <div
    class="grid grid-cols-5 gap-2 [touch-action:none] overscroll-none"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <MiningSquare
      v-for="cell in cells"
      :key="`${cell.row}-${cell.col}`"
      :row="cell.row"
      :col="cell.col"
      :tile-kind="cell.tileKind"
      :flagged="cell.flagged"
      :auto-flag-animating="autoFlagAnimatingKeys.has(getCellKey(cell.row, cell.col))"
      :gold-found-animating="goldFoundAnimatingKeys.has(getCellKey(cell.row, cell.col))"
      :reward-label="rewardLabel"
      :region-id="cell.regionId"
      :show-region="showRegions"
      :disabled="disabled || cell.tileKind !== 'hidden'"
      :can-excavate-all-hidden="canExcavateAllHidden"
      @dig="handleDig(cell.row, cell.col)"
      @toggle-flag="handleToggleFlag(cell.row, cell.col)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import type { MiningFlagType, PositionRef } from '../game/types';
import MiningSquare from './MiningSquare.vue';

const props = defineProps<{
  truthGold: boolean[][];
  regionIds: string[][];
  revealed: boolean[][];
  flagged: Array<Array<MiningFlagType | null>>;
  rewardLabel: string;
  showRegions: boolean;
  canExcavateAllHidden: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  dig: [position: PositionRef];
  'toggle-flag': [position: PositionRef];
}>();

const isSwiping = ref(false);
const swipedCells = ref<Set<string>>(new Set());
const autoFlagAnimatingKeys = ref<Set<string>>(new Set());
const goldFoundAnimatingKeys = ref<Set<string>>(new Set());
const autoFlagTimeouts = new Map<string, number>();
const goldFoundTimeouts = new Map<string, number>();
let hasHydratedFlagSnapshot = false;
let hasHydratedRevealSnapshot = false;

watch(
  () => props.flagged.map((row) => [...row]),
  (nextFlagged, previousFlagged) => {
    if (!hasHydratedFlagSnapshot || !previousFlagged) {
      hasHydratedFlagSnapshot = true;
      return;
    }

    const nextAnimatingKeys = new Set(autoFlagAnimatingKeys.value);

    for (let row = 0; row < nextFlagged.length; row += 1) {
      for (let col = 0; col < nextFlagged[row].length; col += 1) {
        const previousFlag = previousFlagged[row]?.[col] ?? null;
        const nextFlag = nextFlagged[row]?.[col] ?? null;

        if (previousFlag === 'not-gold' || nextFlag !== 'not-gold') {
          continue;
        }

        const key = getCellKey(row, col);
        nextAnimatingKeys.add(key);

        const pendingTimeout = autoFlagTimeouts.get(key);
        if (pendingTimeout !== undefined) {
          window.clearTimeout(pendingTimeout);
        }

        autoFlagTimeouts.set(
          key,
          window.setTimeout(() => {
            autoFlagTimeouts.delete(key);
            const remainingKeys = new Set(autoFlagAnimatingKeys.value);
            remainingKeys.delete(key);
            autoFlagAnimatingKeys.value = remainingKeys;
          }, 340)
        );
      }
    }

    autoFlagAnimatingKeys.value = nextAnimatingKeys;
  },
  { deep: true }
);

onBeforeUnmount(() => {
  for (const timeoutId of autoFlagTimeouts.values()) {
    window.clearTimeout(timeoutId);
  }
  autoFlagTimeouts.clear();

  for (const timeoutId of goldFoundTimeouts.values()) {
    window.clearTimeout(timeoutId);
  }
  goldFoundTimeouts.clear();
});

watch(
  () => props.revealed.map((row) => [...row]),
  (nextRevealed, previousRevealed) => {
    if (!hasHydratedRevealSnapshot || !previousRevealed) {
      hasHydratedRevealSnapshot = true;
      return;
    }

    const nextAnimatingKeys = new Set(goldFoundAnimatingKeys.value);

    for (let row = 0; row < nextRevealed.length; row += 1) {
      for (let col = 0; col < nextRevealed[row].length; col += 1) {
        const wasRevealed = previousRevealed[row]?.[col] ?? false;
        const isRevealed = nextRevealed[row]?.[col] ?? false;

        if (wasRevealed || !isRevealed || !props.truthGold[row]?.[col]) {
          continue;
        }

        const key = getCellKey(row, col);
        nextAnimatingKeys.add(key);

        const pendingTimeout = goldFoundTimeouts.get(key);
        if (pendingTimeout !== undefined) {
          window.clearTimeout(pendingTimeout);
        }

        goldFoundTimeouts.set(
          key,
          window.setTimeout(() => {
            goldFoundTimeouts.delete(key);
            const remainingKeys = new Set(goldFoundAnimatingKeys.value);
            remainingKeys.delete(key);
            goldFoundAnimatingKeys.value = remainingKeys;
          }, 520)
        );
      }
    }

    goldFoundAnimatingKeys.value = nextAnimatingKeys;
  },
  { deep: true }
);

function handleDig(row: number, col: number) {
  console.log('[mining][board] forwarding dig request', {
    row,
    col,
    boardDisabled: Boolean(props.disabled),
    canExcavateAllHidden: props.canExcavateAllHidden,
    flagAtCell: props.flagged[row]?.[col] ?? null,
    revealed: props.revealed[row]?.[col] ?? false,
  });
  emit('dig', { row, col });
}

function handleToggleFlag(row: number, col: number) {
  console.log('[mining][board] forwarding toggle-flag request', {
    row,
    col,
    boardDisabled: Boolean(props.disabled),
    flagAtCell: props.flagged[row]?.[col] ?? null,
    revealed: props.revealed[row]?.[col] ?? false,
  });
  emit('toggle-flag', { row, col });
}

function handleTouchStart(event: TouchEvent) {
  if (props.disabled || event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  const cellElement = findParentCellElement(
    document.elementFromPoint(touch.clientX, touch.clientY)
  );

  if (!cellElement) {
    return;
  }

  const position = getPositionFromCellElement(cellElement);

  if (!position) {
    return;
  }

  isSwiping.value = true;
  swipedCells.value.clear();
  swipedCells.value.add(getCellKey(position.row, position.col));
}

function handleTouchMove(event: TouchEvent) {
  if (!isSwiping.value || event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  const cellElement = findParentCellElement(
    document.elementFromPoint(touch.clientX, touch.clientY)
  );

  if (!cellElement) {
    return;
  }

  const position = getPositionFromCellElement(cellElement);

  if (!position) {
    return;
  }

  const cellKey = getCellKey(position.row, position.col);

  if (swipedCells.value.has(cellKey)) {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }
  swipedCells.value.add(cellKey);

  if (swipedCells.value.size === 2) {
    for (const key of swipedCells.value) {
      placeSwipeFlagForKey(key);
    }
    return;
  }

  placeSwipeFlag(position.row, position.col);
}

function handleTouchEnd() {
  isSwiping.value = false;
  swipedCells.value.clear();
}

function placeSwipeFlagForKey(key: string) {
  const [row, col] = key.split(',').map(Number);
  placeSwipeFlag(row, col);
}

function placeSwipeFlag(row: number, col: number) {
  if (!canPlaceSwipeFlag(row, col)) {
    return;
  }

  handleToggleFlag(row, col);
}

function canPlaceSwipeFlag(row: number, col: number) {
  if (props.disabled) {
    return false;
  }

  if (props.revealed[row]?.[col]) {
    return false;
  }

  return props.flagged[row]?.[col] !== 'gold-here';
}

function getCellKey(row: number, col: number) {
  return `${row},${col}`;
}

function getPositionFromCellElement(element: Element): PositionRef | null {
  const row = element.getAttribute('data-row');
  const col = element.getAttribute('data-col');

  if (row === null || col === null) {
    return null;
  }

  return {
    row: Number(row),
    col: Number(col),
  };
}

function findParentCellElement(element: Element | null): Element | null {
  if (!element) {
    return null;
  }

  if (element.hasAttribute('data-row') && element.hasAttribute('data-col')) {
    return element;
  }

  let parent = element.parentElement;

  while (parent) {
    if (parent.hasAttribute('data-row') && parent.hasAttribute('data-col')) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

const cells = computed(() => {
  const values: Array<{
    row: number;
    col: number;
    tileKind: 'hidden' | 'gold' | 'empty';
    flagged: MiningFlagType | null;
    regionId: string | null;
  }> = [];

  for (let row = 0; row < props.truthGold.length; row += 1) {
    for (let col = 0; col < props.truthGold[row].length; col += 1) {
      let tileKind: 'hidden' | 'gold' | 'empty' = 'hidden';

      if (props.revealed[row][col]) {
        tileKind = props.truthGold[row][col] ? 'gold' : 'empty';
      }

      values.push({
        row,
        col,
        tileKind,
        flagged: props.flagged[row][col],
        regionId: props.regionIds[row][col] ?? null,
      });
    }
  }

  return values;
});
</script>
