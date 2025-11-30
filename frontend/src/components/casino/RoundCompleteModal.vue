<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-gradient-to-br from-amber-800 to-amber-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-amber-600"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-yellow-100 mb-6">
          {{ isWon ? 'Round Won!' : 'Busted!' }}
        </h2>

        <div class="space-y-4 text-yellow-200 mb-8">
          <div class="flex justify-between">
            <span class="text-lg">Current balance:</span>
            <span class="font-semibold text-yellow-300"
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
              :class="roundWinnings < 0 ? 'text-red-300' : 'text-green-300'"
              >{{ roundWinnings > 0 ? '+' : '' }}{{ roundWinnings }} chips</span
            >
          </div>

          <div v-if="roundStore.boardSize" class="pt-4 border-t border-amber-600">
            <!-- Rounds Complete -->
            <div
              v-if="roundStore.boardSize && globalStore.sizeProgress[roundStore.boardSize]"
              class="mt-4 space-y-2 text-sm"
            >
              <div class="flex justify-between">
                <span>Rounds Complete:</span>
                <span class="text-green-300 font-semibold">{{
                  globalStore.totalRoundsComplete
                }}</span>
              </div>
              <div
                v-if="globalStore.sizeProgress[roundStore.boardSize].currentPuzzleIdOrName"
                class="flex justify-between"
              >
                <span>Current Puzzle:</span>
                <span class="text-blue-300 font-semibold text-xs truncate">
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
              @click="async () => await tableStore.goToTables()"
              class="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-400 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Back to Tables
            </button>

            <button
              @click="tableStore.handleNextRound"
              class="flex-1 bg-[#144b1a] border border-[#2d8b3a] text-green-300 py-3 px-6 rounded-lg font-semibold hover:bg-[#1a5a22] hover:border-[#3a9b4a] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Next Round
            </button>
          </template>

          <!-- Show only Restart for busted players -->
          <template v-else>
            <button
              @click="globalStore.restart"
              class="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-200 shadow-lg hover:shadow-xl"
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

const totalProfit = computed(() => {
  // Table progress no longer tracked in new system
  return 0;
});

const roundWinnings = computed(() => {
  // Round winnings no longer tracked separately in new system
  return 0;
});

const isWon = computed(() => tableStore.status === 'won');

defineOptions({
  name: 'RoundCompleteModal',
});
</script>
