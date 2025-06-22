<template>
  <div
    class="mx-auto bg-gray-800 shadow-2xl overflow-hidden flex flex-col w-full max-w-[480px] h-dvh aspect-[9/19.5] rounded-none sm:rounded-[40px]"
  >
    <!-- Story Component (Fixed 1/3 height) -->
    <div class="h-1/3 min-h-0">
      <Story />
    </div>

    <!-- Game Content (Fixed 2/3 height) -->
    <div class="h-2/3 min-h-0 w-full flex flex-col">
      <div class="flex-1 flex flex-col">
        <!-- Stats Bar -->
        <div class="flex justify-between items-center px-4 py-2 bg-gray-800 text-white">
          <div class="flex items-center space-x-2">
            <span class="text-amber-400">🍯</span>
            <span>{{ gameStore.honeyPots }}</span>
            <span v-if="gameStore.isTrainingDay" class="text-green-400 text-sm ml-2"
              >(Training)</span
            >
          </div>
          <BitesDisplay />
        </div>

        <!-- Level Display -->
        <div class="flex justify-center py-2 bg-gray-800 text-white border-t border-gray-700">
          <div class="flex items-center space-x-2">
            <span class="text-lg font-semibold">{{ gameStore.getDayDisplay }}</span>
          </div>
        </div>

        <!-- Level Complete Animation -->
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

        <!-- Play Grid (Flexible height) -->
        <div class="flex-1 overflow-auto min-h-0">
          <PlayGrid />
        </div>

        <!-- Digging Mode Toggle -->
        <div class="flex justify-center py-2 bg-gray-800 text-white border-t border-gray-700">
          <DiggingModeToggle />
        </div>

        <!-- Training Mode Controls -->
        <div
          v-if="gameStore.isTrainingDay && !gameStore.isComplete"
          class="flex justify-center py-2 bg-gray-800 text-white border-t border-gray-700"
        >
          <button
            @click="gameStore.startRealGame()"
            class="px-4 py-2 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
          >
            Start Real Game
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { defineAsyncComponent } from 'vue';

const PlayGrid = defineAsyncComponent(() => import('../components/gameplay/PlayGrid.vue'));
const DiggingModeToggle = defineAsyncComponent(
  () => import('../components/gameplay/DiggingModeToggle.vue')
);
const BitesDisplay = defineAsyncComponent(() => import('../components/gameplay/BitesDisplay.vue'));
const Story = defineAsyncComponent(() => import('../components/gameplay/Story.vue'));

const gameStore = useGameStore();
const isGameOver = ref(false);

onMounted(() => {
  gameStore.findValidPuzzleWithSteps();
  gameStore.loadHighScore();
  gameStore.loadCurrentDay();

  // If we're at day 0, ensure we're in training mode
  if (gameStore.currentDay === 0) {
    gameStore.isTrainingDay = true;
  }
});

defineOptions({
  name: 'GameMode',
});
</script>
