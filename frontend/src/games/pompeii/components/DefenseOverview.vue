<template>
  <div class="bg-surface-muted rounded-lg p-4 border border-semantic-neutral-600">
    <h3 class="text-base font-semibold text-white mb-3">Defense Overview</h3>

    <!-- Army Section -->
    <div class="mb-4 pb-4 border-b border-semantic-neutral-600">
      <div class="text-xs text-semantic-neutral-400 mb-2">Your Army</div>
      <div v-if="army.length === 0" class="text-sm text-semantic-neutral-500 italic">
        No units recruited yet
      </div>
      <div v-else class="space-y-2 max-h-48 overflow-y-auto">
        <UnitCard v-for="unit in army" :key="unit.id" :unit="unit" />
        <div class="text-xs text-semantic-neutral-400 text-center pt-2">
          Total: {{ armyCount }} units, {{ totalArmyStrength }} strength
        </div>
      </div>
    </div>

    <!-- Defense Stats -->
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-semantic-neutral-400">🛡️ Wall Defense:</span>
        <span class="font-semibold text-semantic-warning-400">+{{ wallDefenseBonus }}</span>
      </div>
      <div v-if="nextRaidTurn > 0" class="flex justify-between">
        <span class="text-semantic-neutral-400">Next Raid:</span>
        <span class="font-semibold">Year {{ nextRaidTurn }}</span>
      </div>
      <div v-if="nextRaidTurn > 0" class="flex justify-between text-xs gap-2">
        <span class="text-semantic-neutral-500 whitespace-nowrap">Raid Strength:</span>
        <span
          class="text-semantic-neutral-300 text-right truncate"
          :title="`${nextRaidStrength} (Rank ${nextRaidRank})`"
          >{{ nextRaidStrength }} (Rank {{ nextRaidRank }})</span
        >
      </div>
      <div class="flex justify-between pt-2 border-t border-semantic-neutral-600 gap-2">
        <span class="text-semantic-neutral-400 whitespace-nowrap">🌋 Years Until Eruption:</span>
        <span class="font-semibold text-semantic-danger-400 whitespace-nowrap">{{
          yearsUntilEruption
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '@/games/pompeii/stores/pompeiiStore';
import UnitCard from './UnitCard.vue';

const store = usePompeiiStore();

const army = computed(() => store.army);
const armyCount = computed(() => store.armyCount);
const totalArmyStrength = computed(() => store.totalArmyStrength);
const wallDefenseBonus = computed(() => store.wallDefenseBonus);
const nextRaidTurn = computed(() => store.nextRaidTurn);
const yearsUntilEruption = computed(() => store.yearsUntilEruption);

const nextRaidStrength = computed(() => {
  const raidNum = Math.floor(nextRaidTurn.value / 20);
  const estimate = store.getEstimatedRaidStrength(raidNum);
  return estimate.strength;
});

const nextRaidRank = computed(() => {
  const raidNum = Math.floor(nextRaidTurn.value / 20);
  const estimate = store.getEstimatedRaidStrength(raidNum);
  return estimate.rank;
});

defineOptions({
  name: 'DefenseOverview',
});
</script>
