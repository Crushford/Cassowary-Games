<template>
  <div class="relative flex flex-col items-center">
    <!-- Game Grid -->
    <div
      class="grid bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg"
      :style="{
        gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
        gap: '2px',
      }"
    >
      <template v-for="(row, rowIndex) in gameStore.grid" :key="rowIndex">
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="relative"
          :class="getWrapperBorderClasses(cell, rowIndex, colIndex)"
        >
          <div
            class="relative w-12 h-12 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
            :class="getCellClasses(cell)"
            @click="handleCellClick(rowIndex, colIndex)"
          >
            <span v-if="shouldShowQueen(rowIndex, colIndex)" class="text-xl text-white">♛</span>
            <span v-else-if="shouldShowFlag(rowIndex, colIndex)" class="text-sm text-yellow-400"
              >🚩</span
            >
            <span v-else-if="shouldShowInvalid(rowIndex, colIndex)" class="text-xl text-red-500"
              >⚠️</span
            >
            <span v-else class="text-transparent">.</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Control Buttons -->
    <div v-if="showControls" class="mt-4 flex gap-4">
      <button
        v-if="mode === 'player'"
        @click="gameStore.handleUndo()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Undo
      </button>
      <button
        v-if="mode === 'player'"
        @click="gameStore.clearQueensAndFlags()"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Restart
      </button>
      <button
        v-if="mode === 'solution'"
        @click="gameStore.generateFullSolution"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Generate Solution
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineComponent } from 'vue';
import { COLOR_BG_HOVER_CLASSES } from '@/utils/colorPalette';
import { ColorName } from '../types/types';
import { useGameStore } from '../stores/gameStore';

defineComponent({
  name: 'GameGrid',
});

const props = defineProps({
  mode: {
    type: String,
    default: 'player',
    validator: (value: string) => ['player', 'solution'].includes(value),
  },
  showControls: {
    type: Boolean,
    default: true,
  },
});

const gameStore = useGameStore();
const localGridSize = ref(gameStore.gridSize);

// Default background/hover class for cells
const defaultBgClass = 'bg-slate-700 hover:bg-slate-600';

// Function to get cell classes (background and state classes)
function getCellClasses(cell: { groupColor?: string; state?: string }) {
  const classes = [];

  // Add background color class
  if (cell.groupColor) {
    classes.push(COLOR_BG_HOVER_CLASSES[cell.groupColor as ColorName]);
  } else {
    classes.push(defaultBgClass);
  }

  // Add rings for special states
  if (props.mode === 'player' && cell.state === 'queen') {
    classes.push('ring-2 ring-white ring-opacity-70');
  } else if (props.mode === 'player' && cell.state === 'invalid') {
    classes.push('ring-2 ring-red-500 ring-opacity-70');
  }

  return classes;
}

// Conditional display methods
function shouldShowQueen(row: number, col: number): boolean {
  if (props.mode === 'solution') {
    return isSolutionQueen(row, col);
  } else {
    return gameStore.playerGrid.queens.some((q) => q.row === row && q.col === col);
  }
}

function shouldShowFlag(row: number, col: number): boolean {
  if (props.mode === 'solution') {
    return false; // No flags in solution view
  } else {
    return gameStore.playerGrid.flags.some((f) => f.row === row && f.col === col);
  }
}

function shouldShowInvalid(row: number, col: number): boolean {
  if (props.mode === 'solution') {
    return false; // No invalid markers in solution view
  } else {
    return gameStore.playerGrid.invalid.some((i) => i.row === row && i.col === col);
  }
}

// Solution-specific methods
function isSolutionQueen(row: number, col: number): boolean {
  return gameStore.puzzleGrid.solution.some((q) => q.row === row && q.col === col);
}

// Watch for grid size changes from the store
watch(
  () => gameStore.gridSize,
  (newSize) => {
    localGridSize.value = newSize;
  }
);

// Initialize localGridSize from store on mount
onMounted(() => {
  localGridSize.value = gameStore.gridSize;
});

// Handle cell clicks
function handleCellClick(row: number, col: number) {
  // If color tool is active and a color is selected, apply the color
  if (gameStore.colorToolActive && gameStore.colorToolSelectedColor) {
    gameStore.setSquareColor(row, col, gameStore.colorToolSelectedColor);
  } else if (props.mode === 'player') {
    // Use handleSquareClick to cycle: empty -> flag -> queen
    gameStore.handleSquareClick(row, col);
  }
}

// Handle right-clicks for flags
function handleRightClick(row: number, col: number) {
  if (props.mode === 'player') {
    // Only place flags in player mode
    gameStore.placeFlag(row, col);
  }
}

// Update grid size
function updateGridSize() {
  gameStore.setGridSize(localGridSize.value);
}

// New function to handle wrapper border classes
function getWrapperBorderClasses(cell: { groupColor?: string }, row: number, col: number) {
  const classes = [];
  const grid = gameStore.grid;
  const maxRow = grid.length - 1;
  const maxCol = grid[0].length - 1;

  // Right border (only if neighbor to the right is a different group)
  if (col < maxCol && grid[row][col + 1].groupColor !== cell.groupColor) {
    classes.push(
      'after:absolute after:right-0 after:top-0 after:w-[4px] after:h-full after:bg-blue-500 after:z-10'
    );
  }

  // Bottom border (only if neighbor below is a different group)
  if (row < maxRow && grid[row + 1][col].groupColor !== cell.groupColor) {
    classes.push(
      'after:absolute after:bottom-0 after:left-0 after:h-[4px] after:w-full after:bg-blue-500 after:z-10'
    );
  }

  return classes;
}
</script>
