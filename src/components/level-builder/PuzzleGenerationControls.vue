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
        @click="
          () => {
            levelBuilderStore.clearQueensAndFlags();
            levelBuilderStore.placeAllQueens();
            levelBuilderStore.assignInitialColorsToQueens();
          }
        "
        class="bg-indigo-600 hover:bg-indigo-500 text-lg font-medium"
      >
        ▶️ Place Queens & Assign Initial Colors
      </BaseButton>

      <BaseButton
        @click="handleExpandRandomColors"
        :disabled="!hasAnyColors"
        disabledTitle="Assign colors first"
        class="bg-blue-600 hover:bg-blue-500 text-lg font-medium"
      >
        🔄 Expand Random Colors safely until board is full
      </BaseButton>

      <BaseButton
        @click="handleGenerateWithRetry"
        class="bg-green-600 hover:bg-green-500 text-lg font-medium"
      >
        🔁 Generate & Expand with Retry
      </BaseButton>
    </div>

    <!-- Step-by-Step Controls in Accordion -->
    <Accordion title="Step-by-Step Controls" :defaultOpen="true">
      <!-- Step 1: Reset Board -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 0: Reset Board</span>
        <BaseButton @click="levelBuilderStore.initializeGrid()" class="bg-red-950 hover:bg-red-900">
          Reset Grid to Initial State
        </BaseButton>
      </div>

      <!-- Step 2: Place Queens -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 1: Place Queens</span>

        <BaseButton
          @click="levelBuilderStore.placeAllQueens()"
          disabledTitle="Board is full"
          class="bg-blue-950 hover:bg-blue-900 text-sm"
        >
          Place All Queens
        </BaseButton>
      </div>

      <!-- Step 3: Color Each Queen -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-slate-400">Step 2: Color Each Queen</span>
        <BaseButton
          @click="levelBuilderStore.assignInitialColorsToQueens()"
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
          @click="levelBuilderStore.expandColorGroups()"
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
          @click="levelBuilderStore.addColorOnePerRow()"
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
          @click="levelBuilderStore.fillRemainingSingleSquares()"
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
import { ref, computed, defineAsyncComponent, onMounted, watch } from 'vue';
const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
const Accordion = defineAsyncComponent(() => import('./Accordion.vue'));
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';

const levelBuilderStore = useLevelBuilderStore();

// Reactive state
const gridSize = ref(levelBuilderStore.gridSize);
const isGenerating = ref(false);

// Watch for generation state changes
const updateGeneratingState = () => {
  isGenerating.value = levelBuilderStore.puzzleGenerationState.isGenerating;
};

onMounted(() => {
  // Initialize level builder store
  levelBuilderStore.loadPuzzlesFromLocalStorage();
  // Set up watcher for generation state
  watch(() => levelBuilderStore.puzzleGenerationState.isGenerating, updateGeneratingState);
});

const hasAnyColors = computed(() => {
  for (let row = 0; row < levelBuilderStore.gridSize; row++) {
    for (let col = 0; col < levelBuilderStore.gridSize; col++) {
      if (levelBuilderStore.grid[row][col].groupColor) {
        return true;
      }
    }
  }
  return false;
});

const hasCompletedGame = computed(() => {
  return (
    levelBuilderStore.queenPositions.length === levelBuilderStore.gridSize &&
    levelBuilderStore.countEmptySquares() === 0
  );
});

const canPlaceQueens = computed(() => {
  return levelBuilderStore.queenPositions.length < levelBuilderStore.gridSize;
});

// Methods
function handleGridSizeChange() {
  levelBuilderStore.setGridSize(gridSize.value);
}

async function handleExpandRandomColors() {
  await levelBuilderStore.expandRandomColorsUntilFull();
}

async function handleGenerateWithRetry() {
  const success = await levelBuilderStore.generateAndExpandColorsWithRetry();
  if (!success) {
    // You could add some UI feedback here if needed
    console.log('Failed to generate puzzle after all retries');
  }
}
</script>
