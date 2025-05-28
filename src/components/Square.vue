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
      <span v-if="playerMark === 'flag'">🚩</span>
      <span v-else-if="playerMark === 'queen'">👑</span>
      <span v-else-if="playerMark === 'invalid'">❌</span>
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
  return gameStore.getSquareState(props.row, props.col);
});

// Check if this square has a solution queen for solution mode
const isSolutionQueen = computed(() => {
  return gameStore.solutionQueenPositions.some((q) => q.row === props.row && q.col === props.col);
});

// Get color from the grid
const groupColor = computed(() => {
  return gameStore.grid[props.row][props.col].groupColor;
});

const squareClasses = computed(() => {
  const hasGroupColor = !!groupColor.value;
  const isPlayerMode = props.mode !== 'solution';

  let classes: Record<string, boolean> = {
    // Color group background
    [`bg-group-${groupColor.value}-700`]: hasGroupColor,

    // Disable pointer events for solution mode
    'pointer-events-none': !isPlayerMode,
    'cursor-pointer': isPlayerMode,
    'cursor-default': !isPlayerMode,
  };

  // Add player-mode specific styling
  if (isPlayerMode) {
    const mark = playerMark.value;
    const hasSolutionQueen = isSolutionQueen.value;

    classes = {
      ...classes,
      // State-based borders
      'border-primary': mark === 'flag',
      'border-secondary': mark === 'queen' || mark === 'invalid',

      // Solution feedback
      'bg-green-100': mark === 'queen' && !!hasSolutionQueen,
      'bg-red-100': mark === 'queen' && !hasSolutionQueen,
      'bg-blue-50': !!hasSolutionQueen && mark === null,
    };
  } else {
    // Solution mode styling - make it visually clear it's read-only
    classes = {
      ...classes,
      'border-slate-600': true,
      'opacity-75': true,
      'bg-slate-700': !hasGroupColor, // fallback background when no color group
    };
  }

  return classes;
});

const handleClick = () => {
  // Only handle clicks in player mode
  if (props.mode === 'player') {
    gameStore.handleSquareClick(props.row, props.col);
  }
};
</script>

<script lang="ts">
export default {
  name: 'Square',
};
</script>
