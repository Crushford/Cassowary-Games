<template>
  <!-- PlayGrid -->
  <div>
    <div
      class="flex flex-col h-full w-full"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div
        v-for="(row, rowIndex) in store.grid"
        :key="rowIndex"
        class="flex flex-1 max-w-full justify-center w-full h-full"
      >
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="flex-1 relative w-full h-full"
          :data-row="rowIndex"
          :data-col="colIndex"
        >
          <slot :row-index="rowIndex" :col-index="colIndex" :store="store" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  store: any;
  enableTouch?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  enableTouch: false,
});

// Swipe tracking state (only used if touch is enabled)
const isSwiping = ref(false);
const swipeStartPos = ref<{ x: number; y: number } | null>(null);
const swipedCells = ref<Set<string>>(new Set());

// Touch event handlers for swipe functionality (only if enabled)
function handleTouchStart(event: TouchEvent) {
  if (!props.enableTouch || event.touches.length !== 1) return;

  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  const cellElement = findParentCellElement(element);

  if (cellElement && cellElement.hasAttribute('data-row') && cellElement.hasAttribute('data-col')) {
    isSwiping.value = true;
    swipeStartPos.value = { x: touch.clientX, y: touch.clientY };
    swipedCells.value.clear();

    const row = parseInt(cellElement.getAttribute('data-row')!);
    const col = parseInt(cellElement.getAttribute('data-col')!);
    swipedCells.value.add(`${row},${col}`);
  }
}

function handleTouchMove(event: TouchEvent) {
  if (!props.enableTouch || !isSwiping.value || event.touches.length !== 1) return;
  event.preventDefault();

  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  const cellElement = findParentCellElement(element);

  if (cellElement && cellElement.hasAttribute('data-row') && cellElement.hasAttribute('data-col')) {
    const row = parseInt(cellElement.getAttribute('data-row')!);
    const col = parseInt(cellElement.getAttribute('data-col')!);
    const cellKey = `${row},${col}`;

    if (!swipedCells.value.has(cellKey)) {
      swipedCells.value.add(cellKey);

      if (swipedCells.value.size === 2) {
        // Just confirmed a swipe, flag all visited so far
        for (const key of swipedCells.value) {
          const [r, c] = key.split(',').map(Number);
          if (canPlaceFlag(r, c)) {
            props.store.placeFlag(r, c);
          }
        }
      } else if (swipedCells.value.size > 2) {
        // Normal swipe continuation
        if (canPlaceFlag(row, col)) {
          props.store.placeFlag(row, col);
        }
      }
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  if (!props.enableTouch) return;

  isSwiping.value = false;
  swipeStartPos.value = null;
  swipedCells.value.clear();
}

// Helper function to check if a flag can be placed at the given position
function canPlaceFlag(row: number, col: number): boolean {
  // Check if the store has the harvest game structure (playerMarks array)
  if (props.store.playerMarks) {
    return props.store.playerMarks[row][col] === null;
  }

  // Check if the store has the casino game structure (playerMark property in grid cells)
  if (props.store.grid && props.store.grid[row] && props.store.grid[row][col]) {
    const playerMark = props.store.grid[row][col].playerMark;
    return playerMark === null;
  }

  return false;
}

// Helper function to find the parent cell element with data attributes
function findParentCellElement(element: Element | null): Element | null {
  if (!element) return null;

  // Check if this element has the data attributes
  if (element.hasAttribute('data-row') && element.hasAttribute('data-col')) {
    return element;
  }

  // Check parent elements
  let parent = element.parentElement;
  while (parent) {
    if (parent.hasAttribute('data-row') && parent.hasAttribute('data-col')) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

defineOptions({
  name: 'PlayGrid',
});
</script>
