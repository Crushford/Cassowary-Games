<template>
  <div class="min-h-screen bg-gray-900 p-6 text-gray-100">
    <!-- Validation Toast Message -->
    <div
      v-if="validationMessage"
      class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white font-semibold shadow-lg"
      :class="isValid ? 'bg-green-600' : 'bg-red-600'"
    >
      {{ validationMessage }}
    </div>

    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Sidebar Controls -->
      <aside class="space-y-6 md:col-span-1">
        <h1 class="text-3xl font-bold">Level Builder</h1>

        <!-- Board Controls -->
        <section
          class="flex flex-wrap gap-4 bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg"
        >
          <button
            v-for="btn in boardControls"
            :key="btn.label"
            @click="btn.handler"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-100"
          >
            {{ btn.label }}
          </button>
          <label class="flex items-center gap-2">
            <span>Size:</span>
            <input
              type="number"
              v-model="gridSize"
              min="4"
              max="8"
              @change="handleGridSizeChange"
              class="w-20 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-gray-100"
            />
          </label>
        </section>

        <!-- Solution Controls -->
        <section
          class="flex flex-wrap gap-4 bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg"
        >
          <button
            v-for="btn in solutionControls"
            :key="btn.label"
            @click="btn.handler"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-gray-100"
          >
            {{ btn.label }}
          </button>
        </section>

        <!-- Color Assignment Steps -->
        <section class="bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg">
          <h2 class="font-semibold mb-4">Color Assignment Steps</h2>
          <div class="space-y-3">
            <div v-for="btn in colorAssignmentSteps" :key="btn.label" class="flex flex-col">
              <button
                @click="btn.handler"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-gray-100 text-sm"
              >
                {{ btn.label }}
              </button>
              <span class="text-xs text-gray-400 mt-1">{{ btn.description }}</span>
            </div>
          </div>
        </section>

        <!-- Solver Steps -->
        <section class="bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg">
          <h2 class="font-semibold mb-4">Solver Steps</h2>
          <div class="grid grid-cols-2 gap-4">
            <button
              v-for="btn in solverSteps"
              :key="btn.label"
              @click="btn.handler"
              class="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-gray-100 text-sm"
            >
              {{ btn.label }}
            </button>
          </div>
          <div class="mt-4 flex gap-4">
            <button
              @click="handleCycleSolveSteps"
              class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-100"
            >
              Cycle All
            </button>
            <button
              @click="handleForceChangeColor"
              class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-100"
            >
              Force Color
            </button>
          </div>
        </section>

        <!-- Auto-Puzzle Controls -->
        <section
          class="flex flex-col gap-4 bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg"
        >
          <button
            @click="handleGenerateAndStoreValidPuzzle"
            :disabled="isGenerating"
            :class="[
              'w-full px-6 py-3 rounded-lg text-gray-100 font-medium flex items-center justify-center',
              isGenerating ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400',
            ]"
          >
            <span
              v-if="isGenerating"
              class="inline-block w-4 h-4 mr-2 border-2 border-gray-100 border-t-transparent rounded-full animate-spin"
            ></span>
            {{ isGenerating ? 'Generating…' : 'Generate Valid Puzzle' }}
          </button>
          <button
            v-if="hasColorGroups"
            @click="handleSavePuzzle"
            class="w-full px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-gray-100 font-medium"
          >
            Save to Local Storage
          </button>
          <div
            v-if="savedMessage"
            class="mt-2 p-2 bg-green-100 text-green-700 rounded text-center text-sm"
          >
            {{ savedMessage }}
          </div>
        </section>
      </aside>

      <!-- Main Content -->
      <main class="space-y-6 md:col-span-2">
        <GameGrid
          :grid="gameStore.grid"
          :grid-size="gridSize"
          @undo="gameStore.handleUndo"
          @restart="gameStore.clearQueensAndFlags"
        />

        <!-- Status Message -->
        <div
          v-if="gameStore.errorMessage"
          class="p-4 bg-red-500/20 border border-red-500 text-red-300 rounded-lg"
        >
          {{ gameStore.errorMessage }}
        </div>

        <!-- Logs -->
        <section
          v-if="gameStore.testLogs && gameStore.testLogs.length"
          class="bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg max-h-64 overflow-auto"
        >
          <h3 class="font-semibold mb-4">Logs</h3>
          <ul class="list-disc list-inside text-sm space-y-2">
            <li v-for="(log, i) in gameStore.testLogs" :key="i">{{ log }}</li>
          </ul>
        </section>

        <!-- Debug Logs -->
        <section
          v-if="gameStore.testDebugLogs && gameStore.testDebugLogs.length"
          class="bg-gray-800 border border-gray-700 shadow-sm p-4 rounded-lg"
        >
          <h3 class="font-semibold mb-4">Debug Logs</h3>
          <div
            v-for="(debug, idx) in gameStore.testDebugLogs"
            :key="idx"
            class="mb-4 border-b border-gray-700 pb-4"
          >
            <div class="mb-2 text-sm">
              <strong>Action:</strong> {{ debug.action }} at ({{ debug.position.row }},{{
                debug.position.col
              }}) in color '{{ debug.color }}'<br />
              <strong>Reason:</strong> {{ debug.reason }}
            </div>
            <div class="flex flex-col md:flex-row gap-4">
              <div class="w-full md:w-1/2">
                <div class="font-bold text-xs mb-1">Before:</div>
                <pre class="bg-gray-950 p-2 rounded text-xs overflow-x-auto">{{
                  debug.before
                }}</pre>
              </div>
              <div class="w-full md:w-1/2">
                <div class="font-bold text-xs mb-1">After:</div>
                <pre class="bg-gray-950 p-2 rounded text-xs overflow-x-auto">{{ debug.after }}</pre>
              </div>
            </div>
            <button
              class="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
              @click="copyDebugLog(debug)"
            >
              Copy Debug Info
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const gridSize = ref(gameStore.gridSize);
const savedMessage = ref('');
const isGenerating = ref(false);
const validationMessage = ref('');
const isValid = ref(false);

