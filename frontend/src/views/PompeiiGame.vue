<template>
  <div class="min-h-screen w-full bg-gray-900 text-white p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div class="min-w-0">
          <h1 class="text-2xl sm:text-3xl font-bold mb-2">Pompeii</h1>
          <div class="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
            <div class="whitespace-nowrap">
              <span class="text-gray-400">Year</span>
              <span class="ml-2 font-bold text-base sm:text-lg">{{ turnCounter }}</span>
            </div>
            <span class="text-gray-600 hidden sm:inline">|</span>
            <div class="whitespace-nowrap">
              <span class="text-gray-400">Gold</span>
              <span class="ml-2 font-bold text-base sm:text-lg text-yellow-400">🪙 {{ gold }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <DivineFavourWidget />
          <button
            @click="endTurn"
            :disabled="gameOver || currentBattle?.isActive"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 sm:px-6 rounded transition-colors whitespace-nowrap text-sm sm:text-base"
          >
            End Turn
          </button>
        </div>
      </div>

      <!-- Main Content Grid: Three Column Layout -->
      <!-- Desktop: Shop | Board | Defense+Timeline -->
      <!-- Tablet/Mobile: Board | Defense+Timeline | Shop -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Shop (fixed width on desktop, last on mobile) -->
        <div class="lg:w-80 lg:order-1 order-3">
          <UnitShop />
        </div>

        <!-- Center Column: Three-Zone Board (flexible, first on mobile) -->
        <div class="lg:flex-1 lg:min-w-0 lg:order-2 order-1">
          <PompeiiZonesBoard />
        </div>

        <!-- Right Column: Defense Overview + Timeline Widget (fixed width on desktop, second on mobile) -->
        <div class="lg:w-80 lg:order-3 order-2 space-y-4">
          <DefenseOverview />
          <TimelineWidget />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <RaidModal />
    <BattleVisualization />
    <BattleResultModal />
    <GameOver />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../stores/pompeiiStore';
import PompeiiZonesBoard from '../components/pompeii/PompeiiZonesBoard.vue';
import UnitShop from '../components/pompeii/UnitShop.vue';
import RaidModal from '../components/pompeii/RaidModal.vue';
import BattleVisualization from '../components/pompeii/BattleVisualization.vue';
import BattleResultModal from '../components/pompeii/BattleResultModal.vue';
import GameOver from '../components/pompeii/GameOver.vue';
import DefenseOverview from '../components/pompeii/DefenseOverview.vue';
import TimelineWidget from '../components/pompeii/TimelineWidget.vue';
import DivineFavourWidget from '../components/pompeii/DivineFavourWidget.vue';

const store = usePompeiiStore();

const turnCounter = computed(() => store.turnCounter);
const gold = computed(() => store.gold);
const gameOver = computed(() => store.gameOver);
const currentBattle = computed(() => store.currentBattle);

function endTurn(): void {
  store.endTurn();
}

defineOptions({
  name: 'PompeiiGame',
});
</script>
