<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-2xl font-semibold mb-2">Basic Controls</h2>

    <!-- Grid Size Control -->
    <div class="flex flex-col gap-4">
      <label class="flex items-center gap-4">
        <span>Grid Size:</span>
        <input
          type="number"
          v-model="gridSize"
          min="4"
          max="8"
          :disabled="hasCompletedGame"
          @change="handleGridSizeChange"
          class="w-16 p-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
        />
      </label>
    </div>

    <!-- Basic Game Controls -->
    <div class="flex flex-col gap-4">
      <h3 class="text-base font-medium mb-2 text-slate-300">Game Controls</h3>
      <div class="flex gap-4">
        <BaseButton @click="handleUndo" :disabled="!canUndo" disabledTitle="No moves to undo">
          Undo
        </BaseButton>

        <BaseButton @click="handleRestart"> Restart </BaseButton>
      </div>
    </div>

    <!-- Validation -->
    <div class="flex flex-col gap-4">
      <h3 class="text-base font-medium mb-2 text-slate-300">Validation</h3>
      <BaseButton
        @click="validatePuzzle"
        :disabled="!hasQueens"
        disabledTitle="Place queens first"
        class="bg-emerald-600 hover:bg-emerald-500 w-full"
      >
        Validate Puzzle
      </BaseButton>

      <div v-if="validationResults.length" class="mt-4 p-4 rounded-lg bg-slate-700">
        <div
          class="font-semibold text-base mb-4 text-center"
          :class="{ 'text-emerald-500': isValidPuzzle, 'text-red-500': !isValidPuzzle }"
        >
          {{ isValidPuzzle ? '✓ Valid Puzzle' : '✗ Invalid Puzzle' }}
        </div>
        <div class="text-sm text-slate-300">
          <div v-for="(result, index) in validationResults" :key="index">
            {{ result }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseButton from './BaseButton.vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

// Reactive state
const gridSize = ref(gameStore.gridSize);
const validationResults = ref<string[]>([]);
const isValidPuzzle = ref(false);

// Computed properties
const canUndo = computed(() => {
  return gameStore.moveHistory && gameStore.moveHistory.length > 0;
});

const hasQueens = computed(() => {
  return gameStore.queenPositions && gameStore.queenPositions.length > 0;
});

const hasCompletedGame = computed(() => {
  return (
    gameStore.queenPositions.length === gameStore.gridSize && gameStore.countEmptySquares() === 0
  );
});

// Methods
function handleGridSizeChange() {
  gameStore.setGridSize(gridSize.value);
}

function handleUndo() {
  gameStore.handleUndo();
}

function handleRestart() {
  gameStore.clearQueensAndFlags();
  validationResults.value = [];
}

function validatePuzzle() {
  // Clear previous validation results
  validationResults.value = [];

  // Perform validation checks
  const queenCountValid = gameStore.queenPositions.length === gameStore.gridSize;
  const allFilled = gameStore.countEmptySquares() === 0;

  // Check color groups
  let colorGroupsValid = true;
  const colorCounts = new Map();

  // Count queens per color
  for (const { row, col } of gameStore.queenPositions) {
    const color = gameStore.grid[row][col].groupColor;
    if (color) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // Verify each color has exactly one queen
  colorCounts.forEach((count) => {
    if (count !== 1) colorGroupsValid = false;
  });

  // Add validation results
  validationResults.value.push(
    `Queens: ${gameStore.queenPositions.length}/${gameStore.gridSize} (${queenCountValid ? '✓' : '✗'})`
  );
  validationResults.value.push(`All squares filled: ${allFilled ? '✓' : '✗'}`);
  validationResults.value.push(`Color groups valid: ${colorGroupsValid ? '✓' : '✗'}`);

  // Overall validation result
  isValidPuzzle.value = queenCountValid && allFilled && colorGroupsValid;

  // Log validation results to game store logs
  if (gameStore.testLogs) {
    gameStore.testLogs.push('Puzzle Validation Results:');
    validationResults.value.forEach((result) => {
      gameStore.testLogs.push(`- ${result}`);
    });
    gameStore.testLogs.push(`Overall validation: ${isValidPuzzle.value ? '✓ VALID' : '✗ INVALID'}`);
  }
}

// Watch for grid changes and reset validation
watch(
  () => gameStore.grid,
  () => {
    if (validationResults.value.length > 0) {
      validationResults.value = [];
    }
  },
  { deep: true }
);
</script>
