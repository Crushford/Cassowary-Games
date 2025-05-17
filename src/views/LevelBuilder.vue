<template>
  <div class="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4">
    <!-- Puzzle Generation Controls Sidebar on Left -->
    <aside class="bg-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <PuzzleGenerationControls />
    </aside>

    <!-- Main Content -->
    <div class="flex flex-col gap-4">
      <GameGrid />

      <div
        v-if="gameStore.errorMessage"
        class="p-4 bg-red-500/20 border border-red-500 text-red-400 rounded-lg"
      >
        {{ gameStore.errorMessage }}
      </div>

      <section
        v-if="gameStore.testLogs.length"
        ref="logsContainer"
        class="bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg max-h-64 overflow-auto"
      >
        <h3 class="font-semibold mb-4 text-white">Logs</h3>
        <ul class="list-disc list-inside text-sm space-y-2 text-white">
          <li v-for="(log, i) in gameStore.testLogs" :key="i">{{ log }}</li>
        </ul>
      </section>

      <section
        v-if="gameStore.testDebugLogs.length"
        class="bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg"
      >
        <h3 class="font-semibold mb-4 text-white">Debug Logs</h3>
        <div class="text-sm text-white">
          <pre class="whitespace-pre-wrap overflow-auto">{{
            JSON.stringify(gameStore.testDebugLogs, null, 2)
          }}</pre>
        </div>
      </section>
    </div>

    <!-- Advanced Controls Sidebar on Right -->
    <aside class="bg-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <h2 class="text-white text-lg font-semibold mb-2">Advanced Controls</h2>
      <div v-for="section in sections" :key="section.title">
        <div class="flex items-center justify-between">
          <!-- Composite action button (always visible) -->
          <button
            class="px-3 py-2 bg-indigo-600 rounded text-white font-medium disabled:opacity-50 flex-1 text-left"
            @click.prevent="section.mainAction()"
            :disabled="section.disabled"
            :title="section.disabledReason"
          >
            {{ section.mainLabel }}
          </button>
          <!-- Collapse toggle (only if extra steps) -->
          <button
            v-if="section.steps.length > 1"
            class="ml-2 text-white"
            @click="section.expanded = !section.expanded"
          >
            <span v-if="section.expanded">▲</span>
            <span v-else>▼</span>
          </button>
        </div>

        <!-- Expanded content: individual steps -->
        <div v-if="section.steps.length > 1 && section.expanded" class="mt-2 space-y-2">
          <button
            v-for="step in section.steps"
            :key="step.label"
            class="w-full px-3 py-1 bg-slate-700 rounded text-white text-sm disabled:opacity-50"
            @click.prevent="step.action()"
            :disabled="step.disabled"
            :title="step.disabledReason"
          >
            {{ step.label }}
          </button>
        </div>
      </div>

      <!-- Add Puzzle Solving Panel -->
      <PuzzleSolvingPanel />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, reactive, computed, defineAsyncComponent } from 'vue';
import { useGameStore } from '../stores/gameStore';

// Use defineAsyncComponent to fix the "no default export" error
const GameGrid = defineAsyncComponent(() => import('../components/GameGrid.vue'));
const PuzzleGenerationControls = defineAsyncComponent(
  () => import('../components/PuzzleGenerationControls.vue')
);
const PuzzleSolvingPanel = defineAsyncComponent(
  () => import('../components/PuzzleSolvingPanel.vue')
);

const gameStore = useGameStore();

// Fix the "c implicitly has an 'any' type" errors
function hasGroupColor(c: any): boolean {
  return !c.groupColor;
}

