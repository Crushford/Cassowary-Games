<template>
  <div class="w-full bg-semantic-neutral-800 rounded-lg p-4 mb-6">
    <h2 class="text-xl font-bold text-white mb-4">City Status</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Wall Upgrades Section -->
      <div class="bg-semantic-neutral-700 rounded p-4">
        <h3 class="text-sm font-semibold text-semantic-neutral-300 mb-2">Wall Upgrades</h3>
        <div class="text-2xl font-bold text-white">
          {{ wallUpgradesCount }}
        </div>
      </div>

      <!-- City Production Centers Section -->
      <div class="bg-semantic-neutral-700 rounded p-4">
        <h3 class="text-sm font-semibold text-semantic-neutral-300 mb-2">
          City Production Centers
        </h3>
        <div class="text-2xl font-bold text-white mb-1">
          {{ cityProductionCentersCount }}
        </div>
        <div class="text-sm text-semantic-neutral-400">
          Income from production: {{ cityProductionIncome }} gold / year
        </div>
      </div>

      <!-- City Revenue Upgrades Section -->
      <div class="bg-semantic-neutral-700 rounded p-4">
        <h3 class="text-sm font-semibold text-semantic-neutral-300 mb-2">City Revenue Upgrades</h3>
        <div class="text-2xl font-bold text-white mb-1">
          {{ cityRevenueUpgradesCount }}
        </div>
        <div class="text-sm text-semantic-neutral-400">
          Income from upgrades: +{{ cityUpgradeIncome }} gold / year
        </div>
      </div>
    </div>

    <!-- Total Income -->
    <div class="mt-4 pt-4 border-t border-semantic-neutral-600">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-semantic-neutral-300">City income</span>
          <span class="text-lg font-bold text-semantic-success-400">
            {{ cityIncome }} gold / year
          </span>
        </div>
        <div v-if="countrysideIncome > 0" class="flex items-center justify-between">
          <span class="text-sm font-semibold text-semantic-neutral-300">Countryside income</span>
          <span class="text-lg font-bold text-semantic-success-400">
            {{ countrysideIncome }} gold / year
          </span>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-semantic-neutral-600">
          <span class="text-lg font-semibold text-semantic-neutral-300">Total income</span>
          <span class="text-xl font-bold text-semantic-warning-400">
            {{ totalCityIncomePerTurn }} gold / year
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';

const store = usePompeiiStore();

const wallUpgradesCount = computed(() => store.wallUpgradesCount);
const cityProductionCentersCount = computed(() => store.cityProductionCentersCount);
const cityRevenueUpgradesCount = computed(() => store.cityRevenueUpgradesCount);
const cityProductionIncome = computed(() => store.cityProductionIncome);
const cityUpgradeIncome = computed(() => store.cityUpgradeIncome);
const countrysideIncome = computed(() => store.countrysideIncome);
const totalCityIncomePerTurn = computed(() => store.totalCityIncomePerTurn);
const cityIncome = computed(() => cityProductionIncome.value + cityUpgradeIncome.value);

defineOptions({
  name: 'PompeiiSummary',
});
</script>
