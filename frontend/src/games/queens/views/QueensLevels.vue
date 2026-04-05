<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-semantic-neutral-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <div class="flex-none p-6 text-center">
      <h1 class="text-4xl font-bold mb-2 text-semantic-danger-400">Queens Game</h1>
      <p class="text-semantic-neutral-300">Choose a game mode</p>
    </div>

    <!-- Loading state -->
    <div v-if="queensStore.isLoadingPuzzles" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="text-semantic-warning-200 text-xl mb-4">{{ queensStore.loadingMessage }}</div>
        <div
          v-if="queensStore.loadingProgress > 0"
          class="w-64 bg-semantic-neutral-700 rounded-full h-2"
        >
          <div
            class="bg-semantic-warning-500 h-2 rounded-full transition-all duration-300"
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
          class="w-full py-4 px-6 bg-semantic-info-600 hover:bg-semantic-info-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="queensStore.openSinglePuzzleModeModal()"
        >
          <div class="text-xl font-bold mb-1">Single Puzzle Mode</div>
          <div class="text-sm opacity-90">Play puzzles one at a time</div>
        </button>

        <!-- Speed Mode Button -->
        <button
          class="w-full py-4 px-6 bg-semantic-warning-600 hover:bg-semantic-warning-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="speedModeStore.openModal()"
        >
          <div class="text-xl font-bold mb-1">Speed Mode ⚡</div>
          <div class="text-sm opacity-90">Race against the clock</div>
        </button>

        <!-- Rotate Mode Button -->
        <button
          class="w-full py-4 px-6 bg-semantic-success-600 hover:bg-semantic-success-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="showRotateModeModal = true"
        >
          <div class="text-xl font-bold mb-1">Rotate Mode 🔄</div>
          <div class="text-sm opacity-90">Board rotates 90° after every move</div>
        </button>

        <!-- Incremental Mode Button -->
        <button
          class="w-full py-4 px-6 bg-semantic-success-600 hover:bg-semantic-success-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="goToIncrementalMode"
        >
          <div class="text-xl font-bold mb-1">Incremental Queens 🧪</div>
          <div class="text-sm opacity-90">Timed run mode with persistent upgrades</div>
        </button>

        <!-- Records Button -->
        <button
          class="w-full py-4 px-6 bg-semantic-info-600 hover:bg-semantic-info-500 text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="queensStore.openRecordsModal()"
        >
          <div class="text-xl font-bold mb-1">Records 🏆</div>
          <div class="text-sm opacity-90">View your best times and records</div>
        </button>
      </div>
    </div>

    <!-- Modals -->
    <SinglePuzzleModeModal
      :is-visible="queensStore.showSinglePuzzleModeModal"
      @close="closeSinglePuzzleSelector()"
    />
    <SinglePuzzleModeModal
      mode="rotate"
      :is-visible="showRotateModeModal"
      @close="closeRotateModeSelector()"
    />
    <SpeedModeModal
      :is-visible="speedModeStore.showSpeedModeModal"
      @close="speedModeStore.closeModal()"
    />
    <RecordsModal
      :is-visible="queensStore.showRecordsModal"
      @close="queensStore.closeRecordsModal()"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueensStore } from '../stores/queensStore';
import { useSpeedModeStore } from '../stores/speedModeStore';

const SinglePuzzleModeModal = defineAsyncComponent(
  () => import('../components/queens/SinglePuzzleModeModal.vue')
);
const SpeedModeModal = defineAsyncComponent(
  () => import('../components/queens/SpeedModeModal.vue')
);
const RecordsModal = defineAsyncComponent(() => import('../components/queens/RecordsModal.vue'));

const queensStore = useQueensStore();
const speedModeStore = useSpeedModeStore();
const showRotateModeModal = ref(false);
const router = useRouter();
const route = useRoute();

function goToIncrementalMode() {
  router.push('/queens/incremental');
}

onMounted(async () => {
  if (!queensStore.puzzleDatabase) {
    await queensStore.loadPuzzleDatabase();
  }
});

watch(
  () => route.query.mode,
  (mode) => {
    queensStore.showSinglePuzzleModeModal = mode === 'single';
    showRotateModeModal.value = mode === 'rotate';
  },
  { immediate: true }
);

function closeSinglePuzzleSelector() {
  queensStore.closeSinglePuzzleModeModal();
  if (route.query.mode === 'single') {
    router.replace('/queens');
  }
}

function closeRotateModeSelector() {
  showRotateModeModal.value = false;
  if (route.query.mode === 'rotate') {
    router.replace('/queens');
  }
}

defineOptions({
  name: 'QueensLevels',
});
</script>
