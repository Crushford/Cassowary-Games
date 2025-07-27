<template>
  <div
    class="flex flex-col"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div
      v-for="(row, rowIndex) in harvestStore.grid"
      :key="rowIndex"
      class="flex flex-1 max-w-full justify-center"
    >
      <div
        v-for="(cell, colIndex) in row"
        :key="colIndex"
        class="h-full aspect-square relative"
        @click="handleCellClick(rowIndex, colIndex)"
        :data-row="rowIndex"
        :data-col="colIndex"
      >
        <FarmSquare :cell="cell" :row-index="rowIndex" :col-index="colIndex" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHarvestStore } from '../../stores/harvestStore';
import { onMounted, ref } from 'vue';
import FarmSquare from './FarmSquare.vue';

const harvestStore = useHarvestStore();

// Swipe tracking state
const isSwiping = ref(false);
const swipeStartPos = ref<{ x: number; y: number } | null>(null);
const swipedCells = ref<Set<string>>(new Set());

onMounted(() => {
  harvestStore.clearMarkers();
});

function handleCellClick(row: number, col: number) {
  harvestStore.handleSquareClick(row, col);
}

// Touch event handlers for swipe functionality
function handleTouchStart(event: TouchEvent) {
  if (event.touches.length !== 1) return;

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
    // Do not place a flag yet — we wait to see if the user moves
  }
}

function handleTouchMove(event: TouchEvent) {
  if (!isSwiping.value || event.touches.length !== 1) return;
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
          if (harvestStore.playerMarks[r][c] === null) {
            harvestStore.placeFlag(r, c);
          }
        }
      } else if (swipedCells.value.size > 2) {
        // Normal swipe continuation
        if (harvestStore.playerMarks[row][col] === null) {
          harvestStore.placeFlag(row, col);
        }
      }
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  isSwiping.value = false;
  swipeStartPos.value = null;
  swipedCells.value.clear();
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
</script>

<script lang="ts">
export default {
  name: 'PlayGrid',
};
</script>
