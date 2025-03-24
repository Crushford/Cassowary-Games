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
        @click="$emit('square-click', index)"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import Square from './Square.vue';

export interface GridSquare {
  state: 'empty' | 'flag' | 'queen' | 'invalid';
  groupColor?: string;
}

interface Props {
  grid: GridSquare[];
  gridSize: number;
}

const props = defineProps<Props>();
defineEmits<{
  (e: 'square-click', index: number): void;
  (e: 'undo'): void;
  (e: 'restart'): void;
}>();

defineOptions({
  name: 'GameGrid',
});
</script>
