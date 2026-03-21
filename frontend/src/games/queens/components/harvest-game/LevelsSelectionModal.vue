<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-semantic-warning-900 via-amber-800 to-semantic-warning-700 rounded-lg p-6 w-full h-full max-w-4xl h-[100dvh] overflow-y-auto shadow-2xl border-2 border-semantic-warning-600"
    >
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-4xl font-bold text-semantic-warning-100 mb-2">Honey Pot Ant Farming</h1>
        <p class="text-semantic-warning-200">Select what size of farm you want to work on</p>
        <div class="mt-4 text-semantic-warning-100">
          <span class="text-lg">Your Gold: </span>
          <span class="text-2xl font-bold text-semantic-warning-300"
            >{{ globalStore.player.totalChips }} gold</span
          >
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="!levelStore.loaded" class="text-center py-12">
        <div class="text-semantic-warning-200 text-xl">Loading farms...</div>
      </div>

      <!-- Farms grid -->
      <div v-else>
        <!-- No farms available message -->
        <div v-if="levels.length === 0" class="text-center py-12">
          <div class="text-semantic-warning-200 text-xl mb-4">No farms available</div>
        </div>

        <!-- Farms grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="level in levels"
            :key="level.boardSize"
            class="bg-gradient-to-br from-semantic-warning-800 to-semantic-warning-700 rounded-lg p-4 shadow-lg border-2 border-semantic-warning-600 hover:border-semantic-warning-400 transition-all duration-200"
          >
            <div class="text-center">
              <div class="flex items-center justify-center gap-2 mb-2">
                <h3 class="text-xl font-bold text-semantic-warning-100">
                  {{ level.boardSize }} Farm
                </h3>
              </div>
              <div class="space-y-2 text-semantic-warning-200 text-sm">
                <div class="flex justify-between">
                  <span>Farm Size:</span>
                  <span class="font-semibold text-semantic-warning-300">{{ level.boardSize }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Multiplier:</span>
                  <span class="font-semibold text-semantic-info-300"
                    >{{ level.payoutMultiplier }}x</span
                  >
                </div>
                <div class="flex justify-between">
                  <span>Honeypot Reward:</span>
                  <span class="font-semibold text-semantic-success-300"
                    >+{{ getLevelPayouts(level).honeypot }} gold</span
                  >
                </div>
                <div class="flex justify-between">
                  <span>Ant Penalty:</span>
                  <span class="font-semibold text-semantic-danger-300"
                    >-{{ getLevelPayouts(level).ant }} gold</span
                  >
                </div>
              </div>

              <div class="mt-4">
                <button
                  v-if="isUnlocked(level)"
                  class="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-semantic-warning-500 to-semantic-warning-400 text-semantic-warning-900 hover:from-semantic-warning-400 hover:to-semantic-warning-300 shadow-lg hover:shadow-xl"
                  @click="playLevel(level.boardSize)"
                >
                  {{ getLevelButtonText(level) }}
                </button>
                <button
                  v-else
                  :disabled="globalStore.player.totalChips < level.purchaseCost"
                  class="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="
                    globalStore.player.totalChips >= level.purchaseCost
                      ? 'bg-gradient-to-r from-semantic-success-500 to-semantic-success-400 text-white hover:from-semantic-success-400 hover:to-semantic-success-300 shadow-lg hover:shadow-xl'
                      : 'bg-semantic-neutral-600 text-semantic-neutral-300'
                  "
                  @click="purchaseLevel(level)"
                >
                  Purchase ({{ level.purchaseCost }} gold)
                </button>
              </div>

              <!-- Game in progress indicator -->
              <div
                v-if="
                  isUnlocked(level) &&
                  globalStore.sizeProgress[level.boardSize]?.currentPuzzleIdOrName
                "
                class="mt-3 text-xs text-semantic-warning-200"
              >
                <div class="text-center text-semantic-success-300 font-semibold">
                  Game in Progress
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
import { computed } from 'vue';
import { useGlobalStore } from '../../stores/global';
import { useLevelStore } from '../../stores/level';
import type { LevelConfig } from '../../stores/level';

const globalStore = useGlobalStore();
const levelStore = useLevelStore();

const levels = computed(() => {
  return Object.values(levelStore.levels);
});

const getLevelPayouts = (level: LevelConfig) => {
  const multiplier = level.payoutMultiplier ?? 1.0;
  return {
    honeypot: Math.round(globalStore.config.payoutPerHoneypot * multiplier),
    ant: Math.round(globalStore.config.penaltyPerAnt * multiplier),
  };
};

const isUnlocked = (level: LevelConfig): boolean => {
  return globalStore.unlockedSizes.has(level.boardSize);
};

const getLevelButtonText = (level: LevelConfig) => {
  if (globalStore.sizeProgress[level.boardSize]?.currentPuzzleIdOrName) {
    return 'Continue';
  }
  return 'Play';
};

const playLevel = async (boardSize: string) => {
  try {
    await globalStore.sitAtSize(boardSize);
  } catch (error) {
    console.error('Failed to start level:', error);
  }
};

const purchaseLevel = async (level: LevelConfig) => {
  if (globalStore.player.totalChips >= level.purchaseCost) {
    globalStore.unlockSize(level.boardSize, level.purchaseCost);
    await playLevel(level.boardSize);
  }
};

defineOptions({
  name: 'LevelsSelectionModal',
});
</script>
