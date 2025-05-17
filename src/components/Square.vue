<template>
  <div
    class="aspect-square w-full cursor-pointer rounded-lg border-2 transition-colors duration-200"
    :class="squareClasses"
    @click="handleClick"
  >
    <div class="flex h-full items-center justify-center text-2xl">
      <span v-if="squareState === 'flag'">🚩</span>
      <span v-else-if="squareState === 'queen'">👑</span>
      <span v-else-if="squareState === 'invalid'">❌</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import { computed } from 'vue';
import type { SquareProps } from '../types/types';

const props = defineProps<SquareProps>();
const gameStore = useGameStore();

const squareState = computed(() => {
  return gameStore.grid[props.row][props.col].state;
});

const groupColor = computed(() => {
  return gameStore.grid[props.row][props.col].groupColor;
});

const squareClasses = computed(() => {
  const hasGroupColor = !!groupColor.value;
  const state = squareState.value;

  // Apply background color based on group
  if (hasGroupColor) {
    return {
      [`bg-group-${groupColor.value}-700`]: true,
    };
  }

  // Apply border colors based on state
  return {
    'border-primary': state === 'flag',
    'border-secondary': state === 'queen' || state === 'invalid',
  };
});

const handleClick = () => {
  gameStore.handleSquareClick(props.row, props.col);
};
</script>
