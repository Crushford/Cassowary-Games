<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-2xl font-semibold mb-2">Advanced Controls</h2>

    <Accordion title="Solution Generation" :defaultOpen="true">
      <div class="flex flex-col gap-3">
        <BaseButton @click="handleGenerateSolution" class="bg-emerald-600 hover:bg-emerald-500">
          Generate Solution
        </BaseButton>
        <p class="text-xs text-slate-400 -mt-2 mb-2">Create a complete valid solution</p>
      </div>
    </Accordion>

    <Accordion title="Color Assignment">
      <div class="flex flex-col gap-3">
        <BaseButton
          @click="handleFullColorAssignment"
          class="bg-purple-600 hover:bg-purple-500"
          :disabled="!hasQueens"
          disabledTitle="Generate a solution first"
        >
          Full Color Assignment
        </BaseButton>
        <p class="text-xs text-slate-400 -mt-2 mb-2">
          Automatically assign colors to all queens and squares
        </p>

        <BaseButton
          @click="handleFillRemainingSquares"
          class="bg-purple-600 hover:bg-purple-500"
          :disabled="!hasAnyColors"
          disabledTitle="Assign colors first"
        >
          Fill Remaining Squares
        </BaseButton>
        <p class="text-xs text-slate-400 -mt-2 mb-2">
          Add colors to any remaining unfilled squares
        </p>
      </div>
    </Accordion>

    <Accordion title="Puzzle Generation">
      <div class="flex flex-col gap-3">
        <BaseButton
          @click="handleGenerateValidPuzzle"
          :disabled="isGenerating"
          class="flex justify-center items-center bg-blue-500 relative"
        >
          <span
            v-if="isGenerating"
            class="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          {{ isGenerating ? 'Generating...' : 'Generate Valid Puzzle' }}
        </BaseButton>
        <p class="text-xs text-slate-400 -mt-2 mb-2">
          Create a complete, valid puzzle with unique solution
        </p>

        <div v-if="hasColorGroups" class="mt-2">
          <BaseButton @click="handleSavePuzzle" class="bg-emerald-600 hover:bg-emerald-500">
            Save to Storage
          </BaseButton>
          <p class="text-xs text-slate-400 -mt-2 mb-2">Save current puzzle to browser storage</p>
        </div>

        <div
          v-if="savedMessage"
          class="mt-4 p-2 bg-emerald-900/20 border border-emerald-500 text-emerald-500 rounded-lg text-sm text-center"
        >
          {{ savedMessage }}
        </div>
      </div>
    </Accordion>

    <Accordion title="Solver Steps">
      <div class="flex flex-col gap-3">
        <BaseButton
          @click="handleCycleSolveSteps"
          class="bg-amber-500 hover:bg-amber-400 text-black"
        >
          Run All Solver Steps
        </BaseButton>
        <p class="text-xs text-slate-400 -mt-2 mb-2">Execute all solver steps in sequence</p>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <BaseButton
            v-for="(step, index) in solverSteps"
            :key="index"
            @click="step.handler"
            class="text-xs py-1.5 px-2 bg-slate-600 hover:bg-slate-500"
          >
            {{ step.label }}
          </BaseButton>
        </div>
      </div>
    </Accordion>

    <Accordion title="Saved Puzzles">
      <div class="flex flex-col gap-3">
        <div v-if="savedPuzzles.length === 0" class="text-slate-400 text-sm text-center py-4">
          No saved puzzles found
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="puzzle in savedPuzzles"
            :key="puzzle.id"
            class="flex justify-between items-center p-2 bg-slate-700 rounded-lg"
          >
            <div class="flex flex-col">
              <span class="font-medium text-sm">{{ puzzle.name }}</span>
              <span class="text-xs text-slate-400">{{ puzzle.size }}×{{ puzzle.size }}</span>
            </div>

            <div class="flex gap-2">
              <button
                @click="handleLoadPuzzle(puzzle.id)"
                class="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-400 text-white rounded-lg"
              >
                Load
              </button>
              <button
                @click="handleDeletePuzzle(puzzle.id)"
                class="px-2 py-1 text-xs bg-red-500 hover:bg-red-400 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Accordion from './Accordion.vue';
import BaseButton from './BaseButton.vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

// Reactive state
const isGenerating = ref(false);
const savedMessage = ref('');
const savedPuzzles = ref<{ id: string; name: string; size: number }[]>([]);

// Computed values
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

const hasColorGroups = computed(() => {
  return hasAnyColors.value;
});

