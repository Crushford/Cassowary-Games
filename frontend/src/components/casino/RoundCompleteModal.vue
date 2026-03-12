<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-semantic-warning-800 to-semantic-warning-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-semantic-warning-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-semantic-warning-100 mb-6">
          {{ isWon ? 'Round Won!' : 'Busted!' }}
        </h2>

        <div class="space-y-4 text-semantic-warning-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-semantic-warning-300"
              >{{ globalStore.player.totalChips }} chips</span
            >
          </div>

          <!-- Round winnings -->
          <div
            v-if="roundStore.boardSize && globalStore.sizeProgress[roundStore.boardSize]"
            class="flex justify-between"
          >
            <span class="text-lg">Winnings this round:</span>
            <span
              class="font-semibold"
              :class="roundWinnings < 0 ? 'text-semantic-danger-300' : 'text-semantic-success-300'"
              >{{ roundWinnings > 0 ? '+' : '' }}{{ roundWinnings }} chips</span
            >
          </div>

          <div v-if="roundStore.boardSize" class="pt-4 border-t border-semantic-warning-600">
            <!-- Rounds Complete -->
            <div
              v-if="roundStore.boardSize && globalStore.sizeProgress[roundStore.boardSize]"
              class="mt-4 space-y-2 text-sm"
            >
              <div class="flex justify-between">
                <span>Rounds Complete:</span>
                <span class="text-semantic-success-300 font-semibold">{{
                  globalStore.totalRoundsComplete
                }}</span>
              </div>
              <div
                v-if="globalStore.sizeProgress[roundStore.boardSize].currentPuzzleIdOrName"
                class="flex justify-between"
              >
                <span>Current Puzzle:</span>
                <span class="text-semantic-info-300 font-semibold text-xs truncate">
                  {{ globalStore.sizeProgress[roundStore.boardSize].currentPuzzleIdOrName }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-4">
          <!-- Show Cash Out and Next Round for winners -->
          <template v-if="isWon">
            <button
              class="flex-1 bg-gradient-to-r from-semantic-warning-600 to-semantic-warning-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-semantic-warning-500 hover:to-semantic-warning-400 transition-all duration-200 shadow-lg hover:shadow-xl"
              @click="async () => await tableStore.goToTables()"
            >
              Back to Tables
            </button>

            <button
              class="flex-1 bg-plaque-forestDeep border border-plaque-forestBright text-semantic-success-300 py-3 px-6 rounded-lg font-semibold hover:bg-nature-leafMid hover:border-nature-leafBrightest transition-all duration-200 shadow-lg hover:shadow-xl"
              @click="tableStore.handleNextRound"
            >
              Next Round
            </button>
          </template>

          <!-- Show only Restart for busted players -->
          <template v-else>
            <button
              class="w-full bg-gradient-to-r from-semantic-danger-600 to-semantic-danger-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-semantic-danger-500 hover:to-semantic-danger-400 transition-all duration-200 shadow-lg hover:shadow-xl"
              @click="globalStore.restart"
            >
              Restart Game
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoundStore } from '../../stores/round';
import { useTableStore } from '../../stores/table';
import { useGlobalStore } from '../../stores/global';

const roundStore = useRoundStore();
const tableStore = useTableStore();
const globalStore = useGlobalStore();

const roundWinnings = computed(() => {
  // Round winnings no longer tracked separately in new system
  return 0;
});

const isWon = computed(() => tableStore.status === 'won');

defineOptions({
  name: 'RoundCompleteModal',
});
</script>
