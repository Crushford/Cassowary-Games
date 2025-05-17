<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-2xl font-semibold mb-2 text-white">Puzzle Generation Controls</h2>

    <!-- Grid Size Control -->
    <div class="flex flex-col gap-4">
      <label class="flex items-center gap-4 text-white">
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

    <!-- Step-by-Step Controls -->
    <div class="flex flex-col gap-4">
      <h3 class="text-base font-medium mb-2 text-slate-300">Step-by-Step Controls</h3>

      <!-- Step 1: Reset Board -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 1: Reset Board</span>
        <BaseButton @click="handleResetBoard" class="bg-red-950 hover:bg-red-900">
          Clear Queens & Colors
        </BaseButton>
      </div>

      <!-- Step 2: Place Queens -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 2: Place Queens</span>
        <div class="flex gap-2">
          <BaseButton
            @click="handlePlaceRandomQueen"
            :disabled="!canPlaceQueens"
            disabledTitle="No valid moves"
            class="bg-blue-950 hover:bg-blue-900 text-sm"
          >
            Place Random Queen
          </BaseButton>
          <BaseButton
            @click="handleGenerateFullSolution"
            :disabled="!canPlaceQueens"
            disabledTitle="Board is full"
            class="bg-blue-950 hover:bg-blue-900 text-sm"
          >
            Place All Queens
          </BaseButton>
        </div>
      </div>

      <!-- Step 3: Color Each Queen -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 3: Color Each Queen</span>
        <BaseButton
          @click="handleAssignInitialColors"
          :disabled="!hasQueens"
          disabledTitle="Place queens first"
          class="bg-purple-950 hover:bg-purple-900"
        >
          Assign Initial Colors to Queens
        </BaseButton>
      </div>

      <!-- Step 4: Expand Color Groups -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 4: Expand Color Groups</span>
        <BaseButton
          @click="handleExpandColors"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
          class="bg-teal-950 hover:bg-teal-900"
        >
          Expand Color Groups
        </BaseButton>
      </div>

      <!-- Step 5: Color One Per Row -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 5: Color One Square Per Row</span>
        <BaseButton
          @click="handleColorOnePerRow"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
          class="bg-emerald-950 hover:bg-emerald-900"
        >
          Color One Square Per Row
        </BaseButton>
      </div>

      <!-- Step 6: Fill Remaining -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 6: Fill Remaining</span>
        <BaseButton
          @click="handleFillRemaining"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
          class="bg-cyan-950 hover:bg-cyan-900"
        >
          Fill Remaining Squares
        </BaseButton>
      </div>
    </div>

    <!-- Run All Steps -->
    <div class="flex flex-col gap-4">
      <h3 class="text-base font-medium mb-2 text-slate-300">Run All Steps</h3>
      <BaseButton
        @click="handleRunAllSteps"
        :disabled="!canAutoRun"
        disabledTitle="Board is complete"
        class="bg-indigo-600 hover:bg-indigo-500 text-lg font-medium"
      >
        ▶️ Run All Steps (Generate Full Puzzle)
      </BaseButton>
    </div>

    <!-- Optional Controls -->
    <div class="flex flex-col gap-4">
      <h3 class="text-base font-medium mb-2 text-slate-300">Optional Controls</h3>
      <div class="flex gap-2">
        <BaseButton
          @click="handleUndo"
          :disabled="!canUndo"
          disabledTitle="No moves to undo"
          class="bg-slate-800 hover:bg-slate-700"
        >
          Undo Last Step
        </BaseButton>
        <BaseButton
          @click="handleAutoRun"
          :disabled="!canAutoRun"
          disabledTitle="Board is complete"
          class="bg-slate-800 hover:bg-slate-700"
        >
          Auto Run All Steps
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

// Reactive state
const gridSize = ref(gameStore.gridSize);

// Computed properties
const hasQueens = computed(() => {
  return gameStore.queenPositions && gameStore.queenPositions.length > 0;
});

const hasAnyColors = computed(() => {
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].groupColor) {
        return true;
      }
    }
  }
  return false;
});

const canUndo = computed(() => {
  return gameStore.moveHistory && gameStore.moveHistory.length > 0;
});

const hasCompletedGame = computed(() => {
  return (
    gameStore.queenPositions.length === gameStore.gridSize && gameStore.countEmptySquares() === 0
  );
});

const canPlaceQueens = computed(() => {
  return gameStore.queenPositions.length < gameStore.gridSize;
});

const canAutoRun = computed(() => {
  return !hasCompletedGame.value;
});

// Methods
function handleGridSizeChange() {
  gameStore.setGridSize(gridSize.value);
}

function handleResetBoard() {
  gameStore.initializeGrid();
  gameStore.clearQueensAndFlags();
}

function handlePlaceRandomQueen() {
  gameStore.placeRandomQueen();
}

function handleGenerateFullSolution() {
  gameStore.generateFullSolution();
}

function handleAssignInitialColors() {
  gameStore.assignColorGroups();
}

function handleExpandColors() {
  gameStore.addOneColorToEachGroup();
}

function handleColorOnePerRow() {
  gameStore.addOneColorToEachRow();
}

function handleFillRemaining() {
  gameStore.fillRemainingSingleSquares();
}

function handleUndo() {
  gameStore.handleUndo();
}

function handleAutoRun() {
  handleRunAllSteps();
}

function handleRunAllSteps() {
  // Reset the board first
  handleResetBoard();

  // Then run all steps in sequence
  handleGenerateFullSolution();
  handleAssignInitialColors();
  handleExpandColors();
  handleColorOnePerRow();
  handleFillRemaining();
}
</script>
