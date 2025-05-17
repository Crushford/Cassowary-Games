<template>
  <div class="flex flex-col gap-6 p-4 bg-slate-800 rounded-lg">
    <!-- Title -->
    <h2 class="text-2xl font-semibold text-white">Puzzle Solving & Validation</h2>

    <!-- Reset Button at Top -->
    <BaseButton @click="handleResetBoard" class="bg-red-800 hover:bg-red-700 text-lg font-medium">
      🔄 Reset Board for Solving
    </BaseButton>

    <!-- Solve Puzzle Button -->
    <BaseButton
      @click="handleRunAllSteps"
      class="bg-indigo-600 hover:bg-indigo-500 text-lg font-medium"
    >
      ▶️ Solve Puzzle (Run All Steps)
    </BaseButton>

    <!-- Collapsible Step-by-Step Controls -->
    <Accordion title="Step-by-Step Controls">
      <div class="flex flex-col gap-2">
        <BaseButton
          @click="handlePlaceLastFreeQueens"
          :disabled="!canRunSteps"
          disabledTitle="Place queens first"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 1: Place Last Free Queens
        </BaseButton>
        <BaseButton
          @click="handleFlagBlockingSquares"
          :disabled="!canRunSteps"
          disabledTitle="Place queens first"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 2: Flag Blocking Squares
        </BaseButton>
        <BaseButton
          @click="handleEliminateConstrainedRows"
          :disabled="!canRunSteps"
          disabledTitle="Place queens first"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 3: Eliminate Constrained Rows
        </BaseButton>
        <BaseButton
          @click="handleEliminateConstrainedColumns"
          :disabled="!canRunSteps"
          disabledTitle="Place queens first"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 4: Eliminate Constrained Columns
        </BaseButton>
        <BaseButton
          @click="handleBlockRowsAndColumns"
          :disabled="!canRunSteps"
          disabledTitle="Place queens first"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 5: Block Rows & Columns
        </BaseButton>
      </div>
    </Accordion>

    <!-- Validation Results -->
    <div class="flex flex-col gap-2 p-4 bg-slate-700 rounded-lg">
      <h3 class="text-lg font-medium text-white mb-2">Validation Results</h3>
      <div class="flex items-center gap-2">
        <span :class="checkmarkClass(isSolvable)">{{ isSolvable ? '✅' : '❌' }}</span>
        <span class="text-white">Puzzle is solvable</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="checkmarkClass(colorsConnected)">{{ colorsConnected ? '✅' : '❌' }}</span>
        <span class="text-white">All colors connected</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="checkmarkClass(noSingletons)">{{ noSingletons ? '✅' : '❌' }}</span>
        <span class="text-white">No singleton color groups</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="checkmarkClass(allFilled)">{{ allFilled ? '✅' : '❌' }}</span>
        <span class="text-white">All squares filled</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="checkmarkClass(correctQueens)">{{ correctQueens ? '✅' : '❌' }}</span>
        <span class="text-white">Correct number of queens</span>
      </div>
    </div>

    <!-- Debug Logs -->
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-medium text-white">Debug Logs</h3>
        <BaseButton @click="clearLogs" class="bg-slate-700 hover:bg-slate-600 text-sm">
          Clear Logs
        </BaseButton>
      </div>
      <div class="bg-slate-900 p-4 rounded-lg max-h-48 overflow-auto">
        <pre class="text-sm text-white whitespace-pre-wrap">{{ logs }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import { useGameStore } from '../stores/gameStore';

const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
const Accordion = defineAsyncComponent(() => import('./Accordion.vue'));

const gameStore = useGameStore();

// Computed properties for validation states
const isSolvable = computed(() => {
  const { queenCountValid, allFilled, colorGroupsValid } = gameStore.validatePuzzle();
  return queenCountValid && allFilled && colorGroupsValid;
});

const colorsConnected = computed(() => {
  const colors = new Set<string>();
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      const color = gameStore.grid[row][col].groupColor;
      if (color) colors.add(color);
    }
  }
  return Array.from(colors).every((color) => gameStore.isColorConnected(color));
});

const noSingletons = computed(() => {
  const colorGroups: Record<string, number> = {};
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      const color = gameStore.grid[row][col].groupColor;
      if (color) {
        colorGroups[color] = (colorGroups[color] || 0) + 1;
      }
    }
  }
  return Object.values(colorGroups).every((count) => count > 1);
});

const allFilled = computed(() => {
  return gameStore.countEmptySquares() === 0;
});

const correctQueens = computed(() => {
  return gameStore.queenPositions.length === gameStore.gridSize;
});

const canRunSteps = computed(() => {
  return gameStore.queenPositions.length > 0;
});

// Computed property for logs
const logs = computed(() => {
  return gameStore.testLogs.join('\n');
});

// Helper function for checkmark styling
const checkmarkClass = (isValid: boolean) => {
  return isValid ? 'text-green-500' : 'text-red-500';
};

// Methods
function handleRunAllSteps() {
  gameStore.runAllSolverSteps();
}

function handlePlaceLastFreeQueens() {
  gameStore.placeLastFreeQueens();
}

function handleFlagBlockingSquares() {
  gameStore.flagBlockingSquares();
}

function handleEliminateConstrainedRows() {
  gameStore.eliminateConstrainedRows();
}

function handleEliminateConstrainedColumns() {
  gameStore.eliminateConstrainedColumns();
}

function handleBlockRowsAndColumns() {
  gameStore.blockRowsAndColumns();
}

function handleResetBoard() {
  // Only clear queens and flags, preserve colors
  gameStore.clearQueensAndFlags();
}

function clearLogs() {
  gameStore.testLogs = [];
}
</script>
