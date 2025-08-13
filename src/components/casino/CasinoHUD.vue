<template>
  <div class="px-4 py-3 bg-gray-900 border-b border-gray-700 relative">
    <!-- Back to Tables Button (top right) -->
    <button
      v-if="roundStore.tableId"
      @click="handleCashOut"
      class="absolute top-3 right-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-400 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
    >
      Back to Tables
    </button>

    <!-- Gold Display -->
    <div class="mb-3">
      <GoldDisplay />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useRoundStore } from '../../stores/round';
import { useTableStore } from '../../stores/table';

const GoldDisplay = defineAsyncComponent(() => import('./GoldDisplay.vue'));
const roundStore = useRoundStore();
const tableStore = useTableStore();

const handleCashOut = () => {
  if (roundStore.tableId) {
    roundStore.leaveTable();
  }
};

defineOptions({
  name: 'CasinoHUD',
});
</script>
