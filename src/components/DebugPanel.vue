<template>
  <div class="h-full bg-surface p-4 rounded-lg shadow-lg overflow-y-auto">
    <h2 class="text-xl font-bold text-text mb-4">Debug Panel</h2>

    <!-- Game State -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-text mb-2">Game State</h3>
      <div class="bg-background p-3 rounded">
        <pre class="text-sm text-text whitespace-pre-wrap">{{
          JSON.stringify(gameState, null, 2)
        }}</pre>
      </div>
    </div>

    <!-- Visual Grid -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-text mb-2">Current Grid</h3>
      <div class="bg-background p-3 rounded">
        <DebugGrid :grid="gameStore.grid" />
      </div>
    </div>

    <!-- Move History -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-text mb-2">Last 3 Moves</h3>
      <div class="space-y-4">
        <div v-for="(move, index) in lastThreeMoves" :key="index" class="bg-background p-3 rounded">
          <div class="text-sm text-text mb-2">Move {{ gameStore.moveHistory.length - index }}</div>
          <DebugGrid :grid="move.grid" />
        </div>
      </div>
    </div>

    <!-- Available Moves -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-text mb-2">Available Moves</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="move in availableMoves"
          :key="`${move.row}-${move.col}`"
          class="flex items-center gap-2"
        >
          <div class="w-20 rounded bg-background border border-surface px-2 py-1 text-text">
            {{ move.row }},{{ move.col }}
          </div>
          <button
            class="rounded bg-primary px-3 py-1 text-white hover:bg-primary-hover"
            @click="gameStore.handleSquareClick(move.row, move.col)"
          >
            Make Move
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GridSquare } from './GameGrid.vue';
import DebugGrid from './DebugGrid.vue';
import { useGameStore } from '../stores/gameStore';
import type { GameState } from '../stores/gameStore';

const gameStore = useGameStore();

const gameState = computed(() => {
  const queens: { row: number; col: number }[] = [];
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].state === 'queen') {
        queens.push({ row, col });
      }
    }
  }
  return {
    gridSize: gameStore.gridSize,
    queens,
  };
});

const availableMoves = computed(() => {
  const moves: { row: number; col: number }[] = [];
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].state === 'empty') {
        moves.push({ row, col });
      }
    }
  }
  return moves;
});

const lastThreeMoves = computed(() => {
  return gameStore.moveHistory.slice(-3).reverse();
});
</script>
