<template>
  <aside class="bg-semantic-neutral-800 p-4 rounded-lg flex flex-col gap-4">
    <!-- Title -->
    <h2 class="text-2xl font-semibold text-white">Puzzle Solving & Validation</h2>

    <!-- Reset Button at Top -->
    <BaseButton
      class="bg-semantic-danger-800 hover:bg-semantic-danger-700 text-lg font-medium"
      @click="levelBuilderStore.clearAutoTestMarks()"
    >
      🔄 Reset Auto Test Markers
    </BaseButton>

    <!-- Auto Test Button -->
    <BaseButton
      class="bg-semantic-info-600 hover:bg-semantic-info-500 text-lg font-medium"
      @click="levelBuilderStore.runAllSolverSteps()"
    >
      🧪 Run Auto Test
    </BaseButton>

    <!-- Collapsible Step-by-Step Controls -->
    <Accordion title="Step-by-Step Controls">
      <div class="flex flex-col gap-2">
        <BaseButton
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.flagSquaresWithoutColorGroups"
        >
          Step 0: Flag Squares Without Color Groups
        </BaseButton>
        <BaseButton
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.placeLastFreeQueens"
        >
          Step 1: Place Last Free Queens
        </BaseButton>
        <BaseButton
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.flagBlockingSquares"
        >
          Step 2: Flag Blocking Squares
        </BaseButton>
        <BaseButton
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.eliminateConstrainedRows"
        >
          Step 3: Eliminate Constrained Rows
        </BaseButton>
        <BaseButton
          class="bg-semantic-info-950 hover:bg-semantic-info-900"
          @click="levelBuilderStore.eliminateConstrainedColumns"
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
const Accordion = defineAsyncComponent(() => import('@/shared/components/Accordion.vue'));

const levelBuilderStore = useLevelBuilderStore();
</script>
