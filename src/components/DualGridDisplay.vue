<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <!-- Solution Grid -->
    <div class="flex flex-col items-center">
      <h3 class="text-lg font-semibold mb-3 text-white">Solution</h3>
      <div
        class="grid bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg"
        :style="{
          gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
          gap: '2px',
        }"
      >
        <template v-for="(row, rowIndex) in gameStore.grid" :key="`solution-${rowIndex}`">
          <div
            v-for="(cell, colIndex) in row"
            :key="`solution-${rowIndex}-${colIndex}`"
            class="w-12 h-12 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
            :class="getCellClasses(cell)"
            @click="handleSolutionCellClick(rowIndex, colIndex)"
          >
            <span v-if="isSolutionQueen(rowIndex, colIndex)" class="text-xl text-white">♛</span>
            <span v-else class="text-transparent">.</span>
          </div>
        </template>
      </div>
      <div class="mt-3">
        <button
          @click="gameStore.generateFullSolution"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors mr-2"
        >
          Generate Solution
        </button>
      </div>
    </div>

    <!-- Player Grid -->
    <div class="flex flex-col items-center">
      <h3 class="text-lg font-semibold mb-3 text-white">Test Your Solution</h3>
      <div
        class="grid bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg"
        :style="{
          gridTemplateColumns: `repeat(${gameStore.gridSize}, minmax(0, 1fr))`,
          gap: '2px',
        }"
      >
        <template v-for="(row, rowIndex) in gameStore.grid" :key="`player-${rowIndex}`">
          <div
            v-for="(cell, colIndex) in row"
            :key="`player-${rowIndex}-${colIndex}`"
            class="w-12 h-12 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
            :class="getCellClasses(cell)"
            @click="handlePlayerCellClick(rowIndex, colIndex)"
            @contextmenu.prevent="handleRightClick(rowIndex, colIndex)"
          >
            <span v-if="isPlayerQueen(rowIndex, colIndex)" class="text-xl text-white">♛</span>
            <span v-else-if="isPlayerFlag(rowIndex, colIndex)" class="text-sm text-yellow-400"
              >🚩</span
            >
            <span v-else-if="isPlayerInvalid(rowIndex, colIndex)" class="text-xl text-red-500"
              >⚠️</span
            >
            <span v-else class="text-transparent">.</span>
          </div>
        </template>
      </div>
      <div class="mt-3">
        <button
          @click="gameStore.clearQueensAndFlags"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Reset Board for Solving
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineComponent } from 'vue';
import { COLOR_BG_HOVER_CLASSES } from '@/utils/colorPalette';
import { ColorName } from '../types/types';
import { useGameStore } from '../stores/gameStore';

defineComponent({
  name: 'DualGridDisplay',
});

const gameStore = useGameStore();

// Default background/hover class for cells
const defaultBgClass = 'bg-slate-700 hover:bg-slate-600';

// Function to get cell classes
function getCellClasses(cell: { groupColor?: string; state?: string }) {
  // Start with an empty array
  const classes = [];

  // Add background color class
  if (cell.groupColor) {
    try {
      // Try to get the color class - if it fails, we'll use the default
      classes.push(COLOR_BG_HOVER_CLASSES[cell.groupColor as ColorName]);
    } catch (e) {
      classes.push(defaultBgClass);
    }
  } else {
    classes.push(defaultBgClass);
  }

  return classes;
}

// Solution grid methods
function isSolutionQueen(row: number, col: number): boolean {
  return gameStore.puzzleGrid.solution.some((q) => q.row === row && q.col === col);
}

function handleSolutionCellClick(row: number, col: number) {
  // If color tool is active and a color is selected, apply the color
  if (gameStore.colorToolActive && gameStore.colorToolSelectedColor) {
    gameStore.setSquareColor(row, col, gameStore.colorToolSelectedColor);
  }
}

// Player grid methods
function isPlayerQueen(row: number, col: number): boolean {
  return gameStore.playerGrid.queens.some((q) => q.row === row && q.col === col);
}

function isPlayerFlag(row: number, col: number): boolean {
  return gameStore.playerGrid.flags.some((f) => f.row === row && f.col === col);
}

function isPlayerInvalid(row: number, col: number): boolean {
  return gameStore.playerGrid.invalid.some((i) => i.row === row && i.col === col);
}

function handlePlayerCellClick(row: number, col: number) {
  gameStore.placeQueen(row, col);
}

function handleRightClick(row: number, col: number) {
  gameStore.placeFlag(row, col);
}
</script>
