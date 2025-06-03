<template>
  <aside class="bg-slate-800 p-4 rounded-lg flex flex-col gap-4">
    <h2 class="text-2xl font-semibold text-white">Puzzle Generation Controls</h2>

    <!-- Grid Size Control -->
    <div class="flex items-center gap-4 text-white">
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
    </div>

    <!-- Main Run All Steps Button -->
    <div class="flex flex-col gap-2">
      <BaseButton
        @click="handleRunAllSteps"
        class="bg-indigo-600 hover:bg-indigo-500 text-lg font-medium"
      >
        ▶️ Run All Steps (Generate Full Puzzle)
      </BaseButton>

      <!-- New Step-Solvable Puzzle Button -->
      <BaseButton
        @click="handleGenerateStepSolvablePuzzle"
        :disabled="isGenerating"
        class="bg-emerald-600 hover:bg-emerald-500 text-lg font-medium"
      >
        <span
          v-if="isGenerating"
          class="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"
        ></span>
        {{ isGenerating ? 'Generating...' : '🎯 Generate Step-Solvable Puzzle' }}
      </BaseButton>
    </div>

    <!-- Step-by-Step Controls in Accordion -->
    <Accordion title="Step-by-Step Controls" :defaultOpen="true">
      <!-- Step 1: Reset Board -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 0: Reset Board</span>
        <BaseButton
          @click="gameStore.clearQueensAndFlags()"
          :disabled="!gameStore.queenPositions.length"
          class="bg-red-950 hover:bg-red-900"
        >
          Clear Queens & Colors
        </BaseButton>
      </div>

      <!-- Step 2: Place Queens -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 1: Place Queens</span>
        <div class="flex gap-2">
          <BaseButton
            @click="gameStore.placeRandomQueen()"
            :disabled="!canPlaceQueens"
            disabledTitle="No valid moves"
            class="bg-blue-950 hover:bg-blue-900 text-sm"
          >
            Place Random Queen
          </BaseButton>
          <BaseButton
            @click="gameStore.placeAllQueens()"
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
        <span class="text-sm text-slate-400">Step 2: Color Each Queen</span>
        <BaseButton
          @click="gameStore.assignInitialColorsToQueens()"
          :disabled="!hasQueens"
          disabledTitle="Place queens first"
          class="bg-purple-950 hover:bg-purple-900"
        >
          Assign Initial Colors to Queens
        </BaseButton>
      </div>

      <!-- Step 4: Expand Color Groups -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 3: Expand Color Groups</span>
        <BaseButton
          @click="gameStore.expandColorGroups()"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
          class="bg-teal-950 hover:bg-teal-900"
        >
          Expand Color Groups
        </BaseButton>
      </div>

      <!-- Step 5: Color One Per Row -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 4: Color One Square Per Row</span>
        <BaseButton
          @click="gameStore.addColorOnePerRow()"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
          class="bg-emerald-950 hover:bg-emerald-900"
        >
          Color One Square Per Row
        </BaseButton>
      </div>

      <!-- Step 6: Fill Remaining -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 5: Fill Remaining</span>
        <BaseButton
          @click="gameStore.fillRemainingSingleSquares()"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
          class="bg-cyan-950 hover:bg-cyan-900"
        >
          Fill Remaining Squares
        </BaseButton>
      </div>
    </Accordion>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
const Accordion = defineAsyncComponent(() => import('./Accordion.vue'));
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

const hasCompletedGame = computed(() => {
  return (
    gameStore.queenPositions.length === gameStore.gridSize && gameStore.countEmptySquares() === 0
  );
});

const canPlaceQueens = computed(() => {
  return gameStore.queenPositions.length < gameStore.gridSize;
});

// Add new state for generation
const isGenerating = ref(false);

// Methods
function handleGridSizeChange() {
  gameStore.setGridSize(gridSize.value);
}

function handleRunAllSteps() {
  try {
    // Clear any existing error messages and debug logs
    gameStore.setError(null);

    gameStore.addDebugLog('=== Starting Run All Steps ===');

    // Reset everything first
    gameStore.addDebugLog('Step 1: Initializing grid and clearing markers');
    gameStore.initializeGrid();
    gameStore.clearQueensAndFlags();

    // Place all queens
    gameStore.addDebugLog('Step 2: Placing all queens');
    gameStore.placeAllQueens();

    if (gameStore.queenPositions.length !== gameStore.gridSize) {
      const errorMsg = `Failed to generate queen positions: ${gameStore.queenPositions.length}/${gameStore.gridSize} queens placed`;
      gameStore.addDebugLog(`❌ ${errorMsg}`);
      gameStore.setError(errorMsg);
      return;
    }
    gameStore.addDebugLog(`✅ Generated ${gameStore.queenPositions.length} queens`);

    // Assign initial colors to queens
    gameStore.addDebugLog('Step 3: Assigning initial colors to queens');
    gameStore.assignInitialColorsToQueens();

    // Expand color groups
    gameStore.addDebugLog('Step 4: Expanding color groups');
    gameStore.expandColorGroups();

    // Color one square per row
    gameStore.addDebugLog('Step 5: Coloring one square per row');
    gameStore.addColorOnePerRow();

    // Fill remaining squares
    gameStore.addDebugLog('Step 6: Filling remaining squares');
    gameStore.fillRemainingSingleSquares();

    gameStore.addDebugLog('=== Run All Steps Complete ===');
  } catch (error) {
    console.error('Error in handleRunAllSteps:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const fullErrorMsg = `An error occurred while generating the puzzle: ${errorMessage}`;

    gameStore.addDebugLog(`❌ CRITICAL ERROR: ${errorMessage}`);
    gameStore.addDebugLog(
      `Stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`
    );
    gameStore.setError(fullErrorMsg);
  }
}

// Add new handler
async function handleGenerateStepSolvablePuzzle() {
  if (isGenerating.value) return;

  isGenerating.value = true;
  try {
    const puzzleName = await gameStore.generateAndValidatePuzzleWithSteps();
    if (puzzleName) {
      gameStore.setError(null);
    } else {
      gameStore.setError('Failed to generate a step-solvable puzzle');
    }
  } catch (error) {
    console.error('Error generating step-solvable puzzle:', error);
    gameStore.setError('An error occurred while generating the puzzle');
  } finally {
    isGenerating.value = false;
  }
}
</script>
