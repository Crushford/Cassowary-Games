<template>
  <div>
    <h3 class="font-semibold mb-4 text-white">Current Game State</h3>
    <pre
      class="font-mono whitespace-pre bg-slate-700 p-4 rounded text-sm overflow-x-auto my-2 text-white leading-relaxed"
      >{{ exportText }}</pre
    >
    <button
      @click="copyToClipboard"
      class="px-4 py-2 bg-indigo-600 text-white border-none rounded cursor-pointer font-medium transition hover:bg-indigo-500"
    >
      Copy to Clipboard
    </button>
    <span v-if="copyStatus" class="ml-2 text-sm text-green-400">{{ copyStatus }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

// Add new computed property for multiple solutions check
const hasMultipleSolutions = computed(() => {
  // This is a placeholder. In a real implementation, you would run a backtracking solver
  // to count the number of solutions. For now, we'll assume it's false.
  return false;
});

// Update the export text to include solver steps
const exportText = computed(() => {
  const stateText = gameStore.exportGameState();
  const originalQueens = gameStore.puzzleGrid.solution.map((q) => `(${q.row},${q.col})`).join(', ');
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
      if (gameStore.grid[row][col].state === 'empty') {
        emptySquares.push(`(${row},${col})`);
      }
    }
  }

  // Format color groups
  const colorGroupDetails = Array.from(colorGroups.entries())
    .map(([color, squares]) => `${color}: [${squares.join(', ')}]`)
    .join('\n');

  const additionalInfo = `
Original Queen Positions: [${originalQueens}]
Your Solved Queen Positions: [${solvedQueens}]

Current State:
- Flags placed: ${gameStore.countFlags()}
- Invalid squares: ${gameStore.playerGrid.invalid.length}
- Available moves: ${gameStore.availableMoves.length}
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
      // Show a success message
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

// Status message for copy operation
const copyStatus = ref('');
</script>
