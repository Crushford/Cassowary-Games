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
        <div v-for="move in availableMoves" :key="move.index" class="flex items-center gap-2">
          <input
            type="number"
            v-model="move.index"
            class="w-20 rounded bg-background border border-surface px-2 py-1 text-text"
            readonly
          />
          <button
            class="rounded bg-primary px-3 py-1 text-white hover:bg-primary-hover"
            @click="$emit('make-move', move.index)"
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
            <div
              v-for="(square, squareIndex) in move.grid"
              :key="squareIndex"
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
  grid: GridSquare[];
  gridSize: number;
  moveHistory: { grid: GridSquare[] }[];
}

const props = defineProps<Props>();

const gameState = computed(() => ({
  grid: props.grid,
  gridSize: props.gridSize,
  queens: props.grid.reduce((acc, square, index) => {
    if (square.state === 'queen') acc.push(index);
    return acc;
  }, [] as number[]),
}));

const availableMoves = computed(() => {
  return props.grid
    .map((square, index) => ({ square, index }))
    .filter(({ square }) => square.state === 'empty')
    .map(({ index }) => ({ index }));
});

const lastThreeMoves = computed(() => {
  return props.moveHistory.slice(-3).reverse();
});

defineEmits<{
  (e: 'make-move', index: number): void;
}>();
</script>