// Button group definitions
const boardControls = [
  { label: 'Undo', handler: () => gameStore.handleUndo() },
  { label: 'Restart', handler: () => gameStore.clearQueensAndFlags() },
];

const solutionControls = [
  {
    label: 'Generate Solution',
    handler: () => {
      gameStore.generateFullSolution();
    },
  },
  {
    label: 'Validate Puzzle',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Puzzle Validation Results:');

      // Clear any previous logs to ensure clean validation output
      gameStore.testLogs = ['Puzzle Validation Results:'];

      // Call validatePuzzle to get the boolean result
      const isValidPuzzle = gameStore.validatePuzzle();

      // We need to manually check for these conditions since validatePuzzle only returns a boolean
      const queenCountValid = gameStore.queenPositions.length === gameStore.gridSize;
      const allFilled = gameStore.countEmptySquares() === 0;

      // Check color groups by looking at each color
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

      gameStore.testLogs.push(
        `- Queens: ${gameStore.queenPositions.length}/${gameStore.gridSize} (valid: ${queenCountValid})`
      );
      gameStore.testLogs.push(`- All filled: ${allFilled}`);
      gameStore.testLogs.push(`- Color groups valid: ${colorGroupsValid}`);

      isValid.value = queenCountValid && allFilled && colorGroupsValid;
      validationMessage.value = isValid.value ? '✅ VALID PUZZLE' : '❌ INVALID PUZZLE';
      gameStore.testLogs.push(`Overall validation: ${isValid.value ? '✅ VALID' : '❌ INVALID'}`);

      // Clear the validation message after a few seconds
      setTimeout(() => {
        validationMessage.value = '';
      }, 4000);
    },
  },
];

