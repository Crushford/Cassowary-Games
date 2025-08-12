<template>
  <div class="flex justify-between items-center px-4 py-3 bg-gray-900 border-b border-gray-700">
    <!-- Left: Gold Display -->
    <GoldDisplay />

    <!-- Center: Short Rules -->
    <div class="text-center text-sm text-gray-300">Start with 20 gold. Honeypot +1. Ant –5.</div>

    <!-- Right: Full Rules Button -->
    <button
      @click="globalStore.setShowRules(true)"
      class="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors text-sm"
    >
      Full Rules
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '../../stores/global';
import GoldDisplay from './GoldDisplay.vue';

const globalStore = useGlobalStore();

defineOptions({
  name: 'CasinoHUD',
});
</script>

