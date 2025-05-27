<template>
  <button
    class="aspect-square w-full cursor-pointer rounded-lg border-2 transition-colors duration-200 min-h-[40px] relative"
    :class="squareClasses"
    @click="handleClick"
  >
    <span v-if="renderState.playerMark === 'flag'">🚩</span>
    <span v-else-if="renderState.playerMark === 'queen'">👑</span>
    <span v-else-if="renderState.playerMark === 'invalid'">❌</span>
  </button>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import { computed } from 'vue';

const props = defineProps<{
  row: number;
  col: number;
  mode?: 'player' | 'solution';
}>();

const gameStore = useGameStore();

// Get the render state which includes playerMark and solution info
const renderState = computed(() => {
  return gameStore.getRenderState(props.row, props.col);
});

// Get color from the grid
const groupColor = computed(() => {
  return gameStore.grid[props.row][props.col].groupColor;
});

const squareClasses = computed(() => {
  const hasGroupColor = !!groupColor.value;
  const state = renderState.value;

  return {
    // Color group background
    [`bg-group-${groupColor.value}-700`]: hasGroupColor,

    // State-based borders
    'border-primary': state.playerMark === 'flag',
    'border-secondary': state.playerMark === 'queen' || state.playerMark === 'invalid',

    // Solution feedback
    'bg-green-100': state.isCorrect,
    'bg-red-100': state.isIncorrect,
    'bg-blue-50': state.hasSolutionQueen && state.playerMark === null,
  };
});

const handleClick = () => {
  gameStore.handleSquareClick(props.row, props.col);
};
</script>

<script lang="ts">
export default {
  name: 'Square',
};
</script>
