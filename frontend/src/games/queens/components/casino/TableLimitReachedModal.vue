<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-semantic-success-800 to-semantic-success-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-semantic-success-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-semantic-success-100 mb-6">Table Complete!</h2>
        <div class="space-y-4 text-semantic-success-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-semantic-success-300"
              >{{ globalStore.player.totalChips }} chips</span
            >
          </div>
          <div class="text-semantic-success-100 text-sm">
            <p>You've won the maximum amount you can win on this table!</p>
            <p class="mt-2">It's time to choose a new table.</p>
          </div>
        </div>
        <button
          class="w-full bg-gradient-to-r from-semantic-success-600 to-semantic-success-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-semantic-success-500 hover:to-semantic-success-400 transition-all duration-200 shadow-lg hover:shadow-xl"
          @click="async () => await tableStore.goToTables()"
        >
          Back to Tables
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTableStore } from '../../stores/table';
import { useGlobalStore } from '../../stores/global';

const tableStore = useTableStore();
const globalStore = useGlobalStore();

defineOptions({
  name: 'TableLimitReachedModal',
});
</script>
