<template>
  <div class="flex items-center space-x-2">
    <div class="w-32 h-4 bg-semantic-neutral-700 rounded-full overflow-hidden">
      <div
        class="h-full bg-semantic-danger-500 transition-all duration-300 ease-in-out"
        :style="{ width: `${(harvestStore.bites / harvestStore.maxHealth) * 100}%` }"
      ></div>
    </div>
    <span class="text-semantic-danger-400 text-sm"
      >{{ harvestStore.bites }}/{{ harvestStore.maxHealth }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { useHarvestStore } from '../../stores/harvestStore';

const harvestStore = useHarvestStore();
</script>

<script lang="ts">
export default {
  name: 'BitesDisplay',
};
</script>
