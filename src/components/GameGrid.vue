<template>
  <div class="w-full max-w-lg mx-auto p-4">
    <div
      class="grid gap-2"
      :style="{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }"
    >
      <Square
        v-for="(square, index) in grid"
        :key="index"
        :square-state="square.state"
        :group-color="square.groupColor"
        @click="handleSquareClick(index)"
      />
    </div>
    <div class="mt-4 flex justify-center gap-2">
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
        class="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover"
        @click="handlePlaceRandomQueen"
      >
        Place Random Queen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import Square from './Square.vue';
import { storeToRefs } from 'pinia';

export interface GridSquare {
  state: 'empty' | 'flag' | 'queen' | 'invalid';
  groupColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
}

const gameStore = useGameStore();
const { grid, gridSize } = storeToRefs(gameStore);

defineEmits<{
  (e: 'undo'): void;
  (e: 'restart'): void;
}>();

const handleSquareClick = (index: number) => {
  const currentState = grid.value[index].state;

  if (currentState === 'empty') {
    gameStore.placeFlag(index);
  } else if (currentState === 'flag') {
    gameStore.placeQueen(index);
  }
};

const handlePlaceRandomQueen = () => {
  gameStore.placeRandomQueen();
};

defineOptions({
  name: 'GameGrid',
});
</script>
