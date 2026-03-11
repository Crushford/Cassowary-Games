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

      <!-- Toggle for hiding unavailable tables -->
      <div class="flex justify-center mb-4">
        <div class="flex items-center space-x-4">
          <label class="flex items-center space-x-3 text-yellow-200 cursor-pointer">
            <div class="relative">
              <input v-model="hideUnavailableTables" type="checkbox" class="sr-only" />
              <div
                class="w-12 h-6 bg-amber-900 border-2 border-amber-600 rounded-full transition-colors duration-200"
                :class="hideUnavailableTables ? 'bg-amber-600 border-amber-500' : ''"
              ></div>
              <div
                class="absolute top-0.5 left-0.5 w-5 h-5 bg-yellow-300 rounded-full transition-transform duration-200 shadow-md"
                :class="hideUnavailableTables ? 'transform translate-x-6' : ''"
              ></div>
            </div>
            <span class="text-sm font-medium">Hide unavailable tables</span>
          </label>
          <span class="text-yellow-300 text-sm">
            {{ filteredTables.length }} of {{ Object.values(tableStore.tables).length }} tables
          </span>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="!tableStore.loaded" class="text-center py-12">
        <div class="text-yellow-200 text-xl">Loading tables...</div>
      </div>

      <!-- Tables grid -->
      <div v-else>
        <!-- No tables available message -->
        <div v-if="filteredTables.length === 0" class="text-center py-12">
          <div class="text-yellow-200 text-xl mb-4">
            {{ hideUnavailableTables ? 'No available tables found' : 'No tables available' }}
          </div>
          <div v-if="hideUnavailableTables" class="text-yellow-300 text-sm">
            Try unchecking "Hide unavailable tables" to see all tables
          </div>
        </div>

        <!-- Tables grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="table in filteredTables"
            :key="table.id"
            class="bg-gradient-to-br from-amber-800 to-amber-700 rounded-lg p-4 shadow-lg border-2 border-amber-600 hover:border-amber-400 transition-all duration-200"
          >
            <div class="text-center">
              <div class="flex items-center justify-center gap-2 mb-2">
                <h3 class="text-xl font-bold text-yellow-100">{{ table.name }}</h3>
              </div>
              <div class="space-y-2 text-yellow-200 text-sm">
                <div class="flex justify-between">
                  <span>Min Balance:</span>
                  <span class="font-semibold text-yellow-300">{{ table.minimumBuyIn }} chips</span>
                </div>
                <div class="flex justify-between">
                  <span>Max Payout:</span>
                  <span class="font-semibold text-yellow-300">{{ table.maxPayout }} chips</span>
                </div>
                <div class="flex justify-between">
                  <span>Board Size:</span>
                  <span class="font-semibold text-yellow-300">{{ table.boardSize }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Multiplier:</span>
                  <span class="font-semibold text-purple-300">{{ table.payoutMultiplier }}x</span>
                </div>
                <div class="flex justify-between">
                  <span>Honeypot Reward:</span>
                  <span class="font-semibold text-green-300"
                    >+{{ getTablePayouts(table).honeypot }} gold</span
                  >
                </div>
                <div class="flex justify-between">
                  <span>Ant Penalty:</span>
                  <span class="font-semibold text-red-300"
                    >-{{ getTablePayouts(table).ant }} gold</span
                  >
                </div>
              </div>

              <div class="mt-4">
                <button
                  :disabled="
                    !globalStore.isTableAccessible(table.id, table.minimumBuyIn, table.maxPayout)
                  "
                  class="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="
                    globalStore.isTableAccessible(table.id, table.minimumBuyIn, table.maxPayout)
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-amber-900 hover:from-yellow-400 hover:to-yellow-300 shadow-lg hover:shadow-xl'
                      : 'bg-gray-600 text-gray-300'
                  "
                  @click="playTable(table.id)"
                >
                  {{ getTableButtonText(table) }}
                </button>
              </div>

              <!-- Progress indicator -->
              <div v-if="globalStore.tablesProgress[table.id]" class="mt-3 text-xs text-yellow-200">
                <div class="flex justify-between mb-1">
                  <span>Progress:</span>
                  <span
                    :class="
                      globalStore.tablesProgress[table.id].totalProfit < 0
                        ? 'text-red-300'
                        : globalStore.tablesProgress[table.id].totalProfit >= table.maxPayout
                          ? 'text-green-300'
                          : 'text-yellow-300'
                    "
                    >{{ globalStore.tablesProgress[table.id].totalProfit }} /
                    {{ table.maxPayout }}</span
                  >
                </div>
                <div class="w-full bg-amber-900 rounded-full h-1">
                  <div
                    :class="
                      globalStore.tablesProgress[table.id].totalProfit >= table.maxPayout
                        ? 'bg-green-400'
                        : 'bg-yellow-400'
                    "
                    class="h-1 rounded-full transition-all duration-300"
                    :style="{
                      width: `${Math.max(0, Math.min(100, (globalStore.tablesProgress[table.id].totalProfit / table.maxPayout) * 100))}%`,
                    }"
                  ></div>
                </div>

                <!-- Table Complete indicator -->
                <div
                  v-if="globalStore.tablesProgress[table.id].totalProfit >= table.maxPayout"
                  class="mt-2 text-center text-green-300 font-semibold text-xs"
                >
                  ✓ Table Complete
                </div>

                <!-- Rounds Complete -->
                <div class="mt-2 space-y-1">
                  <div class="flex justify-between">
                    <span>Rounds Complete:</span>
                    <span class="text-green-300 font-semibold">{{
                      globalStore.tablesProgress[table.id].roundsComplete
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGlobalStore } from '../../stores/global';
import { useTableStore } from '../../stores/table';
import type { TableConfig } from '../../stores/table';

const globalStore = useGlobalStore();
const tableStore = useTableStore();

// Toggle for hiding unavailable tables
const hideUnavailableTables = ref(false);

// Computed property to filter tables based on toggle
const filteredTables = computed(() => {
  const allTables = Object.values(tableStore.tables);

  if (!hideUnavailableTables.value) {
    return allTables;
  }

  return allTables.filter((table) =>
    globalStore.isTableAccessible(table.id, table.minimumBuyIn, table.maxPayout)
  );
});

const getTablePayouts = (table: TableConfig) => {
  const multiplier = table.payoutMultiplier ?? 1.0;
  return {
    honeypot: Math.round(globalStore.config.payoutPerHoneypot * multiplier),
    ant: Math.round(globalStore.config.penaltyPerAnt * multiplier),
  };
};

const getTableButtonText = (table: TableConfig) => {
  // Check if table has reached its limit
  const tableProgress = globalStore.tablesProgress[table.id];
  if (tableProgress && tableProgress.totalProfit >= table.maxPayout) {
    return 'Table Complete';
  }

  if (globalStore.isTableAccessible(table.id, table.minimumBuyIn, table.maxPayout)) {
    return 'Play';
  }
  return 'Insufficient Chips';
};

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
