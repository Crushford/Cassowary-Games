<template>
  <div class="flex justify-between items-center px-4">
    <div class="flex items-center space-x-2">
      <span class="text-semantic-warning-400">🍯</span>
      <span>{{ harvestStore.honeyPots }}</span>
      <span v-if="harvestStore.isTrainingDay" class="text-semantic-success-400 text-sm ml-2">
        (Training)
      </span>
    </div>
    <BitesDisplay />
  </div>
</template>

<script setup lang="ts">
import { useHarvestStore } from '../../stores/harvestStore';
import BitesDisplay from './BitesDisplay.vue';

const harvestStore = useHarvestStore();
</script>

<script lang="ts">
export default {
  name: 'GameHUD',
};
</script>
