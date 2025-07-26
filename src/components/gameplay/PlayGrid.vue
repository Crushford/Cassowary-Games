<template>
  <div
    class="flex flex-col"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div
      v-for="(row, rowIndex) in gameStore.grid"
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
        <!-- Background Image -->
        <img
          :src="getCellImage(cell)"
          class="absolute inset-0 w-full h-full object-cover pointer-events-none"
          alt="cell background"
        />

        <!-- Emoji overlay -->
        <div class="relative z-10 flex items-center justify-center w-full h-full">
          <span v-if="shouldShowQueen(rowIndex, colIndex)" :class="getEmojiSizeClass()">🍯</span>
          <span v-else-if="shouldShowFlag(rowIndex, colIndex)" :class="getEmojiSizeClass()"
            >🚧</span
          >
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore';
import { onMounted, ref } from 'vue';
import type { ColorName } from '../../types/types';

const gameStore = useGameStore();

// Swipe tracking state
const isSwiping = ref(false);
const swipeStartPos = ref<{ x: number; y: number } | null>(null);
const swipedCells = ref<Set<string>>(new Set());

onMounted(() => {
  gameStore.clearMarkers();
});

function getCellImage(cell: { groupColor?: string }) {
  if (cell.groupColor) {
    return `/assets/ant-nest-colors/${cell.groupColor}.png`;
  }
  return '/assets/ant-nest-colors/cell-background.png';
}

function shouldShowQueen(row: number, col: number): boolean {
  return gameStore.playerMarks[row][col] === 'queen';
}

function shouldShowFlag(row: number, col: number): boolean {
  return gameStore.playerMarks[row][col] === 'flag';
}

function shouldShowInvalid(row: number, col: number): boolean {
  return gameStore.playerMarks[row][col] === 'invalid';
}

function handleCellClick(row: number, col: number) {
  gameStore.handleSquareClick(row, col);
}

// Touch event handlers for swipe functionality
function handleTouchStart(event: TouchEvent) {
  if (event.touches.length !== 1) return;

  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  // Find the parent cell element that has data attributes
  const cellElement = findParentCellElement(element);

  if (cellElement && cellElement.hasAttribute('data-row') && cellElement.hasAttribute('data-col')) {
    isSwiping.value = true;
    swipeStartPos.value = { x: touch.clientX, y: touch.clientY };
    swipedCells.value.clear();

    const row = parseInt(cellElement.getAttribute('data-row')!);
    const col = parseInt(cellElement.getAttribute('data-col')!);
    const cellKey = `${row},${col}`;
    swipedCells.value.add(cellKey);

    // Flag the starting cell if it's empty
    if (gameStore.playerMarks[row][col] === null) {
      gameStore.placeFlag(row, col);
    }
  }
}

function handleTouchMove(event: TouchEvent) {
  if (!isSwiping.value || event.touches.length !== 1) return;

  event.preventDefault(); // Prevent scrolling while swiping

  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  // Find the parent cell element that has data attributes
  const cellElement = findParentCellElement(element);

  if (cellElement && cellElement.hasAttribute('data-row') && cellElement.hasAttribute('data-col')) {
    const row = parseInt(cellElement.getAttribute('data-row')!);
    const col = parseInt(cellElement.getAttribute('data-col')!);
    const cellKey = `${row},${col}`;

    if (!swipedCells.value.has(cellKey)) {
      swipedCells.value.add(cellKey);

      // Flag the cell if it's empty
      if (gameStore.playerMarks[row][col] === null) {
        gameStore.placeFlag(row, col);
      }
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  if (isSwiping.value) {
    // Only process as a swipe if we've touched multiple cells
    if (swipedCells.value.size > 1) {
      // This was a multi-cell swipe - all cells have already been flagged during the move
      console.log(`Swipe completed: ${swipedCells.value.size} cells flagged`);
    } else {
      // This was a single touch - treat it as a normal click
      const cellKey = Array.from(swipedCells.value)[0];
      if (cellKey) {
        const [row, col] = cellKey.split(',').map(Number);
        handleCellClick(row, col);
      }
    }
  }

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

function getWrapperBorderClasses(cell: { groupColor?: string }, row: number, col: number) {
  const classes: string[] = [];
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

function getEmojiSizeClass() {
  const size = gameStore.gridSize;
  if (size <= 4) return 'text-3xl';
  if (size <= 6) return 'text-2xl';
  if (size <= 8) return 'text-xl';
  return 'text-lg';
}
</script>

<script lang="ts">
export default {
  name: 'PlayGrid',
};
</script>
