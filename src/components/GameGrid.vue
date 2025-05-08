<template>
  <div class="w-full max-w-lg mx-auto p-4">
    <div
      class="grid gap-2"
      :style="{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }"
    >
      <Square
        v-for="index in totalSquares"
        :key="index - 1"
        :row="Math.floor((index - 1) / gridSize)"
        :col="(index - 1) % gridSize"
      />
    </div>
    <div class="mt-4 flex justify-center gap-2 flex-wrap">
      <button
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        @click="$emit('undo')"
      >
        Undo
      </button>
      <button
        class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
        @click="$emit('restart')"
      >
        Restart
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import Square from './Square.vue';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

export interface GridSquare {
  position: { row: number; col: number };
  state: 'empty' | 'queen' | 'flag' | 'invalid';
  groupColor?: string;
  playerMark?: 'queen' | 'flag';
}

const gameStore = useGameStore();
const { grid, gridSize } = storeToRefs(gameStore);

const totalSquares = computed(() => {
  return gridSize.value * gridSize.value;
});

defineEmits<{
  (e: 'undo'): void;
  (e: 'restart'): void;
}>();

defineOptions({
  name: 'GameGrid',
});
</script>
