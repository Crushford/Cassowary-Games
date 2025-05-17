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

    <!-- Main Generation Controls -->
    <div class="flex flex-col gap-4">
      <h3 class="text-base font-medium mb-2 text-slate-300">Generation Steps</h3>

      <!-- Reset Board -->
      <BaseButton @click="handleResetBoard" class="bg-red-600 hover:bg-red-500">
        Reset Queens and Colors
      </BaseButton>

      <!-- Place Queens -->
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <BaseButton
            @click="handlePlaceRandomQueen"
            :disabled="!canPlaceQueens"
            disabledTitle="No valid moves"
            class="bg-blue-600 hover:bg-blue-500 text-sm"
          >
            Place Random Queen
          </BaseButton>
          <BaseButton
            @click="handleGenerateFullSolution"
            :disabled="!canPlaceQueens"
            disabledTitle="Board is full"
            class="bg-blue-600 hover:bg-blue-500 text-sm"
          >
            Place All Queens
          </BaseButton>
        </div>
      </div>

      <!-- Color Assignment -->
      <div class="flex flex-col gap-2">
        <BaseButton
          @click="handleAssignColors"
          :disabled="!hasQueens"
          disabledTitle="Place queens first"
          class="bg-purple-600 hover:bg-purple-500"
        >
          Assign Colors to All Queens
        </BaseButton>
        <div class="flex gap-2">
          <BaseButton
            @click="handleAssignInitialColors"
            :disabled="!hasQueens"
            disabledTitle="Place queens first"
            class="bg-purple-600 hover:bg-purple-500 text-sm"
          >
            Assign Initial Colors to Queens
          </BaseButton>
          <BaseButton
            @click="handleExpandColors"
            :disabled="!hasAnyColors"
            disabledTitle="Assign colors first"
            class="bg-slate-700 hover:bg-slate-600 text-sm"
          >
            Expand Color Groups
          </BaseButton>
          <BaseButton
            @click="handleColorOnePerRow"
            :disabled="!hasAnyColors"
            disabledTitle="Assign colors first"
            class="bg-slate-700 hover:bg-slate-600 text-sm"
          >
            Color One Per Row
          </BaseButton>
        </div>
      </div>

      <!-- Fill Remaining -->
      <BaseButton
        @click="handleFillRemaining"
        :disabled="!hasAnyColors"
        disabledTitle="Assign colors first"
        class="bg-green-600 hover:bg-green-500"
      >
        Fill Remaining Squares
      </BaseButton>

      <!-- Optional Controls -->
      <div class="flex flex-col gap-2 mt-4">
        <h3 class="text-base font-medium mb-2 text-slate-300">Optional Controls</h3>
        <div class="flex gap-2">
          <BaseButton
            @click="handleUndo"
            :disabled="!canUndo"
            disabledTitle="No moves to undo"
            class="bg-slate-700 hover:bg-slate-600"
          >
            Undo Last Step
          </BaseButton>
          <BaseButton
            @click="handleAutoRun"
            :disabled="!canAutoRun"
            disabledTitle="Board is complete"
            class="bg-indigo-600 hover:bg-indigo-500"
          >
            Auto Run All Steps
          </BaseButton>
        </div>
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

function handlePlaceQueens() {
  // This is a placeholder - in a real implementation, you might want to
  // enter a mode where clicking squares places queens
  gameStore.placeRandomQueen();
}

function handlePlaceRandomQueen() {
  gameStore.placeRandomQueen();
}

function handleGenerateFullSolution() {
  gameStore.generateFullSolution();
}

function handleAssignColors() {
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
  // Reset the board first
  handleResetBoard();

  // Then run all steps in sequence
  handleGenerateFullSolution();
  handleAssignColors();
  handleExpandColors();
  handleColorOnePerRow();
  handleFillRemaining();
}

function handleAssignInitialColors() {
  // This will assign initial colors to each queen without expanding
  gameStore.assignColorGroups();
}
</script>