// New section for color assignment steps
const colorAssignmentSteps = [
  {
    label: '1. Reset Colors',
    description: 'Clear all color groups from the grid',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 1: Resetting all color groups');

      // Create a deep copy of the grid and reset colors
      const newGrid = gameStore.grid.map((row) =>
        row.map((square) => ({ ...square, groupColor: undefined }))
      );
      gameStore.grid = newGrid;
    },
  },
  {
    label: '2. Color Queens',
    description: 'Assign unique colors to each queen',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 2: Assigning colors to queens');

      // Assign colors to queens (first part of assignColors)
      const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
      gameStore.queenPositions.forEach(({ row, col }) => {
        gameStore.grid[row][col].groupColor = palette.pop();
      });
    },
  },
  {
    label: '3. Grow Color Groups',
    description: 'Add one square to each color group',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 3: Adding one square to each color group');
      gameStore.addOneColorToEachGroup();
    },
  },
  {
    label: '4. Fill Rows',
    description: 'Add one color to each row with uncolored squares',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 4: Adding one color to each row');

      // Process all rows
      for (let row = 0; row < gameStore.gridSize; row++) {
        gameStore.addOneColorToEachRow(row);
      }
    },
  },
  {
    label: '4a. Fill Single Row',
    description: 'Add one color to the first row with uncolored squares',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];

      // Find first row with uncolored squares
      for (let row = 0; row < gameStore.gridSize; row++) {
        const hasUncoloredSquares = gameStore.grid[row].some((square) => !square.groupColor);
        if (hasUncoloredSquares) {
          gameStore.testLogs.push(`Adding one color to row ${row}`);
          gameStore.addOneColorToEachRow(row);
          break;
        }
      }
    },
  },
  {
    label: '5. Full Color Assignment',
    description:
      'Run the complete color assignment process (resets all colors, assigns unique colors to queens, adds one to each color group, then systematically fills rows until all squares are colored)',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 5: Running full color assignment');
      gameStore.assignColorGroups();
    },
  },
];

const solverSteps = [
  {
    label: 'Step 0: Clear',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 0: Clearing all queens and flags');
      gameStore.clearQueensAndFlags();
    },
  },
  {
    label: 'Step 1',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push(
        'Step 1: Place queens in last free squares of color blocks, rows, or columns.'
      );
      gameStore.testStep1PlaceLastFreeQueens();
    },
  },
  {
    label: 'Step 2',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push(
        'Step 2: Place flags where a queen would block all remaining squares in a color.'
      );
      gameStore.testStep2FlagBlockingSquares();
    },
  },
  {
    label: 'Step 3',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 3: Constrained Row Elimination');
      gameStore.testConstrainedRowElimination();
    },
  },
  {
    label: 'Step 4',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push('Step 4: Constrained Column Elimination');
      gameStore.testConstrainedColumnElimination();
    },
  },
  {
    label: 'Step 5',
    handler: () => {
      if (!gameStore.testLogs.length) gameStore.testLogs = [];
      gameStore.testLogs.push(
        'Step 5: Flag squares where a queen would block all remaining free squares in any row or column.'
      );
      gameStore.testStep5BlockRowsAndColumns();
    },
  },
];

// Computed flags
const hasColorGroups = computed(() => {
  for (let row = 0; row < gameStore.gridSize; row++) {
    for (let col = 0; col < gameStore.gridSize; col++) {
      if (gameStore.grid[row][col].groupColor) {
        return true;
      }
    }
  }
  return false;
});

// Handlers
function handleGridSizeChange() {
  gameStore.setGridSize(gridSize.value);
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

function handleForceChangeColor() {
  gameStore.forceChangeColor();
}

function handleGenerateAndStoreValidPuzzle() {
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
    setTimeout(() => {
      savedMessage.value = '';
    }, 3000);
  }
}

// Copy debug log to clipboard
function copyDebugLog(debug: any) {
  const text = `Action: ${debug.action} at (${debug.position.row},${debug.position.col}) in color '${debug.color}'\nReason: ${debug.reason}\n\nBefore:\n${debug.before}\n\nAfter:\n${debug.after}`;
  navigator.clipboard.writeText(text);
}
</script>
