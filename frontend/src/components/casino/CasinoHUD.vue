<template>
  <div
    class="px-4 py-2 bg-semantic-neutral-900 border-b border-semantic-neutral-700 relative flex items-center justify-between"
  >
    <!-- Gold Display -->
    <div class="flex-1">
      <GoldDisplay />
    </div>

    <!-- Back to Tables Button (right side) -->
    <button
      v-if="roundStore.boardSize"
      class="bg-gradient-to-r from-semantic-warning-600 to-semantic-warning-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-semantic-warning-500 hover:to-semantic-warning-400 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
      @click="handleCashOut"
    >
      Back to Tables
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useRoundStore } from '../../stores/round';

const GoldDisplay = defineAsyncComponent(() => import('./GoldDisplay.vue'));
const roundStore = useRoundStore();

const handleCashOut = () => {
  if (roundStore.boardSize) {
    roundStore.leaveLevel();
  }
};

defineOptions({
  name: 'CasinoHUD',
});
</script>
