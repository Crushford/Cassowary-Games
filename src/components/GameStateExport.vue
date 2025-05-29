<template>
  <div class="relative bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-semibold text-white">Current Game State</h3>
      <button
        @click="copyToClipboard"
        class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
      >
        Copy to Clipboard
      </button>
    </div>
    <pre
      class="font-mono whitespace-pre bg-slate-700 p-4 rounded text-sm overflow-x-auto my-2 text-white leading-relaxed"
      >{{ exportText }}</pre
    >
    <span v-if="copyStatus" class="absolute bottom-2 right-2 text-sm text-green-400">{{
      copyStatus
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const copyStatus = ref('');

// Add new computed property for multiple solutions check
const hasMultipleSolutions = computed(() => {
  // This is a placeholder. In a real implementation, you would run a backtracking solver
  // to count the number of solutions. For now, we'll assume it's false.
  return false;
});

// Update the export text to include solver steps
const exportText = computed(() => {
  const stateText = gameStore.exportGameState();

  // Get solution queens from grid
  const solutionQueens: string[] = [];
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].isSolutionQueen) {
        solutionQueens.push(`(${row},${col})`);
      }
    }
  }

  const solvedQueens = gameStore.queenPositions.map((q) => `(${q.row},${q.col})`).join(', ');

  // Get validation state
  const { queenCountValid, allFilled, colorGroupsValid } = gameStore.validatePuzzle();
  const isSolvable = gameStore.isPuzzleSolvable();

  // Get color group details
  const colorGroups = new Map<string, string[]>();
  const emptySquares: string[] = [];

  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      const color = gameStore.grid[row][col].groupColor;
      if (color) {
        if (!colorGroups.has(color)) {
          colorGroups.set(color, []);
        }
        colorGroups.get(color)!.push(`(${row},${col})`);
      }
      if (gameStore.getPlayerMarking(row, col) === null) {
        emptySquares.push(`(${row},${col})`);
      }
    }
  }

  // Format color groups
  const colorGroupDetails = Array.from(colorGroups.entries())
    .map(([color, squares]) => `${color}: [${squares.join(', ')}]`)
    .join('\n');

  // Count invalid squares
  let invalidCount = 0;
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.getPlayerMarking(row, col) === 'invalid') {
        invalidCount++;
      }
    }
  }

  const additionalInfo = `
Solution Queen Positions: [${solutionQueens.join(', ')}]
Your Solved Queen Positions: [${solvedQueens}]

Current State:
- Flags placed: ${gameStore.countFlags()}
- Invalid squares: ${invalidCount}

- Empty squares: [${emptySquares.join(', ')}]

Validation State:
- Queen count valid: ${queenCountValid}
- All squares filled: ${allFilled}
- Color groups valid: ${colorGroupsValid}
- Is solvable: ${isSolvable}

Color Group Details:
${colorGroupDetails}`;
  return stateText + additionalInfo;
});

// Method to copy text to clipboard
const copyToClipboard = () => {
  navigator.clipboard
    .writeText(exportText.value)
    .then(() => {
      copyStatus.value = 'Copied!';
      setTimeout(() => {
        copyStatus.value = '';
      }, 2000);
    })
    .catch((err) => {
      console.error('Failed to copy text: ', err);
      copyStatus.value = 'Failed to copy';
    });
};
</script>
