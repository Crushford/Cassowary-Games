<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-amber-800 to-amber-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-amber-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-yellow-100 mb-6">
          {{ isWon ? 'Round Won!' : 'Busted!' }}
        </h2>

        <div class="space-y-4 text-yellow-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-yellow-300"
              >{{ globalStore.player.totalChips }} chips</span
            >
          </div>

          <div
            v-if="roundStore.tableId && tableStore.maxPayout && isWon"
            class="pt-4 border-t border-amber-600"
          >
            <div class="flex justify-between mb-2">
              <span>Progress on this table:</span>
              <span class="font-semibold text-yellow-300"
                >{{ totalProfit }} / {{ tableStore.maxPayout }}</span
              >
            </div>
            <div class="w-full bg-amber-900 rounded-full h-3">
              <div
                class="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                :style="{ width: `${Math.min(100, (totalProfit / tableStore.maxPayout) * 100)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Show Cash Out and Play Again for winners -->
          <template v-if="isWon">
            <button
              @click="async () => await tableStore.goToTables()"
              class="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-400 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Cash Out
            </button>

            <button
              v-if="canPlayAgain"
              @click="tableStore.handlePlayAgain"
              class="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-400 text-amber-900 py-3 px-6 rounded-lg font-semibold hover:from-yellow-400 hover:to-yellow-300 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Play Again
            </button>
          </template>

          <!-- Show only Restart for busted players -->
          <template v-else>
            <button
              @click="globalStore.restart"
              class="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Restart Game
            </button>
          </template>
        </div>
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

const isWon = computed(() => tableStore.status === 'won');
const canPlayAgain = computed(() => {
  if (!roundStore.tableId) return false;
  const table = tableStore.getTable(roundStore.tableId);
  if (!table) return false;
  return globalStore.player.totalChips >= table.buyIn;
});

defineOptions({
  name: 'RoundCompleteModal',
});
</script>
