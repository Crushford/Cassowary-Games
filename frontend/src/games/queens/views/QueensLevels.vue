<template>
  <div
    class="relative h-svh w-full max-w-[480px] mx-auto bg-semantic-neutral-800 text-white flex flex-col overflow-hidden"
  >
    <div
      v-if="isStartingCampaign"
      class="absolute inset-0 z-20 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
    >
      <div
        class="flex flex-col items-center gap-3 rounded-2xl border border-semantic-neutral-700 bg-surface-darkSoft px-6 py-5 text-center shadow-xl"
      >
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-semantic-neutral-700 border-t-semantic-warning-400"
          aria-hidden="true"
        ></div>
        <div class="text-sm font-semibold text-semantic-neutral-100">Starting campaign...</div>
      </div>
    </div>

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
    <div v-else class="flex-1 flex flex-col justify-between px-6 py-4">
      <!-- Main menu -->
      <div v-if="!showExperimental" class="flex flex-col justify-between h-full">
        <!-- Top group -->
        <div class="space-y-4">
          <button
            class="w-full py-4 px-6 bg-group-yellow-base hover:bg-group-yellow-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left disabled:cursor-wait disabled:opacity-70"
            :disabled="isStartingCampaign"
            :aria-busy="isStartingCampaign"
            @click="startCampaign"
          >
            <div class="mb-1 flex items-center gap-3 text-xl font-bold">
              <span
                v-if="isStartingCampaign"
                class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-group-yellow-soft border-t-white"
                aria-hidden="true"
              ></span>
              <span>{{ queensStore.storyUnlockedLevelIndex > 0 ? 'Continue Game' : 'Start Game' }}</span>
            </div>
            <div class="text-sm opacity-90">
              {{
                queensStore.storyUnlockedLevelIndex > 0
                  ? 'Keep going where you left off'
                  : 'Start your puzzle solving on the smallest, easiest puzzle'
              }}
            </div>
          </button>

          <button
            class="w-full py-4 px-6 bg-group-indigo-base hover:bg-group-indigo-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
            @click="goToCampaignSelector"
          >
            <div class="text-xl font-bold mb-1">Select Level</div>
            <div class="text-sm opacity-90">
              Browse the full story map, replay farms, and check what unlocks next
            </div>
          </button>

          <button
            class="w-full py-4 px-6 bg-group-blue-base hover:bg-group-blue-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
            @click="openMenuMode('single')"
          >
            <div class="text-xl font-bold mb-1">Play Custom Puzzle</div>
            <div class="text-sm opacity-90">Select and play any kind of puzzle you want</div>
          </button>
        </div>

        <!-- Bottom group -->
        <div class="space-y-3">
          <button
            class="w-full py-4 px-6 bg-group-purple-base hover:bg-group-purple-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
            @click="showExperimental = true"
          >
            <div class="text-xl font-bold mb-1">Experimental Modes 🧪</div>
            <div class="text-sm opacity-90">Speed, Rotate, Incremental, and Infinite modes</div>
          </button>

          <button
            class="w-full py-4 px-6 bg-group-green-base hover:bg-group-green-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
            @click="openMenuMode('records')"
          >
            <div class="text-xl font-bold mb-1">Records 🏆</div>
            <div class="text-sm opacity-90">View your best times and records</div>
          </button>
        </div>
      </div>

      <!-- Experimental modes submenu -->
      <div v-else class="w-full space-y-4">
        <button
          class="flex items-center gap-2 text-semantic-neutral-300 hover:text-white transition-colors duration-200 mb-2"
          @click="showExperimental = false"
        >
          <span class="text-lg">←</span>
          <span class="text-sm font-medium">Back to main menu</span>
        </button>

        <button
          class="w-full py-4 px-6 bg-group-red-base hover:bg-group-red-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="openMenuMode('speed')"
        >
          <div class="text-xl font-bold mb-1">Speed Mode ⚡</div>
          <div class="text-sm opacity-90">Race against the clock</div>
        </button>

        <button
          class="w-full py-4 px-6 bg-group-teal-base hover:bg-group-teal-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="openMenuMode('rotate')"
        >
          <div class="text-xl font-bold mb-1">Rotate Mode 🔄</div>
          <div class="text-sm opacity-90">Board rotates 90° after every move</div>
        </button>

        <button
          class="w-full py-4 px-6 bg-group-purple-base hover:bg-group-purple-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="goToIncrementalMode"
        >
          <div class="text-xl font-bold mb-1">Incremental Queens</div>
          <div class="text-sm opacity-90">Timed run mode with persistent upgrades</div>
        </button>

        <button
          class="w-full py-4 px-6 bg-group-green-base hover:bg-group-green-strong text-white font-semibold rounded-lg transition-colors duration-200 text-left"
          @click="goToInfiniteMode"
        >
          <div class="text-xl font-bold mb-1">Infinite Mode ♾️</div>
          <div class="text-sm opacity-90">Play the stitched world as it expands</div>
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
      @close="closeMenuMode('speed')"
    />
    <RecordsModal :is-visible="queensStore.showRecordsModal" @close="closeMenuMode('records')" />
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
const isStartingCampaign = ref(false);
const showExperimental = ref(false);
const router = useRouter();
const route = useRoute();

type QueensMenuMode = 'single' | 'speed' | 'rotate' | 'records';

function goToIncrementalMode() {
  router.push('/queens/incremental');
}

function goToInfiniteMode() {
  router.push('/queens/infinite');
}

function goToCampaignSelector() {
  router.push('/queens/campaign');
}

async function startCampaign() {
  if (isStartingCampaign.value) {
    return;
  }

  isStartingCampaign.value = true;
  try {
    await queensStore.startCampaign();
  } catch (error) {
    isStartingCampaign.value = false;
    throw error;
  }
}

function openMenuMode(mode: QueensMenuMode) {
  router.push({
    path: '/queens',
    query: {
      mode,
    },
  });
}

onMounted(async () => {
  if (!queensStore.puzzleDatabase && queensStore.getCampaignBuckets().length === 0) {
    await queensStore.loadCampaignCatalog();
  }
});

watch(
  () => route.query.mode,
  (mode) => {
    queensStore.showSinglePuzzleModeModal = mode === 'single';
    speedModeStore.showSpeedModeModal = mode === 'speed';
    showRotateModeModal.value = mode === 'rotate';
    queensStore.showRecordsModal = mode === 'records';
  },
  { immediate: true }
);

function closeSinglePuzzleSelector() {
  queensStore.closeSinglePuzzleModeModal();
  closeMenuMode('single');
}

function closeRotateModeSelector() {
  showRotateModeModal.value = false;
  closeMenuMode('rotate');
}

function closeMenuMode(expectedMode: QueensMenuMode) {
  if (route.query.mode !== expectedMode) {
    return;
  }

  const back = typeof window.history.state?.back === 'string' ? window.history.state.back : null;
  if (back) {
    router.back();
    return;
  }

  router.replace('/queens');
}

defineOptions({
  name: 'QueensLevels',
});
</script>
