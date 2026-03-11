<template>
  <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-white">Upcoming Raids</h3>
      <button
        class="text-xs text-gray-400 hover:text-gray-300 underline"
        @click="showTimelineModal = true"
      >
        View Timeline
      </button>
    </div>
    <div class="space-y-2 text-xs">
      <div v-if="nextRaidTurn > 0" class="flex justify-between">
        <span class="text-gray-400">Next Raid:</span>
        <span class="font-semibold">Year {{ nextRaidTurn }}</span>
      </div>
      <div v-if="nextRaidTurn > 0" class="flex justify-between text-gray-300 gap-2">
        <span class="whitespace-nowrap">Strength:</span>
        <span
          class="text-right truncate"
          :title="`${nextRaidStrength}, Rank ${nextRaidRank} (d${nextRaidDieSize})`"
          >{{ nextRaidStrength }}, Rank {{ nextRaidRank }} (d{{ nextRaidDieSize }})</span
        >
      </div>
      <div class="flex justify-between pt-2 border-t border-gray-600 gap-2">
        <span class="text-gray-400 whitespace-nowrap">🌋 Eruption:</span>
        <span
          class="font-semibold text-red-400 text-right truncate"
          :title="`Year ${eruptionYear} (${yearsUntilEruption} years)`"
          >Year {{ eruptionYear }} ({{ yearsUntilEruption }} years)</span
        >
      </div>
    </div>
  </div>

  <Modal :is-visible="showTimelineModal" @close="showTimelineModal = false">
    <div class="text-white">
      <h2 class="text-xl font-bold mb-4">Timeline</h2>
      <div class="space-y-3">
        <!-- Current Year -->
        <div class="flex items-center justify-between pb-2 border-b border-gray-700">
          <span class="text-sm text-gray-400">Current Year:</span>
          <span class="text-lg font-bold text-white">{{ turnCounter }}</span>
        </div>

        <!-- Years Until Eruption -->
        <div class="flex items-center justify-between pb-2 border-b border-gray-700">
          <span class="text-sm text-gray-400">Years Until Eruption:</span>
          <span class="text-lg font-bold text-red-400">{{ yearsUntilEruption }}</span>
        </div>

        <!-- Upcoming Raids -->
        <div v-if="yearsUntilEruption > 0" class="space-y-2">
          <div class="text-sm text-gray-400 mb-2">Upcoming Raids:</div>
          <div
            v-for="raid in upcomingRaids"
            :key="raid.year"
            class="flex items-center justify-between p-2 bg-gray-700 rounded"
            :class="{ 'ring-2 ring-yellow-500': raid.isNext }"
          >
            <div>
              <div class="text-sm font-semibold text-white">
                Year {{ raid.year }} - Raid #{{ raid.number }}
              </div>
              <div class="text-xs text-gray-400 mt-1">
                Strength: {{ raid.strength }}, Rank: {{ raid.rank }} (d{{ raid.dieSize }})
              </div>
            </div>
            <div v-if="raid.isNext" class="text-xs text-yellow-400 font-semibold">
              {{ raid.yearsUntil }} years
            </div>
          </div>
        </div>

        <!-- Eruption -->
        <div class="mt-3 pt-3 border-t border-gray-700">
          <div class="flex items-center justify-between p-2 bg-red-900/30 rounded">
            <div>
              <div class="text-sm font-semibold text-red-400">
                Year {{ eruptionYear }} - Eruption
              </div>
              <div class="text-xs text-gray-400 mt-1">Vesuvius erupts!</div>
            </div>
            <div class="text-xs text-red-400 font-semibold">{{ yearsUntilEruption }} years</div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Modal from '../shared/Modal.vue';

const store = usePompeiiStore();

const showTimelineModal = ref(false);

const turnCounter = computed(() => store.turnCounter);
const yearsUntilEruption = computed(() => store.yearsUntilEruption);
const eruptionYear = computed(() => store.eruptionYear);
const nextRaidTurn = computed(() => store.nextRaidTurn);

const nextRaidStrength = computed(() => {
  if (nextRaidTurn.value === 0) return 0;
  const raidNum = Math.floor(nextRaidTurn.value / 20);
  const estimate = store.getEstimatedRaidStrength(raidNum);
  return estimate.strength;
});

const nextRaidRank = computed(() => {
  if (nextRaidTurn.value === 0) return 0;
  const raidNum = Math.floor(nextRaidTurn.value / 20);
  const estimate = store.getEstimatedRaidStrength(raidNum);
  return estimate.rank;
});

const nextRaidDieSize = computed(() => {
  if (nextRaidRank.value === 0) return 0;
  const dieMap: Record<number, number> = {
    1: 4,
    2: 6,
    3: 8,
    4: 10,
    5: 12,
  };
  return dieMap[nextRaidRank.value] || 4;
});

const upcomingRaids = computed(() => {
  const raids = [];
  const currentRaidNumber = Math.floor(turnCounter.value / 20);

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
  name: 'TimelineWidget',
});
</script>
