<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-700 rounded-lg p-6 w-full h-full max-w-4xl h-[100dvh] overflow-y-auto shadow-2xl border-2 border-amber-600"
    >
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-4xl font-bold text-yellow-100 mb-2">Cassowary Casino</h1>
        <p class="text-yellow-200">Choose your table and test your luck!</p>
        <div class="mt-4 text-yellow-100">
          <span class="text-lg">Your Bank: </span>
          <span class="text-2xl font-bold text-yellow-300"
            >{{ globalStore.player.totalChips }} chips</span
          >
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="!tableStore.loaded" class="text-center py-12">
        <div class="text-yellow-200 text-xl">Loading tables...</div>
      </div>

      <!-- Tables grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="table in Object.values(tableStore.tables)"
          :key="table.id"
          class="bg-gradient-to-br from-amber-800 to-amber-700 rounded-lg p-4 shadow-lg border-2 border-amber-600 hover:border-amber-400 transition-all duration-200"
        >
          <div class="text-center">
            <h3 class="text-xl font-bold text-yellow-100 mb-2">{{ table.name }}</h3>
            <div class="space-y-2 text-yellow-200 text-sm">
              <div class="flex justify-between">
                <span>Min Balance:</span>
                <span class="font-semibold text-yellow-300">{{ table.buyIn }} chips</span>
              </div>
              <div class="flex justify-between">
                <span>Max Payout:</span>
                <span class="font-semibold text-yellow-300">{{ table.maxPayout }} chips</span>
              </div>
              <div class="flex justify-between">
                <span>Board Size:</span>
                <span class="font-semibold text-yellow-300">{{ table.boardSize }}</span>
              </div>
            </div>

            <div class="mt-4">
              <button
                @click="playTable(table.id)"
                :disabled="globalStore.player.totalChips < table.buyIn"
                class="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  globalStore.player.totalChips >= table.buyIn
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-amber-900 hover:from-yellow-400 hover:to-yellow-300 shadow-lg hover:shadow-xl'
                    : 'bg-gray-600 text-gray-300'
                "
              >
                {{ globalStore.player.totalChips >= table.buyIn ? 'Play' : 'Insufficient Chips' }}
              </button>
            </div>

            <!-- Progress indicator -->
            <div v-if="globalStore.tablesProgress[table.id]" class="mt-3 text-xs text-yellow-200">
              <div class="flex justify-between mb-1">
                <span>Progress:</span>
                <span
                  >{{ globalStore.tablesProgress[table.id].totalProfit }} /
                  {{ table.maxPayout }}</span
                >
              </div>
              <div class="w-full bg-amber-900 rounded-full h-1">
                <div
                  class="bg-yellow-400 h-1 rounded-full transition-all duration-300"
                  :style="{
                    width: `${Math.min(100, (globalStore.tablesProgress[table.id].totalProfit / table.maxPayout) * 100)}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '../../stores/global';
import { useTableStore } from '../../stores/table';

const globalStore = useGlobalStore();
const tableStore = useTableStore();

const playTable = async (tableId: string) => {
  const { useGlobalStore } = await import('../../stores/global');
  const globalStore = useGlobalStore();

  try {
    await globalStore.sitAtTable(tableId);
  } catch (error) {
    console.error('Failed to sit at table:', error);
  }
};

defineOptions({
  name: 'TablesSelectionModal',
});
</script>
