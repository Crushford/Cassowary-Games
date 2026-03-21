<template>
  <div class="bg-semantic-neutral-800 rounded-lg p-4 border border-semantic-neutral-700">
    <h3 class="text-lg font-bold text-white mb-3">Timeline</h3>
    <div class="space-y-3">
      <!-- Current Year -->
      <div class="flex items-center justify-between pb-2 border-b border-semantic-neutral-700">
        <span class="text-sm text-semantic-neutral-400">Current Year:</span>
        <span class="text-lg font-bold text-white">{{ turnCounter }}</span>
      </div>

      <!-- Years Until Eruption -->
      <div class="flex items-center justify-between pb-2 border-b border-semantic-neutral-700">
        <span class="text-sm text-semantic-neutral-400">Years Until Eruption:</span>
        <span class="text-lg font-bold text-semantic-danger-400">{{ yearsUntilEruption }}</span>
      </div>

      <!-- Next Raid -->
      <div v-if="yearsUntilEruption > 0" class="space-y-2">
        <div class="text-sm text-semantic-neutral-400 mb-2">Upcoming Raids:</div>
        <div
          v-for="raid in upcomingRaids"
          :key="raid.year"
          class="flex items-center justify-between p-2 bg-semantic-neutral-700 rounded"
          :class="{ 'ring-2 ring-semantic-warning-500': raid.isNext }"
        >
          <div>
            <div class="text-sm font-semibold text-white">
              Year {{ raid.year }} - Raid #{{ raid.number }}
            </div>
            <div class="text-xs text-semantic-neutral-400 mt-1">
              Strength: {{ raid.strength }}, Rank: {{ raid.rank }} (d{{ raid.dieSize }})
            </div>
          </div>
          <div v-if="raid.isNext" class="text-xs text-semantic-warning-400 font-semibold">
            {{ raid.yearsUntil }} years
          </div>
        </div>
      </div>

      <!-- Eruption -->
      <div class="mt-3 pt-3 border-t border-semantic-neutral-700">
        <div class="flex items-center justify-between p-2 bg-feedback-dangerSoft rounded">
          <div>
            <div class="text-sm font-semibold text-semantic-danger-400">
              Year {{ eruptionYear }} - Eruption
            </div>
            <div class="text-xs text-semantic-neutral-400 mt-1">Vesuvius erupts!</div>
          </div>
          <div class="text-xs text-semantic-danger-400 font-semibold">
            {{ yearsUntilEruption }} years
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '@/games/pompeii/stores/pompeiiStore';

const store = usePompeiiStore();

const turnCounter = computed(() => store.turnCounter);
const yearsUntilEruption = computed(() => store.yearsUntilEruption);
const eruptionYear = computed(() => store.eruptionYear);

const upcomingRaids = computed(() => {
  const raids = [];
  const currentRaidNumber = Math.floor(turnCounter.value / 20);
  const nextRaidYear = (currentRaidNumber + 1) * 20;

  // Show next 5 raids or until eruption
  for (let i = 1; i <= 5; i++) {
    const raidNumber = currentRaidNumber + i;
    const raidYear = raidNumber * 20;

    if (raidYear > eruptionYear.value) break;

    const estimate = store.getEstimatedRaidStrength(raidNumber);
    raids.push({
      year: raidYear,
      number: raidNumber,
      strength: estimate.strength,
      rank: estimate.rank,
      dieSize: estimate.dieSize,
      isNext: i === 1,
      yearsUntil: raidYear - turnCounter.value,
    });
  }

  return raids;
});

defineOptions({
  name: 'Timeline',
});
</script>
