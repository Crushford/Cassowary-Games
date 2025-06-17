<template>
  <aside class="bg-slate-800 p-4 rounded-lg flex flex-col gap-4">
    <!-- Title -->
    <h2 class="text-2xl font-semibold text-white">Puzzle Solving & Validation</h2>

    <!-- Reset Button at Top -->
    <BaseButton
      @click="levelStore.clearAutoTestMarks()"
      class="bg-red-800 hover:bg-red-700 text-lg font-medium"
    >
      🔄 Reset Auto Test Markers
    </BaseButton>

    <!-- Auto Test Button -->
    <BaseButton
      @click="handleRunAutoTest"
      class="bg-purple-600 hover:bg-purple-500 text-lg font-medium"
    >
      🧪 Run Auto Test
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
  </aside>
</template>

<script setup lang="ts">
import { defineComponent as _defineComponent } from 'vue';
import { ref, computed, defineAsyncComponent, onUnmounted, watch } from 'vue';
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';

const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
const Accordion = defineAsyncComponent(() => import('./Accordion.vue'));

const levelStore = useLevelBuilderStore();

let checkTimeout: number | null = null;

function handleRunAutoTest() {
  // Clear any existing auto test marks
  levelStore.clearAutoTestMarks();
  // Run the solver steps
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

// Clean up timeout on unmount
onUnmounted(() => {
  if (checkTimeout !== null) {
    window.clearTimeout(checkTimeout);
  }
  levelStore.cleanup();
});
</script>
