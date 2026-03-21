<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-semantic-warning-800 to-semantic-warning-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-semantic-warning-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-semantic-warning-100 mb-6">Round Won!</h2>

        <div class="space-y-4 text-semantic-warning-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-semantic-warning-300"
              >{{ globalStore.player.totalChips }} gold</span
            >
          </div>
        </div>

        <div class="flex gap-4">
          <button
            class="flex-1 bg-gradient-to-r from-semantic-warning-600 to-semantic-warning-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-semantic-warning-500 hover:to-semantic-warning-400 transition-all duration-200 shadow-lg hover:shadow-xl"
            @click="goToLevels"
          >
            Back to Farms
          </button>

          <button
            class="flex-1 bg-plaque-forestDeep border border-plaque-forestBright text-semantic-success-300 py-3 px-6 rounded-lg font-semibold hover:bg-nature-leafMid hover:border-nature-leafBrightest transition-all duration-200 shadow-lg hover:shadow-xl"
            @click="nextRound"
          >
            Next Round
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoundStore } from '../../stores/round';
import { useLevelStore } from '../../stores/level';
import { useGlobalStore } from '../../stores/global';

const roundStore = useRoundStore();
const levelStore = useLevelStore();
const globalStore = useGlobalStore();

const goToLevels = async () => {
  levelStore.showRoundComplete = false;
  if (roundStore.boardSize) {
    roundStore.leaveLevel();
  }
};

const nextRound = async () => {
  if (roundStore.boardSize) {
    await levelStore.handleNextRound(roundStore.boardSize, globalStore);
  }
};

defineOptions({
  name: 'RoundCompleteModal',
});
</script>
