<template>
  <div class="w-96 bg-surface p-4 rounded-lg shadow-lg">
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

    <!-- Available Moves -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-text mb-2">Available Moves</h3>
      <div class="space-y-2">
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
            @click="$emit('make-move', move.row, move.col)"
          >
            Make Move
          </button>
        </div>
      </div>
    </div>

    <!-- Move History -->
    <div>
      <h3 class="text-lg font-semibold text-text mb-2">Last 3 Moves</h3>
      <div class="space-y-4">
        <div v-for="(move, index) in lastThreeMoves" :key="index" class="bg-background p-3 rounded">
          <div class="text-sm text-text mb-2">Move {{ moveHistory.length - index }}</div>
          <div
            class="grid gap-1"
            :style="{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }"
          >
            <template v-for="(row, rowIndex) in move.grid" :key="rowIndex">
              <div
                v-for="(square, colIndex) in row"
                :key="`${rowIndex}-${colIndex}`"
                class="aspect-square w-full rounded border border-surface flex items-center justify-center"
                :class="{
                  'bg-primary': square.state === 'queen',
                  'bg-secondary': square.state === 'flag',
                  'bg-surface': square.state === 'empty',
                }"
              >
                <span v-if="square.state === 'queen'">👑</span>
                <span v-else-if="square.state === 'flag'">🚩</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GridSquare } from './GameGrid.vue';

interface Props {
  grid: GridSquare[][];
  gridSize: number;
  moveHistory: { grid: GridSquare[][] }[];
}

const props = defineProps<Props>();

const gameState = computed(() => {
  const queens: { row: number; col: number }[] = [];
  for (let row = 0; row < props.gridSize; row++) {
    for (let col = 0; col < props.gridSize; col++) {
      if (props.grid[row][col].state === 'queen') {
        queens.push({ row, col });
      }
    }
  }
  return {
    grid: props.grid,
    gridSize: props.gridSize,
    queens,
  };
});

const availableMoves = computed(() => {
  const moves: { row: number; col: number }[] = [];
  for (let row = 0; row < props.gridSize; row++) {
    for (let col = 0; col < props.gridSize; col++) {
      if (props.grid[row][col].state === 'empty') {
        moves.push({ row, col });
      }
    }
  }
  return moves;
});

const lastThreeMoves = computed(() => {
  return props.moveHistory.slice(-3).reverse();
});

defineEmits<{
  (e: 'make-move', row: number, col: number): void;
}>();
</script>
