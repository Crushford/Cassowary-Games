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
      <button
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        @click="gameStore.placeRandomQueen()"
      >
        Place Next Queen
      </button>
      <button
        class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
        @click="gameStore.generateFullSolution()"
      >
        Generate Solution
      </button>
    </div>

    <!-- Color Group Controls -->
    <div class="mt-4" v-if="gameStore.isComplete">
      <button
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover w-full"
        @click="gameStore.assignColorGroups()"
      >
        Assign Color Groups
      </button>
      <div class="mt-2 text-sm text-center text-text">
        This will assign color groups to ensure a unique solution.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import Square from './Square.vue';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

export interface GridSquare {
  state: 'empty' | 'flag' | 'queen' | 'invalid';
  groupColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
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
