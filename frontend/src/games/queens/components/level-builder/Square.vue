<template>
  <button
    class="aspect-square w-full rounded-lg border-2 transition-colors duration-200 min-h-[40px] select-none"
    :class="squareClasses"
    @click="props.mode === 'player' && levelStore.handleSquareClick(row, col)"
  >
    <!-- Solution mode: only show solution queens -->
    <template v-if="props.mode === 'solution'">
      <span v-if="isSolutionQueen">👑</span>
    </template>

    <!-- Auto Test mode: show auto test marks -->
    <template v-else-if="props.mode === 'autoTest'">
      <span v-if="autoTestMark === 'flag'" class="text-semantic-warning-400">🚧</span>
      <span v-else-if="autoTestMark === 'queen'" class="text-white">🍯</span>
      <span v-else-if="autoTestMark === 'invalid'" class="text-semantic-danger-500">🐜</span>
    </template>

    <!-- Player mode: show player marks (flags, queens, invalid) -->
    <template v-else>
      <span v-if="playerMark === 'flag'" class="text-semantic-warning-400">🚧</span>
      <span v-else-if="playerMark === 'queen'" class="text-white">🍯</span>
      <span v-else-if="playerMark === 'invalid'" class="text-semantic-danger-500">🐜</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';
import { computed } from 'vue';

const props = defineProps<{
  row: number;
  col: number;
  mode: 'solution' | 'player' | 'autoTest';
}>();

const levelStore = useLevelBuilderStore();

// Get player mark state for player mode
const playerMark = computed(() => {
  return levelStore.getPlayerMarking(props.row, props.col);
});

// Get auto test mark state for auto test mode
const autoTestMark = computed(() => {
  return levelStore.getAutoTestMarking(props.row, props.col);
});

// Check if this square has a solution queen for solution mode
const isSolutionQueen = computed(() => {
  return levelStore.grid[props.row][props.col].isSolutionQueen;
});

// Get color from the grid
const groupColor = computed(() => {
  return levelStore.grid[props.row][props.col].groupColor;
});

const squareClasses = computed(() => {
  const hasGroupColor = !!groupColor.value;
  const classes = [];

  if (hasGroupColor) {
    classes.push(`bg-group-${groupColor.value}-base`);
  }

  // Add hover state
  classes.push('hover:bg-opacity-80');

  return classes;
});
</script>

<script lang="ts">
export default {
  name: 'LevelBuilderSquare',
};
</script>
