<template>
  <div class="min-h-screen bg-background p-4">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-text mb-6">Level Builder</h1>

      <div class="mb-6">
        <label class="block text-sm font-medium text-text mb-2">
          Grid Size (squares per row/column)
        </label>
        <div class="flex items-center gap-4">
          <input
            type="number"
            v-model="gridSize"
            min="4"
            max="8"
            class="w-32 rounded-lg border border-surface bg-surface px-3 py-2 text-text"
            @change="handleGridSizeChange"
          />
          <span class="text-text">× {{ gridSize }}</span>
        </div>
      </div>

      <GameGrid
        :grid="gameStore.grid"
        :grid-size="gridSize"
        @undo="handleUndo"
        @restart="handleRestart"
      />

      <div v-if="gameStore.errorMessage" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
        {{ gameStore.errorMessage }}
      </div>

      <div class="mt-6 flex justify-center gap-4 flex-wrap">
        <button
          class="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary-hover"
          @click="handleGenerateSolution"
        >
          Generate Solution
        </button>
        <button
          class="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-700"
          @click="handleClearQueensAndFlags"
        >
          Clear Queens & Flags
        </button>
        <button
          class="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
          @click="handleTestStep1"
        >
          Step 1: Place Last Free Queens
        </button>
        <button
          class="rounded-lg bg-yellow-700 px-4 py-2 text-white hover:bg-yellow-800"
          @click="handleTestStep2"
        >
          Step 2: Flag Blocking Squares
        </button>
        <button
          class="rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800"
          @click="handleTestAllSteps"
        >
          Run All Steps
        </button>
      </div>

      <div
        v-if="gameStore.testLogs && gameStore.testLogs.length"
        class="mt-4 bg-gray-100 p-4 rounded-lg"
      >
        <h3 class="font-bold mb-2">Test Logs</h3>
        <ul class="list-disc pl-5">
          <li v-for="(log, idx) in gameStore.testLogs" :key="idx">{{ log }}</li>
        </ul>
      </div>

      <!-- Step 2 Debug Logs -->
      <div
        v-if="gameStore.testDebugLogs && gameStore.testDebugLogs.length"
        class="mt-4 bg-blue-50 p-4 rounded-lg"
      >
        <h3 class="font-bold mb-2 text-blue-900">Step 2 Debug Logs</h3>
        <div v-for="(debug, idx) in gameStore.testDebugLogs" :key="idx" class="mb-4 border-b pb-4">
          <div class="mb-2 text-sm text-blue-800">
            <strong>Action:</strong> {{ debug.action }} at ({{ debug.position.row }},{{
              debug.position.col
            }}) in color '{{ debug.color }}'<br />
            <strong>Reason:</strong> {{ debug.reason }}
          </div>
          <div class="flex flex-col md:flex-row gap-4">
            <div class="w-full md:w-1/2">
              <div class="font-bold text-xs text-blue-700 mb-1">Before:</div>
              <pre class="bg-white p-2 rounded text-xs overflow-x-auto">{{ debug.before }}</pre>
            </div>
            <div class="w-full md:w-1/2">
              <div class="font-bold text-xs text-blue-700 mb-1">After:</div>
              <pre class="bg-white p-2 rounded text-xs overflow-x-auto">{{ debug.after }}</pre>
            </div>
          </div>
          <button
            class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            @click="copyDebugLog(debug)"
          >
            Copy Debug Info
          </button>
        </div>
      </div>

      <!-- Color Group Controls -->
      <div class="mt-4" v-if="gameStore.isComplete">
        <!-- Save to Local Storage button -->
        <div v-if="hasColorGroups" class="mt-4">
          <button
            class="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-white w-full"
            @click="handleSavePuzzle"
          >
            Save Puzzle to Local Storage
          </button>
          <div
            v-if="savedMessage"
            class="mt-2 p-2 bg-green-100 text-green-700 rounded-lg text-center"
          >
            {{ savedMessage }}
          </div>
        </div>
      </div>
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

// Check if grid has color groups assigned
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

// Save puzzle to local storage
const handleSavePuzzle = () => {
  const puzzleName = gameStore.savePuzzleToLocalStorage();
  if (puzzleName) {
    savedMessage.value = `Puzzle saved as "${puzzleName}"`;
    setTimeout(() => {
      savedMessage.value = '';
    }, 3000);
  }
};

// Handle grid size changes
const handleGridSizeChange = () => {
  gameStore.setGridSize(gridSize.value);
};

// Handle undo
const handleUndo = () => {
  gameStore.handleUndo();
};

// Handle restart
const handleRestart = () => {
  gameStore.handleRestart();
};

// Handle generate solution
const handleGenerateSolution = () => {
  gameStore.generateFullSolution();
  gameStore.assignColorGroups();
};

// Handle assign color groups
const handleAssignColorGroups = () => {
  gameStore.assignColorGroups();
};

// Handle test unique solution (all steps)
const handleTestAllSteps = () => {
  gameStore.testUniqueSolution();
};

// Handle test step 1 only
const handleTestStep1 = () => {
  if (!gameStore.testLogs.length) gameStore.testLogs = [];
  gameStore.testLogs.push(
    'Step 1: Place queens in last free squares of color blocks, rows, or columns.'
  );
  gameStore.testStep1PlaceLastFreeQueens();
};

// Handle test step 2 only
const handleTestStep2 = () => {
  if (!gameStore.testLogs.length) gameStore.testLogs = [];
  gameStore.testLogs.push(
    'Step 2: Place flags where a queen would block all remaining squares in a color.'
  );
  gameStore.testStep2FlagBlockingSquares();
};

// Handle clear queens and flags
const handleClearQueensAndFlags = () => {
  gameStore.clearQueensAndFlags();
  gameStore.testLogs = [];
};

// Copy debug log to clipboard
function copyDebugLog(debug: any) {
  const text = `Action: ${debug.action} at (${debug.position.row},${debug.position.col}) in color '${debug.color}'\nReason: ${debug.reason}\n\nBefore:\n${debug.before}\n\nAfter:\n${debug.after}`;
  navigator.clipboard.writeText(text);
}
</script>
