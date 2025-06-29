<template>
  <div
    v-if="gameStore.isComplete"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
  >
    <div
      class="bg-gray-800 p-8 rounded-lg shadow-xl transform transition-all duration-500 scale-100"
    >
      <!-- Training Day Completion -->
      <div v-if="gameStore.isTrainingDay">
        <h2 class="text-2xl font-bold text-green-400 mb-4">Training Complete!</h2>
        <p class="text-white mb-2">Training Day</p>
        <p class="text-white mb-2">Honey Pots: {{ gameStore.honeyPots }}</p>
        <p class="text-white mb-2">Bites: {{ gameStore.bites }}</p>
        <p class="text-white mb-4">Best Day: {{ gameStore.highScore }} Honey Pots</p>
        <div class="flex flex-col space-y-2">
          <button
            @click="gameStore.startRealGame()"
            class="w-full py-3 px-6 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
          >
            Start Real Game (Day 1)
          </button>
          <button
            @click="gameStore.continueTraining()"
            class="w-full py-3 px-6 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Continue Training
          </button>
        </div>
      </div>

      <!-- Regular Game Completion -->
      <div v-else>
        <h2 class="text-2xl font-bold text-amber-400 mb-4">You passed out!</h2>
        <p class="text-white mb-2">Day {{ gameStore.currentDay }}</p>
        <p class="text-white mb-2">Honey Pots: {{ gameStore.honeyPots }}</p>
        <p class="text-white mb-4">Best Day: {{ gameStore.highScore }} Honey Pots</p>
        <button
          @click="gameStore.startNewDay()"
          class="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
        >
          Start Day {{ gameStore.currentDay + 1 }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore';

const gameStore = useGameStore();
</script>

<script lang="ts">
export default {
  name: 'GameCompletionModal',
};
</script>
