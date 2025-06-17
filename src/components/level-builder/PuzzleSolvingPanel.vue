<template>
  <aside class="bg-slate-800 p-4 rounded-lg flex flex-col gap-4">
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
        <BaseButton @click="handlePlaceLastFreeQueens" class="bg-blue-950 hover:bg-blue-900">
          Step 1: Place Last Free Queens
        </BaseButton>
        <BaseButton @click="handleFlagBlockingSquares" class="bg-blue-950 hover:bg-blue-900">
          Step 2: Flag Blocking Squares
        </BaseButton>
        <BaseButton @click="handleEliminateConstrainedRows" class="bg-blue-950 hover:bg-blue-900">
          Step 3: Eliminate Constrained Rows
        </BaseButton>
        <BaseButton
          @click="handleEliminateConstrainedColumns"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 4: Eliminate Constrained Columns
        </BaseButton>
        <BaseButton @click="handleBlockRowsAndColumns" class="bg-blue-950 hover:bg-blue-900">
          Step 5: Block Rows & Columns
        </BaseButton>
      </div>
    </Accordion>

    <!-- Validation Results -->
    <div class="flex flex-col gap-2 p-4 bg-slate-700 rounded-lg">
      <h3 class="text-lg font-medium text-white mb-2">Validation Results</h3>
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
  </aside>
</template>

<script setup lang="ts">
import { defineComponent as _defineComponent } from 'vue';
import { ref, computed, defineAsyncComponent, onUnmounted, watch } from 'vue';
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';

const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
const Accordion = defineAsyncComponent(() => import('./Accordion.vue'));

const levelStore = useLevelBuilderStore();

// Computed properties for validation states
const colorsConnected = computed(() => {
  const colors = new Set<string>();
  for (let row = 0; row < levelStore.gridSize; row++) {
    for (let col = 0; col < levelStore.gridSize; col++) {
      const color = levelStore.grid[row][col].groupColor;
      if (color) colors.add(color);
    }
  }
  return Array.from(colors).every((color) => levelStore.isColorConnected(color));
});

const noSingletons = computed(() => {
  const colorGroups: Record<string, number> = {};
  for (let row = 0; row < levelStore.gridSize; row++) {
    for (let col = 0; col < levelStore.gridSize; col++) {
      const color = levelStore.grid[row][col].groupColor;
      if (color) {
        colorGroups[color] = (colorGroups[color] || 0) + 1;
      }
    }
  }
  return Object.values(colorGroups).every((count) => count > 1);
});

const allFilled = computed(() => {
  return levelStore.countEmptySquares() === 0;
});

const correctQueens = computed(() => {
  return levelStore.queenPositions.length === levelStore.gridSize;
});

const canRunSteps = computed(() => {
  return levelStore.queenPositions.length > 0;
});

// Helper function for checkmark styling
const checkmarkClass = (isValid: boolean) => {
  return isValid ? 'text-green-500' : 'text-red-500';
};

// Add solution count ref
const solutionCount = ref<number | null>(null);
const isCheckingSolutions = ref(false);
let checkTimeout: number | null = null;

// Watch for grid changes and run validation with debouncing
watch(
  () => levelStore.grid,
  async (newGrid) => {
    if (levelStore.queenPositions.length > 0) {
      // Clear any existing timeout
      if (checkTimeout !== null) {
        window.clearTimeout(checkTimeout);
      }

      // Set a new timeout
      checkTimeout = window.setTimeout(async () => {
        try {
          isCheckingSolutions.value = true;
          solutionCount.value = await levelStore.validatePuzzleWithWorker();
          levelStore.addDebugLog(`Found ${solutionCount.value} solutions`);
        } catch (error) {
          console.error('Error checking solutions:', error);
          levelStore.addDebugLog(
            `Error checking solutions: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        } finally {
          isCheckingSolutions.value = false;
        }
      }, 500); // Wait 500ms after the last change before checking
    } else {
      solutionCount.value = null;
    }
  },
  { deep: true }
);

// Methods
function handleRunAllSteps() {
  levelStore.runAllSolverSteps();
}

function handlePlaceLastFreeQueens() {
  levelStore.placeLastFreeQueens();
}

function handleFlagBlockingSquares() {
  levelStore.flagBlockingSquares();
}

function handleEliminateConstrainedRows() {
  levelStore.eliminateConstrainedRows();
}

function handleEliminateConstrainedColumns() {
  levelStore.eliminateConstrainedColumns();
}

function handleBlockRowsAndColumns() {
  levelStore.blockRowsAndColumns();
}

function handleResetBoard() {
  // Only clear queens and flags, preserve colors
  levelStore.clearMarkers();
}

// Clean up timeout on unmount
onUnmounted(() => {
  if (checkTimeout !== null) {
    window.clearTimeout(checkTimeout);
  }
  levelStore.cleanup();
});
</script>
