<template>
  <div class="px-4 py-3 bg-gray-900 border-b border-gray-700">
    <!-- Gold Display -->
    <div class="mb-3">
      <GoldDisplay />
    </div>

    <!-- Rules Plaque -->
    <RulesPlaque />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useGlobalStore } from '../../stores/global';

const GoldDisplay = defineAsyncComponent(() => import('./GoldDisplay.vue'));
const RulesPlaque = defineAsyncComponent(() => import('./RulesPlaque.vue'));
const globalStore = useGlobalStore();

defineOptions({
  name: 'CasinoHUD',
});
</script>
