<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2">Game Type Select</h1>
        <p class="text-gray-400">Choose your game mode</p>
      </div>

      <div v-if="loading || queensStore.isLoadingPuzzles" class="text-center py-12">
        <div class="max-w-md mx-auto">
          <div class="mb-4">
            <div class="text-xl font-semibold text-blue-400 mb-2">
              {{ queensStore.loadingMessage || 'Loading puzzles...' }}
            </div>
            <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                :style="{ width: `${queensStore.loadingProgress}%` }"
              ></div>
            </div>
            <div class="text-sm text-gray-400 mt-2">
              {{ Math.round(queensStore.loadingProgress) }}%
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <div v-else class="space-y-4">
        <!-- Tutorial Option -->
        <button
          @click="selectTutorial"
          class="w-full p-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all text-left border-2 border-transparent hover:border-blue-400"
        >
          <div class="text-2xl font-bold mb-1">Tutorial</div>
          <div class="text-sm text-blue-100">Learn the basics with 10 guided puzzles</div>
        </button>

        <!-- Single Puzzle Mode Button -->
        <button
          @click="showSinglePuzzleModeModal = true"
          class="w-full p-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg transition-all text-left border-2 border-transparent hover:border-green-400"
        >
          <div class="text-2xl font-bold mb-1">Single Puzzle Mode</div>
          <div class="text-sm text-green-100">Play puzzles at your own pace</div>
        </button>

        <!-- Speed Mode Button -->
        <button
          @click="showSpeedModeModal = true"
          class="w-full p-6 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg transition-all text-left border-2 border-transparent hover:border-yellow-400"
        >
          <div class="text-2xl font-bold mb-1">⚡ Speed Mode</div>
          <div class="text-sm text-yellow-100">Race against the clock!</div>
        </button>
      </div>
    </div>

    <!-- Speed Mode Modal -->
    <SpeedModeModal :is-visible="showSpeedModeModal" @close="showSpeedModeModal = false" />

    <!-- Single Puzzle Mode Modal -->
    <SinglePuzzleModeModal
      :is-visible="showSinglePuzzleModeModal"
      @close="showSinglePuzzleModeModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../stores/queensStore';

const SpeedModeModal = defineAsyncComponent(
  () => import('../components/queens/SpeedModeModal.vue')
);
const SinglePuzzleModeModal = defineAsyncComponent(
  () => import('../components/queens/SinglePuzzleModeModal.vue')
);

const router = useRouter();
const queensStore = useQueensStore();

const loading = ref(true);
const error = ref<string | null>(null);
const showSpeedModeModal = ref(false);
const showSinglePuzzleModeModal = ref(false);

async function loadPuzzles() {
  try {
    loading.value = true;
    error.value = null;

    const success = await queensStore.loadPuzzleDatabase();
    if (!success) {
      throw new Error('Failed to load puzzle database');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load puzzles';
    console.error('Error loading puzzles:', err);
  } finally {
    loading.value = false;
  }
}

function selectTutorial() {
  // Auto-load first tutorial level
  router.push('/queens/tutorial/level-1');
}

onMounted(() => {
  // Reset modal states to ensure nothing is selected when returning to this page
  showSpeedModeModal.value = false;
  showSinglePuzzleModeModal.value = false;
  loadPuzzles();
});

defineOptions({
  name: 'Levels',
});
</script>
