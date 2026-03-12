<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div class="text-white">
      <h2
        class="text-3xl font-bold mb-4"
        :class="isEruption ? 'text-semantic-danger-500' : 'text-semantic-danger-500'"
      >
        {{ isEruption ? '🌋 Vesuvius Erupts!' : 'Game Over' }}
      </h2>

      <div class="mb-6">
        <p class="text-lg mb-2">{{ gameOverReason }}</p>
        <p class="text-semantic-neutral-300 text-sm">You survived until year {{ turnCounter }}</p>
      </div>

      <div class="bg-semantic-neutral-700 rounded p-4 mb-6">
        <h3 class="text-lg font-semibold mb-3">Final Stats</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-semantic-neutral-400">Years Survived:</span>
            <span class="font-semibold">{{ turnCounter }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-semantic-neutral-400">Gold:</span>
            <span class="font-semibold">{{ gold }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-semantic-neutral-400">Final Income per Turn:</span>
            <span class="font-semibold text-semantic-success-400"
              >{{ totalIncomePerTurn }} gold</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-semantic-neutral-400">Wall Defense Bonus:</span>
            <span class="font-semibold text-semantic-warning-400">+{{ wallDefenseBonus }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-semantic-neutral-400">Army Strength:</span>
            <span class="font-semibold">{{ totalArmyStrength }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-semantic-neutral-400">Raids Defeated:</span>
            <span class="font-semibold">{{ raidsDefeated }}</span>
          </div>
        </div>
      </div>

      <div v-if="isEruption" class="bg-feedback-warningSoft rounded p-4 mb-6">
        <h3 class="text-lg font-semibold mb-2 text-semantic-warning-400">Prosperity Score</h3>
        <div class="text-2xl font-bold text-semantic-warning-300">{{ prosperityScore }}</div>
        <div class="text-xs text-semantic-neutral-400 mt-2">
          Based on income, infrastructure, and survival
        </div>
      </div>

      <button
        class="w-full bg-semantic-success-600 hover:bg-semantic-success-700 text-white font-semibold py-3 px-4 rounded transition-colors"
        @click="resetGame"
      >
        Start New Game
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Modal from '../shared/Modal.vue';

const store = usePompeiiStore();

const isVisible = computed(() => store.gameOver);
const gameOverReason = computed(() => store.gameOverReason || 'Game Over');
const turnCounter = computed(() => store.turnCounter);
const gold = computed(() => store.gold);
const totalIncomePerTurn = computed(() => store.totalCityIncomePerTurn);
const wallDefenseBonus = computed(() => store.wallDefenseBonus);
const totalArmyStrength = computed(() => store.totalArmyStrength);

const isEruption = computed(() => {
  return store.gameOverReason === 'Vesuvius erupts!' || turnCounter.value >= store.eruptionYear;
});

const raidsDefeated = computed(() => {
  // Count successful raids (every 20 years, up to current year)
  return Math.floor(turnCounter.value / 20);
});

const prosperityScore = computed(() => {
  if (!isEruption.value) return 0;
  // Calculate score based on:
  // - Final income per turn
  // - Infrastructure (wall upgrades + city cards + countryside cards)
  // - Army strength
  // - Years survived (bonus for reaching eruption)
  const infrastructureScore =
    store.wallUpgradesCount * 10 +
    store.cityProductionCentersCount * 5 +
    store.cityRevenueUpgradesCount * 8 +
    store.zones.countryside.filter((s) => s.cardId !== null).length * 5;
  const incomeScore = totalIncomePerTurn.value * 2;
  const armyScore = totalArmyStrength.value * 3;
  const survivalBonus = turnCounter.value >= store.eruptionYear ? 100 : 0;

  return infrastructureScore + incomeScore + armyScore + survivalBonus;
});

function resetGame(): void {
  store.resetGame();
}

function handleClose(): void {
  // Don't allow closing - must reset game
}

defineOptions({
  name: 'GameOver',
});
</script>
