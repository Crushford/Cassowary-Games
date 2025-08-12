<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-amber-800 to-amber-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-amber-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-yellow-100 mb-6">Table cap reached</h2>
        <div class="space-y-4 text-yellow-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-yellow-300"
              >{{ globalStore.player.totalChips }} chips</span
            >
          </div>
          <div class="pt-4 border-t border-amber-600">
            <div class="flex justify-between mb-2">
              <span>Your progress on this table:</span>
              <span class="font-semibold text-yellow-300"
                >{{ totalProfit }} / {{ tableStore.maxPayout }}</span
              >
            </div>
          </div>
        </div>
        <button
          @click="async () => await tableStore.goToTables()"
          class="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-400 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Back to Tables
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoundStore } from '../../stores/round';
import { useTableStore } from '../../stores/table';
import { useGlobalStore } from '../../stores/global';

const roundStore = useRoundStore();
const tableStore = useTableStore();
const globalStore = useGlobalStore();

const totalProfit = computed(() => {
  if (!roundStore.tableId) return 0;
  return globalStore.tablesProgress[roundStore.tableId]?.totalProfit ?? 0;
});

defineOptions({
  name: 'CapReachedModal',
});
</script>