// Sections configuration with reactive expanded state
const sections = reactive([
  {
    title: 'Grid Management',
    mainLabel: 'Reset Board',
    mainAction: () => {
      gameStore.initializeGrid();
      gameStore.clearQueensAndFlags();
    },
    disabled: computed(
      () => gameStore.moveHistory.length === 0 && gameStore.queenPositions.length === 0
    ),
    disabledReason: 'Board is fresh',
    expanded: false,
    steps: [
      {
        label: 'initializeGrid()',
        action: () => gameStore.initializeGrid(),
        disabled: computed(
          () => gameStore.moveHistory.length === 0 && gameStore.queenPositions.length === 0
        ),
        disabledReason: 'Board is fresh',
      },
      {
        label: 'clearQueensAndFlags()',
        action: () => gameStore.clearQueensAndFlags(),
        disabled: computed(
          () => gameStore.queenPositions.length === 0 && gameStore.countFlags() === 0
        ),
        disabledReason: 'No markers to clear',
      },
      {
        label: 'setGridSize()',
        action: () => {
          /* open size modal */
        },
        disabled: computed(() => gameStore.isComplete),
        disabledReason: 'Cannot resize after completion',
      },
    ],
  },
  {
    title: 'Move Operations',
    mainLabel: 'Auto-Place All Queens',
    mainAction: () => gameStore.generateFullSolution(),
    disabled: computed(() => gameStore.queenPositions.length === gameStore.gridSize),
    disabledReason: 'All queens placed',
    expanded: false,
    steps: [
      {
        label: 'placeRandomQueen()',
        action: () => gameStore.placeRandomQueen(),
        disabled: computed(() => gameStore.availableMoves.length === 0),
        disabledReason: 'No valid spots',
      },
      {
        label: 'generateFullSolution()',
        action: () => gameStore.generateFullSolution(),
        disabled: computed(() => gameStore.queenPositions.length === gameStore.gridSize),
        disabledReason: 'All queens placed',
      },
    ],
  },
  {
    title: 'State Queries',
    mainLabel: 'Refresh State',
    mainAction: () => {
      gameStore.updateAvailableMoves();
      gameStore.validatePuzzle();
    },
    disabled: computed(() => false),
    disabledReason: '',
    expanded: false,
    steps: [
      {
        label: 'computeAvailableMoves()',
        action: () => gameStore.updateAvailableMoves(),
        disabled: false,
        disabledReason: '',
      },
      {
        label: 'validatePuzzle()',
        action: () => gameStore.validatePuzzle(),
        disabled: false,
        disabledReason: '',
      },
      {
        label: 'countEmptySquares()',
        action: () => gameStore.countEmptySquares(),
        disabled: false,
        disabledReason: '',
      },
      {
        label: 'countFlags()',
        action: () => gameStore.countFlags(),
        disabled: false,
        disabledReason: '',
      },
    ],
  },
  {
    title: 'Color Assignment',
    mainLabel: 'Auto-Color Board',
    mainAction: () => {
      gameStore.assignColorGroups();
      gameStore.addOneColorToEachGroup();
      gameStore.addOneColorToEachRow();
      gameStore.fillRemainingSingleSquares();
    },
    disabled: computed(() => gameStore.queenPositions.length < gameStore.gridSize),
    disabledReason: 'Place all queens first',
    expanded: false,
    steps: [
      {
        label: 'assignColorGroups()',
        action: () => gameStore.assignColorGroups(),
        disabled: computed(() => gameStore.queenPositions.length < gameStore.gridSize),
        disabledReason: 'Place all queens first',
      },
      {
        label: 'addOneColorToEachGroup()',
        action: () => gameStore.addOneColorToEachGroup(),
        disabled: computed(() => gameStore.grid.flat().every(hasGroupColor)),
        disabledReason: 'Assign initial colors first',
      },
      {
        label: 'addOneColorToEachRow()',
        action: () => gameStore.addOneColorToEachRow(),
        disabled: computed(() => gameStore.grid.flat().every(hasGroupColor)),
        disabledReason: 'Assign initial colors first',
      },
      {
        label: 'fillRemainingSingleSquares()',
        action: () => gameStore.fillRemainingSingleSquares(),
        disabled: computed(() => gameStore.grid.flat().every(hasGroupColor)),
        disabledReason: 'Assign initial colors first',
      },
    ],
  },
  {
    title: 'Export & Save',
    mainLabel: 'Save Current Puzzle',
    mainAction: () => {
      if (gameStore.validatePuzzle()) {
        gameStore.exportGameState();
        gameStore.savePuzzleToLocalStorage();
      }
    },
    disabled: computed(() => !gameStore.isComplete),
    disabledReason: 'Complete puzzle & colors first',
    expanded: false,
    steps: [
      {
        label: 'exportGameState()',
        action: () => gameStore.exportGameState(),
        disabled: computed(() => gameStore.moveHistory.length === 0),
        disabledReason: 'Nothing to export',
      },
      {
        label: 'savePuzzleToLocalStorage()',
        action: () => gameStore.savePuzzleToLocalStorage(),
        disabled: computed(() => !gameStore.isComplete),
        disabledReason: 'Complete puzzle & colors first',
      },
      {
        label: 'loadPuzzle()',
        action: () => {
          /* prompt & load */
        },
        disabled: computed(() => gameStore.savedPuzzles.length === 0),
        disabledReason: 'No saved puzzles',
      },
      {
        label: 'deletePuzzle()',
        action: () => {
          /* prompt & delete */
        },
        disabled: computed(() => gameStore.savedPuzzles.length === 0),
        disabledReason: 'No saved puzzles',
      },
    ],
  },
]);

const logsContainer = ref<HTMLElement | null>(null);
watch(
  () => gameStore.testLogs,
  () =>
    nextTick(() => {
      if (logsContainer.value) logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }),
  { deep: true }
);
onMounted(() => {
  if (logsContainer.value && gameStore.testLogs.length)
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
});
</script>
