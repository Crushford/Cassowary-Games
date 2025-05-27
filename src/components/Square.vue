<template>
  <div
    class="w-12 h-12 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
    :class="squareClasses"
    @click="handleClick"
  >
    <span v-if="squareMark === 'queen'" class="text-xl text-white">♛</span>
    <span v-else-if="squareMark === 'flag'" class="text-sm text-yellow-400">🚩</span>
    <span v-else-if="squareMark === 'invalid'" class="text-xl text-red-500">⚠️</span>
    <span v-else class="text-transparent">.</span>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import { computed } from 'vue';
import type { SquareProps } from '../types/types';

const props = defineProps<SquareProps>();

const gameStore = useGameStore();

const squareMark = computed(() => {
  if (props.mode === 'solution') {
    return gameStore.puzzleGrid.solution.some((q) => q.row === props.row && q.col === props.col)
      ? 'queen'
      : 'empty';
  }
  return gameStore.grid[props.row][props.col].playerMark;
});

const groupColor = computed(() => {
  return gameStore.grid[props.row][props.col].groupColor;
});

const squareClasses = computed(() => {
  const hasGroupColor = !!groupColor.value;
  const mark = squareMark.value;

  // Apply background color based on group
  if (hasGroupColor) {
    return {
      [`bg-group-${groupColor.value}-700`]: true,
    };
  }

  // Apply border colors based on state
  return {
    'border-primary': mark === 'flag',
    'border-secondary': mark === 'queen' || mark === 'invalid',
  };
});

const handleClick = () => {
  if (props.mode === 'player') {
    if (gameStore.colorToolActive && gameStore.colorToolSelectedColor) {
      gameStore.setSquareColor(props.row, props.col, gameStore.colorToolSelectedColor);
    } else {
      gameStore.handleSquareClick(props.row, props.col);
    }
  }
};
</script>
