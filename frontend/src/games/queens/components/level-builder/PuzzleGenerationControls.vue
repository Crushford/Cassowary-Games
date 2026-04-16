<template>
  <aside class="bg-semantic-neutral-800 p-4 rounded-lg flex flex-col gap-4">
    <h2 class="text-2xl font-semibold text-white">Puzzle Generation Controls</h2>

    <!-- Grid Size Control -->
    <div class="flex items-center gap-4 text-white">
      <span>Grid Size:</span>
      <input
        v-model="gridSize"
        type="number"
        min="4"
        max="8"
        :disabled="hasCompletedGame"
        class="w-16 p-2 border border-semantic-neutral-600 rounded-lg bg-semantic-neutral-700 text-white"
        @change="handleGridSizeChange"
      />
    </div>

    <!-- Main Run All Steps Button -->
    <div class="flex flex-col gap-2">
      <BaseButton
        class="bg-semantic-info-600 hover:bg-semantic-info-500 text-lg font-medium"
        @click="
          () => {
            levelBuilderStore.placeQueensAndAssignColors();
          }
        "
      >
        ▶️ Place Queens & Assign Initial Colors
      </BaseButton>

      <BaseButton
        :disabled="!hasAnyColors"
        disabled-title="Assign colors first"
        class="bg-semantic-info-600 hover:bg-semantic-info-500 text-lg font-medium"
        @click="handleExpandRandomColors"
      >
        🔄 Expand Random Colors safely until board is full
      </BaseButton>

      <BaseButton
        class="bg-semantic-success-600 hover:bg-semantic-success-500 text-lg font-medium"
        @click="handleGenerateWithRetry"
      >
        🔁 Generate & Expand with Retry
      </BaseButton>

      <BaseButton
        class="bg-semantic-danger-600 hover:bg-semantic-danger-500 text-lg font-medium"
        @click="levelBuilderStore.experimentCreateValidBoard()"
      >
        Experiment: Create Valid Board
      </BaseButton>
    </div>

    <!-- Step-by-Step Controls in Accordion -->
    <Accordion title="Step-by-Step Controls" :default-open="true">
      <!-- Step 1: Reset Board -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-semantic-neutral-400">Step 0: Reset Board</span>
        <BaseButton
          class="bg-semantic-danger-950 hover:bg-semantic-danger-900"
          @click="levelBuilderStore.initializeGrid()"
        >
          Reset Grid to Initial State
        </BaseButton>
      </div>

      <!-- Step 2: Place Queens -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-semantic-neutral-400">Step 1: Place Queens</span>

        <BaseButton
          disabled-title="Board is full"
          class="bg-semantic-info-950 hover:bg-semantic-info-900 text-sm"
          @click="levelBuilderStore.placeAllQueens()"
        >
          Place All Queens
        </BaseButton>
      </div>

      <!-- Step 3: Color Each Queen -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-semantic-neutral-400">Step 2: Color Each Queen</span>
        <BaseButton
          disabled-title="Place queens first"
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.assignInitialColorsToQueens()"
        >
          Assign Initial Colors to Queens
        </BaseButton>
      </div>

      <!-- Step 4: Expand Color Groups -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-semantic-neutral-400">Step 3: Expand Color Groups</span>
        <BaseButton
          :disabled="!hasAnyColors"
          disabled-title="Assign colors first"
          class="bg-semantic-success-950 hover:bg-semantic-success-900"
          @click="levelBuilderStore.expandColorGroups()"
        >
          Expand Color Groups
        </BaseButton>
      </div>

      <!-- Step 5: Color One Per Row -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-semantic-neutral-400">Step 4: Color One Square Per Row</span>
        <BaseButton
          :disabled="!hasAnyColors"
          disabled-title="Assign colors first"
          class="bg-semantic-success-950 hover:bg-semantic-success-900"
          @click="levelBuilderStore.addColorOnePerRow()"
        >
          Color One Square Per Row
        </BaseButton>
      </div>

      <!-- Step 6: Fill Remaining -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-semantic-neutral-400">Step 5: Fill Remaining</span>
        <BaseButton
          :disabled="!hasAnyColors"
          disabled-title="Assign colors first"
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.fillRemainingSingleSquares()"
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
const Accordion = defineAsyncComponent(() => import('@/shared/components/Accordion.vue'));
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
