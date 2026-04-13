<template>
  <div
    class="min-h-dvh w-screen overflow-x-hidden bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-queens-gradientStart to-queens-gradientEnd text-semantic-neutral-100"
  >
    <div class="mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-8 pt-5">
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="rounded-xl border border-semantic-neutral-700 bg-surface-overlayMid px-3 py-2 text-sm font-semibold text-semantic-neutral-100 transition-colors hover:border-semantic-neutral-500 hover:bg-semantic-neutral-800"
          @click="router.push('/queens')"
        >
          Back
        </button>
        <div class="text-right">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-semantic-warning-300">
            Story Mode
          </p>
          <h1 class="mt-1 text-2xl font-bold text-white">Select Level</h1>
        </div>
      </div>

      <div v-if="isLoading" class="flex min-h-[70svh] items-center justify-center px-1">
        <div
          class="flex flex-col items-center gap-3 rounded-2xl border border-semantic-neutral-700 bg-surface-darkSoft px-6 py-5 text-center shadow-xl"
        >
          <div
            class="h-10 w-10 animate-spin rounded-full border-4 border-semantic-neutral-700 border-t-semantic-warning-400"
            aria-hidden="true"
          ></div>
          <div class="text-sm font-semibold text-semantic-neutral-100">Loading story levels...</div>
        </div>
      </div>

      <div v-else class="pt-4">
        <div
          class="rounded-2xl border border-semantic-neutral-800 bg-surface-overlayFaint px-4 py-3 text-sm text-semantic-neutral-300"
        >
          <span class="font-semibold text-white">Current progress:</span>
          {{
            currentLevelEntry
              ? ` Level ${currentLevelEntry.levelNumber} is your next story farm.`
              : ' No story levels are available yet.'
          }}
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button
            v-for="entry in levelEntries"
            :key="entry.levelNumber"
            type="button"
            class="flex min-h-[168px] flex-col rounded-2xl border p-4 text-left transition-all duration-150"
            :class="tileClass(entry)"
            :disabled="entry.isLocked"
            @click="openLevel(entry)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-[1.65rem] font-bold leading-none text-white">
                  Level {{ entry.levelNumber }}
                </div>
                <div class="mt-3 text-base font-semibold text-semantic-neutral-200">
                  {{ entry.boardSize }}
                </div>
                <div class="mt-2 text-xs uppercase tracking-[0.22em] text-semantic-neutral-400">
                  {{ formatDifficultyLabel(entry.difficulty) }}
                </div>
              </div>
              <span
                v-if="entry.isCompleted"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-feedback-successTint text-lg font-bold text-semantic-success-300"
                aria-hidden="true"
              >
                ✓
              </span>
              <span
                v-else-if="entry.isLocked"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-semantic-neutral-800 text-lg text-semantic-neutral-400"
                aria-hidden="true"
              >
                🔒
              </span>
            </div>

            <div class="mt-auto space-y-2 pt-5 text-xs font-medium">
              <div
                v-if="entry.isCurrent"
                class="inline-flex max-w-full rounded-full border border-edge-warningStrong bg-feedback-warningAlt px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-semantic-warning-200"
              >
                Current
              </div>

              <div class="text-sm text-semantic-neutral-300">
                <span v-if="entry.bestTime !== null"
                  >Best {{ queensStore.formatTime(entry.bestTime) }}</span
                >
                <span v-else-if="entry.isLocked">Locked</span>
                <span v-else-if="entry.isCompleted">Passed</span>
                <span v-else>Ready to play</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore, type QueensCampaignLevelEntry } from '@/games/queens/stores/queensStore';
import type { QueensSelectionDifficulty } from '@/games/queens/utils/puzzleSelectionRoute';

const router = useRouter();
const queensStore = useQueensStore();
const isLoading = ref(false);

const levelEntries = computed(() => queensStore.getCampaignLevelEntries());
const currentLevelEntry = computed(
  () => levelEntries.value.find((entry) => entry.isCurrent) ?? null
);

function formatDifficultyLabel(difficulty: QueensSelectionDifficulty): string {
  return difficulty
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tileClass(entry: QueensCampaignLevelEntry): string {
  if (entry.isLocked) {
    return 'cursor-not-allowed border-semantic-neutral-800 bg-depth-baseMuted text-semantic-neutral-500 opacity-60';
  }

  if (entry.isCurrent) {
    return 'border-semantic-warning-400 bg-feedback-warningSemi shadow-[0_0_0_1px_rgba(251,191,36,0.18)] hover:border-semantic-warning-300 hover:bg-feedback-warningLow';
  }

  if (entry.isCompleted) {
    return 'border-semantic-success-700 bg-edge-successFaint hover:border-semantic-success-500 hover:bg-feedback-successLight';
  }

  return 'border-semantic-neutral-700 bg-surface-overlayMid hover:border-semantic-info-500 hover:bg-semantic-neutral-800';
}

async function openLevel(entry: QueensCampaignLevelEntry) {
  if (entry.isLocked) {
    return;
  }
  await router.push(entry.route);
}

onMounted(async () => {
  if (queensStore.getCampaignBuckets().length > 0) {
    return;
  }

  isLoading.value = true;
  try {
    await queensStore.loadCampaignCatalog();
  } finally {
    isLoading.value = false;
  }
});
</script>

<script lang="ts">
export default {
  name: 'QueensCampaignLevels',
};
</script>
