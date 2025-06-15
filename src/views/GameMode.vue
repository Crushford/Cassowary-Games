<template>
  <!-- Add Dialogue Box -->
  <DialogueBox />
  <div class="flex flex-col bg-gray-900">
    <div class="w-full max-w-full mx-auto">
      <!-- Stats Bar -->
      <div class="flex justify-between items-center px-4 py-2 bg-gray-800 text-white">
        <div class="flex items-center space-x-2">
          <span class="text-amber-400">🍯</span>
          <span>{{ gameStore.honeyPots }}</span>
        </div>
        <BitesDisplay />
      </div>

      <!-- Level Display -->
      <div class="flex justify-center py-2 bg-gray-800 text-white border-t border-gray-700">
        <div class="flex items-center space-x-2">
          <span class="text-lg font-semibold">Day {{ gameStore.currentDay }}</span>
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

      <PlayGrid />
      <!-- Digging Mode Toggle -->
      <div class="flex justify-center py-2 bg-gray-800 text-white border-t border-gray-700">
        <DiggingModeToggle />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import PlayGrid from '../components/PlayGrid.vue';
import { onMounted } from 'vue';
import DiggingModeToggle from '../components/DiggingModeToggle.vue';
import BitesDisplay from '../components/BitesDisplay.vue';
import DialogueBox from '../components/DialogueBox.vue';

const gameStore = useGameStore();

onMounted(() => {
  gameStore.findValidPuzzleWithSteps();
});

defineOptions({
  name: 'GameMode',
});
</script>
