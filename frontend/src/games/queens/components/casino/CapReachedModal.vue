<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-semantic-warning-800 to-semantic-warning-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-semantic-warning-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-semantic-warning-100 mb-6">Table cap reached</h2>
        <div class="space-y-4 text-semantic-warning-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-semantic-warning-300"
              >{{ globalStore.player.totalChips }} chips</span
            >
          </div>
          <div class="pt-4 border-t border-semantic-warning-600">
            <div class="flex justify-between mb-2">
              <span>Your progress on this table:</span>
              <span class="font-semibold text-semantic-warning-300"
                >0 / {{ tableStore.maxPayout }}</span
              >
            </div>
          </div>
        </div>
        <button
          class="w-full bg-gradient-to-r from-semantic-warning-600 to-semantic-warning-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-semantic-warning-500 hover:to-semantic-warning-400 transition-all duration-200 shadow-lg hover:shadow-xl"
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
  name: 'CapReachedModal',
});
</script>