// Solver steps definition
const solverSteps = [
  {
    label: 'Step 1: Place Queens',
    handler: () => gameStore.testStep1PlaceLastFreeQueens(),
  },
  {
    label: 'Step 2: Flag Blocking',
    handler: () => gameStore.testStep2FlagBlockingSquares(),
  },
  {
    label: 'Step 3: Row Elimination',
    handler: () => gameStore.testConstrainedRowElimination(),
  },
  {
    label: 'Step 4: Column Elimination',
    handler: () => gameStore.testConstrainedColumnElimination(),
  },
  {
    label: 'Step 5: Block R/C',
    handler: () => gameStore.testStep5BlockRowsAndColumns(),
  },
];

// Event handlers
function handleFullColorAssignment() {
  gameStore.assignColorGroups();
}

function handleFillRemainingSquares() {
  gameStore.fillRemainingSingleSquares();
}

function handleGenerateSolution() {
  gameStore.generateFullSolution();
}

function handleCycleSolveSteps() {
  // Start by clearing the board
  if (!gameStore.testLogs.length) gameStore.testLogs = [];
  gameStore.testLogs.push('--- Starting Solver Cycle ---');
  gameStore.testLogs.push('Step 0: Clearing all queens and flags');
  gameStore.clearQueensAndFlags();

  // Then run the normal cycle
  gameStore.testAllStepsLoop();
}

function handleGenerateValidPuzzle() {
  // Don't allow multiple generations
  if (isGenerating.value) return;

  // Set initial UI state
  isGenerating.value = true;
  savedMessage.value = 'Generating puzzle... This may take a moment.';

  // Prepare logs
  if (!gameStore.testLogs || !gameStore.testLogs.length) gameStore.testLogs = [];
  gameStore.testLogs.push('Starting to generate a valid puzzle...');

  // Clear previous errors
  gameStore.setError(null);

  // Run a timeout to make sure isGenerating is reset no matter what
  const resetTimeout = setTimeout(() => {
    isGenerating.value = false;
  }, 15000); // Force reset after 15 seconds max

  try {
    // Generate the puzzle (this is synchronous but can be slow)
    const puzzleName = gameStore.generateAndStoreValidPuzzle();

    // Clear the force-reset timeout since we're done
    clearTimeout(resetTimeout);

    // Reset generating state immediately
    isGenerating.value = false;

    // Show appropriate message
    if (puzzleName) {
      savedMessage.value = `Puzzle saved as "${puzzleName}"`;
      gameStore.testLogs.push(`✅ Generation successful: "${puzzleName}"`);
    } else {
      savedMessage.value = 'Failed to generate a valid puzzle';
      gameStore.testLogs.push('❌ Generation failed');
    }

    // Clear message after delay
    setTimeout(() => {
      savedMessage.value = '';
    }, 5000);
  } catch (error) {
    // Handle any errors
    console.error('Error generating puzzle:', error);
    gameStore.testLogs.push(`❌ Error: ${error.message || 'Unknown error'}`);
    savedMessage.value = 'Error generating puzzle';

    // Clear the timeout and reset state
    clearTimeout(resetTimeout);
    isGenerating.value = false;

    // Clear message after delay
    setTimeout(() => {
      savedMessage.value = '';
    }, 5000);
  }
}

function handleSavePuzzle() {
  const puzzleName = gameStore.savePuzzleToLocalStorage();
  if (puzzleName) {
    savedMessage.value = `Puzzle saved as "${puzzleName}"`;
    loadSavedPuzzles();
    setTimeout(() => {
      savedMessage.value = '';
    }, 3000);
  }
}

function handleLoadPuzzle(id: string) {
  gameStore.loadPuzzle(id);
}

function handleDeletePuzzle(id: string) {
  gameStore.deletePuzzle(id);
  loadSavedPuzzles();
}

// Load saved puzzles from storage
function loadSavedPuzzles() {
  try {
    const storedPuzzles = localStorage.getItem('saved-puzzles');
    if (storedPuzzles) {
      const puzzles = JSON.parse(storedPuzzles);
      savedPuzzles.value = Object.keys(puzzles).map((id) => ({
        id,
        name: puzzles[id].name,
        size: puzzles[id].size,
      }));
    } else {
      savedPuzzles.value = [];
    }
  } catch (error) {
    console.error('Error loading saved puzzles:', error);
    savedPuzzles.value = [];
  }
}

// Load puzzles on mount
onMounted(() => {
  loadSavedPuzzles();
});
</script>
