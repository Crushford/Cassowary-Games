<template>
  <aside class="bg-slate-800 p-4 rounded-lg flex flex-col gap-4">
    <!-- Title -->
    <h2 class="text-2xl font-semibold text-white">Puzzle Solving & Validation</h2>

    <!-- Reset Button at Top -->
    <BaseButton
      @click="levelBuilderStore.clearAutoTestMarks()"
      class="bg-red-800 hover:bg-red-700 text-lg font-medium"
    >
      🔄 Reset Auto Test Markers
    </BaseButton>

    <!-- Auto Test Button -->
    <BaseButton
      @click="levelBuilderStore.runAllSolverSteps()"
      class="bg-purple-600 hover:bg-purple-500 text-lg font-medium"
    >
      🧪 Run Auto Test
    </BaseButton>

    <!-- Collapsible Step-by-Step Controls -->
    <Accordion title="Step-by-Step Controls">
      <div class="flex flex-col gap-2">
        <BaseButton
          @click="levelBuilderStore.flagSquaresWithoutColorGroups"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 0: Flag Squares Without Color Groups
        </BaseButton>
        <BaseButton
          @click="levelBuilderStore.placeLastFreeQueens"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 1: Place Last Free Queens
        </BaseButton>
        <BaseButton
          @click="levelBuilderStore.flagBlockingSquares"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 2: Flag Blocking Squares
        </BaseButton>
        <BaseButton
          @click="levelBuilderStore.eliminateConstrainedRows"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 3: Eliminate Constrained Rows
        </BaseButton>
        <BaseButton
          @click="levelBuilderStore.eliminateConstrainedColumns"
          class="bg-blue-950 hover:bg-blue-900"
        >
          Step 4: Eliminate Constrained Columns
        </BaseButton>
      </div>
    </Accordion>
  </aside>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';

const BaseButton = defineAsyncComponent(() => import('./BaseButton.vue'));
const Accordion = defineAsyncComponent(() => import('./Accordion.vue'));

const levelBuilderStore = useLevelBuilderStore();

let checkTimeout: number | null = null;
</script>
