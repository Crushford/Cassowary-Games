<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-amber-800 to-amber-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-amber-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-yellow-100 mb-6">Round Won!</h2>

        <div class="space-y-4 text-yellow-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-yellow-300"
              >{{ globalStore.player.totalChips }} gold</span
            >
          </div>
        </div>

        <div class="flex gap-4">
          <button
            @click="goToLevels"
            class="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-400 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Back to Farms
          </button>

          <button
            @click="nextRound"
            class="flex-1 bg-[#144b1a] border border-[#2d8b3a] text-green-300 py-3 px-6 rounded-lg font-semibold hover:bg-[#1a5a22] hover:border-[#3a9b4a] transition-all duration-200 shadow-lg hover:shadow-xl"
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
