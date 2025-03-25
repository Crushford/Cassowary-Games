<template>
  <div
    class="aspect-square w-full cursor-pointer rounded-lg border-2 transition-colors duration-200"
    :class="[
      squareState === 'empty' && !groupColor && 'border-surface',
      squareState === 'flag' && 'border-primary',
      squareState === 'queen' && !groupColor && 'border-secondary',
      squareState === 'invalid' && 'border-secondary',
      groupColor && squareState === 'queen' && `bg-group-${groupColor}-900`,
      groupColor && squareState !== 'queen' && `bg-group-${groupColor}-700`,
    ]"
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

interface SquareProps {
  row: number;
  col: number;
}

const props = defineProps<SquareProps>();
const gameStore = useGameStore();

const squareState = computed(() => {
  return gameStore.grid[props.row][props.col].state;
});

const groupColor = computed(() => {
  return gameStore.grid[props.row][props.col].groupColor;
});

const handleClick = () => {
  gameStore.handleSquareClick(props.row, props.col);
};
</script>
