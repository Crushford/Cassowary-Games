<template>
  <button
    class="aspect-square w-full rounded-lg border-2 transition-colors duration-200 min-h-[40px] relative"
    :class="squareClasses"
    @click="handleClick"
  >
    <!-- Solution mode: only show solution queens -->
    <template v-if="props.mode === 'solution'">
      <span v-if="isSolutionQueen">👑</span>
    </template>

    <!-- Player mode: show player marks (flags, queens, invalid) -->
    <template v-else>
      <span v-if="playerMark === 'flag'" class="text-yellow-400">🚧</span>
      <span v-else-if="playerMark === 'queen'" class="text-white">🍯</span>
      <span v-else-if="playerMark === 'invalid'" class="text-red-500">🐜</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import { computed } from 'vue';

const props = defineProps<{
  row: number;
  col: number;
  mode: 'solution' | 'player';
}>();

const gameStore = useGameStore();

// Get player mark state for player mode
const playerMark = computed(() => {
  return gameStore.getPlayerMarking(props.row, props.col);
});

// Check if this square has a solution queen for solution mode
const isSolutionQueen = computed(() => {
  return gameStore.grid[props.row][props.col].isSolutionQueen;
});

// Get color from the grid
const groupColor = computed(() => {
  return gameStore.grid[props.row][props.col].groupColor;
});

const squareClasses = computed(() => {
  const hasGroupColor = !!groupColor.value;
  const classes = [];

  if (hasGroupColor) {
    classes.push(`bg-group-${groupColor.value}-700`);
  }

  // Add hover state
  classes.push('hover:bg-opacity-80');

  return classes;
});

const handleClick = () => {
  // Only handle clicks in player mode
  if (props.mode === 'player') {
    const currentMark = gameStore.getPlayerMarking(props.row, props.col);

    if (currentMark === null) {
      // First click: place flag
      gameStore.placeFlag(props.row, props.col);
    } else if (currentMark === 'flag') {
      // Second click: try to place queen
      if (gameStore.isValidMove(props.row, props.col)) {
        gameStore.placeQueen(props.row, props.col);
        // If not a solution queen, increment bites
        if (!isSolutionQueen.value) {
          gameStore.bites++;
        }
      } else {
        // Invalid move, mark as invalid
        gameStore.setPlayerMark(props.row, props.col, 'invalid');
      }
    }
  }
};
</script>

<script lang="ts">
export default {
  name: 'Square',
};
</script>
