<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <div class="flex-none p-6 text-center">
      <h1 class="text-4xl font-bold mb-2 text-pink-400">Queens Game</h1>
      <p class="text-gray-300">Choose a game mode</p>
    </div>

    <!-- Loading state -->
    <div v-if="queensStore.isLoadingPuzzles" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="text-yellow-200 text-xl mb-4">{{ queensStore.loadingMessage }}</div>
        <div v-if="queensStore.loadingProgress > 0" class="w-64 bg-gray-700 rounded-full h-2">
          <div
            class="bg-yellow-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${queensStore.loadingProgress}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Game mode selection -->
    <div v-else class="flex-1 flex items-center justify-center px-6">
      <div class="w-full space-y-4">
        <!-- Single Puzzle Mode Button -->
        <button
          @click="queensStore.openSinglePuzzleModeModal()"
          class="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
        >
          <div class="text-xl font-bold mb-1">Single Puzzle Mode</div>
          <div class="text-sm opacity-90">Play puzzles one at a time</div>
        </button>

        <!-- Speed Mode Button -->
        <button
          @click="queensStore.openSpeedModeModal()"
          class="w-full py-4 px-6 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
        >
          <div class="text-xl font-bold mb-1">Speed Mode ⚡</div>
          <div class="text-sm opacity-90">Race against the clock</div>
        </button>

        <!-- Records Button -->
        <button
          @click="queensStore.openRecordsModal()"
          class="w-full py-4 px-6 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
        >
          <div class="text-xl font-bold mb-1">Records 🏆</div>
          <div class="text-sm opacity-90">View your best times and records</div>
        </button>
      </div>
    </div>

    <!-- Modals -->
    <SinglePuzzleModeModal
      :is-visible="queensStore.showSinglePuzzleModeModal"
      @close="queensStore.closeSinglePuzzleModeModal()"
    />
    <SpeedModeModal
      :is-visible="queensStore.showSpeedModeModal"
      @close="queensStore.closeSpeedModeModal()"
    />
    <RecordsModal
      :is-visible="queensStore.showRecordsModal"
      @close="queensStore.closeRecordsModal()"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useQueensStore } from '../stores/queensStore';
import { defineAsyncComponent } from 'vue';

const SinglePuzzleModeModal = defineAsyncComponent(
  () => import('../components/queens/SinglePuzzleModeModal.vue')
);
const SpeedModeModal = defineAsyncComponent(
  () => import('../components/queens/SpeedModeModal.vue')
);
const RecordsModal = defineAsyncComponent(() => import('../components/queens/RecordsModal.vue'));

const queensStore = useQueensStore();

onMounted(async () => {
  // Load puzzles if not already loaded
  if (!queensStore.puzzleDatabase) {
    await queensStore.loadPuzzleDatabase();
  }
});

defineOptions({
  name: 'QueensLevels',
});
</script>
