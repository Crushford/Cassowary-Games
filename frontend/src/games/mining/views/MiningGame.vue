<template>
  <div
    class="relative mx-auto flex h-dvh w-full max-w-[480px] touch-manipulation flex-col overflow-hidden overscroll-contain bg-app-bgAlt text-app-text bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-semantic-warning-950 to-app-bgAlt"
    data-game="mining"
  >
    <Toast
      :message="store.errorMessage"
      :should-shake="Boolean(store.errorMessage)"
      variant="error"
      aria-live="assertive"
    />

    <div class="flex-none border-b border-app-border px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-sm font-bold uppercase tracking-[0.24em] text-semantic-warning-300">
          Gold Mining
        </h1>
        <button
          type="button"
          class="text-xs font-semibold text-app-textMuted transition-colors hover:text-app-text"
          @click="store.openSettingsModal()"
        >
          Settings
        </button>
      </div>

      <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Level</div>
          <div class="mt-1 font-bold tabular-nums text-semantic-warning-300">
            {{ store.currentLevelNumber }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Digs</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.digsUsed }}</div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Gold Found</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">
            {{ store.foundGoldCount }} / {{ store.currentLevelDefinition.goldTarget }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Days Played</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.daysElapsed }}</div>
        </div>
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-hidden px-4 py-3">
      <section
        class="flex h-full min-h-0 flex-col rounded-2xl border border-app-border bg-app-surface p-4"
      >
        <div class="flex-none rounded-xl bg-app-bg px-4 py-3 text-sm text-app-textMuted">
          <div>{{ store.currentLevelGoalText }}</div>
          <div
            class="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-semantic-warning-300"
          >
            Tap to flag. Tap and hold to dig.
          </div>
        </div>

        <div
          ref="boardViewport"
          class="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <MiningBoard
            :truth-gold="store.truthGold"
            :region-ids="store.regionIds"
            :revealed="store.revealed"
            :flagged="store.visibleFlags"
            :reward-label="'1'"
            :show-regions="store.canShowScannerRegions"
            :board-size-px="boardPixelSize"
            :disabled="store.phase !== 'playing'"
            @dig="store.dig"
            @toggle-flag="store.toggleFlag"
          />
        </div>
      </section>
    </div>

    <div class="flex-none border-t border-app-border bg-app-bgAlt px-4 py-3">
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors"
          :class="
            store.canUndoFlags
              ? 'border-semantic-warning-700 bg-semantic-warning-800 text-semantic-warning-100 hover:bg-semantic-warning-700'
              : 'border-app-border bg-app-bg text-app-textMuted'
          "
          :disabled="!store.canUndoFlags"
          @click="store.undoFlags()"
        >
          Undo
        </button>
        <button
          type="button"
          class="rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors"
          :class="
            store.hasPlayerFlags
              ? 'border-semantic-danger-800 bg-semantic-danger-900 text-semantic-danger-100 hover:bg-semantic-danger-800'
              : 'border-app-border bg-app-bg text-app-textMuted'
          "
          :disabled="!store.hasPlayerFlags"
          @click="store.clearPlayerFlags()"
        >
          Clear Flags
        </button>
      </div>
    </div>

    <Modal
      :is-visible="store.showSettingsModal"
      aria-label="Mining settings"
      @close="store.closeSettingsModal()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">Settings</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">Manage your local mining save.</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-semantic-neutral-600 px-3 py-1.5 text-sm font-semibold text-semantic-neutral-200 hover:bg-semantic-neutral-700"
            @click="store.closeSettingsModal()"
          >
            Close
          </button>
        </div>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-danger-500 bg-semantic-danger-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-danger-600"
          @click="store.deleteSavedGame()"
        >
          Delete Saved Game
        </button>
      </div>
    </Modal>

    <Modal
      :is-visible="store.showLevelIntroModal"
      aria-label="Level introduction"
      @close="store.dismissLevelIntro()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">{{ store.currentLevelDefinition.introTitle }}</h2>
          </div>
        </div>

        <div class="space-y-3 text-sm leading-relaxed text-semantic-neutral-200">
          <p v-for="line in store.currentLevelDefinition.introBody" :key="line">
            {{ line }}
          </p>
        </div>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.dismissLevelIntro()"
        >
          Start Level
        </button>
      </div>
    </Modal>

    <Modal
      :is-visible="store.showLevelResultModal"
      aria-label="Level result"
      @close="store.closeLevelResultModal()"
    >
      <div class="space-y-4 text-white">
        <template v-if="store.levelResultPassed">
          <div>
            <h2 class="text-xl font-bold">{{ successTitle }}</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              {{ successSummary }}
            </p>
          </div>

          <p
            v-if="store.currentLevelDefinition.reward && !store.isGameComplete"
            class="text-sm leading-relaxed text-semantic-neutral-200"
          >
            {{ store.currentLevelDefinition.reward.body }}
          </p>

          <div v-if="store.isGameComplete" class="space-y-4">
            <div
              class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm text-semantic-neutral-200"
            >
              You finished the full campaign in <strong>{{ store.daysElapsed }}</strong> days.
            </div>

            <label class="block space-y-2">
              <span class="text-sm font-semibold text-semantic-neutral-200">Leaderboard Name</span>
              <input
                :value="store.leaderboardName"
                type="text"
                maxlength="24"
                class="w-full rounded-xl border border-semantic-neutral-600 bg-semantic-neutral-950 px-4 py-2 text-sm text-white outline-none transition-colors focus:border-semantic-info-400"
                placeholder="Enter your name"
                @input="store.setLeaderboardName(($event.target as HTMLInputElement).value)"
              />
            </label>

            <button
              type="button"
              class="w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
              :class="
                store.scoreSubmitted
                  ? 'border-app-border bg-app-bg text-app-textMuted'
                  : 'border-semantic-success-500 bg-semantic-success-700 text-white hover:bg-semantic-success-600'
              "
              :disabled="store.scoreSubmitted"
              @click="store.submitLeaderboardScore()"
            >
              {{ store.scoreSubmitted ? 'Score Saved' : 'Save Score' }}
            </button>

            <div class="space-y-2">
              <div class="text-sm font-semibold text-semantic-neutral-200">Local Leaderboard</div>
              <div
                v-if="store.leaderboardEntries.length === 0"
                class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm text-semantic-neutral-300"
              >
                No scores saved yet.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="(entry, index) in store.leaderboardEntries"
                  :key="`${entry.name}-${entry.completedAt}`"
                  class="flex items-center justify-between rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm text-semantic-neutral-200"
                >
                  <span>{{ index + 1 }}. {{ entry.name }}</span>
                  <span class="font-bold tabular-nums">{{ entry.daysElapsed }} days</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
              @click="store.resetRun()"
            >
              Play Again
            </button>
          </div>

          <div v-else>
            <button
              type="button"
              class="w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
              :class="
                store.canStartNextLevel
                  ? 'border-semantic-success-500 bg-semantic-success-700 text-white hover:bg-semantic-success-600'
                  : 'border-app-border bg-app-bg text-app-textMuted'
              "
              :disabled="!store.canStartNextLevel"
              @click="store.startNextLevel()"
            >
              {{ store.isLastLevel ? 'Last Level' : 'Start Next Level' }}
            </button>
          </div>
        </template>

        <template v-else-if="store.levelResultFailed">
          <div>
            <h2 class="text-xl font-bold">{{ store.currentLevelDefinition.failure.title }}</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              {{ store.currentLevelDefinition.failure.body }}
            </p>
          </div>

          <p
            v-if="store.levelResult?.clueRevealed"
            class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm leading-relaxed text-semantic-neutral-200"
          >
            {{ store.currentLevelDefinition.failure.clue }}
          </p>

          <div class="grid gap-3">
            <button
              v-if="!store.levelResult?.clueRevealed"
              type="button"
              class="w-full rounded-xl border border-semantic-warning-500 bg-semantic-warning-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-warning-600"
              @click="store.revealLevelClue()"
            >
              Reveal Clue
            </button>
            <button
              type="button"
              class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
              @click="store.retryLevel()"
            >
              Try Again
            </button>
          </div>
        </template>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import Modal from '@/shared/components/Modal.vue';
import Toast from '@/shared/components/Toast.vue';

import MiningBoard from '../components/MiningBoard.vue';
import { useMiningStore } from '../stores/mining';

const store = useMiningStore();
const boardViewport = ref<HTMLElement | null>(null);
const boardPixelSize = ref<number | undefined>(undefined);
let boardResizeObserver: ResizeObserver | null = null;

function updateBoardPixelSize() {
  const viewport = boardViewport.value;
  if (!viewport) {
    boardPixelSize.value = undefined;
    return;
  }

  const { width, height } = viewport.getBoundingClientRect();
  const nextSize = Math.max(0, Math.floor(Math.min(width, height)));
  boardPixelSize.value = nextSize > 0 ? nextSize : undefined;
}

const successTitle = computed(() => {
  if (store.isGameComplete) {
    return 'You completed the game!';
  }

  return store.currentLevelDefinition.reward?.title ?? 'Congratulations!';
});

const successSummary = computed(() => {
  if (store.isGameComplete) {
    return `You finished the final level in ${store.digsUsed} digs and completed the campaign.`;
  }

  const maxDigs = store.currentLevelDefinition.winConditions.maxDigsExclusive;
  if (typeof maxDigs === 'number') {
    return `You found all ${store.currentLevelDefinition.goldTarget} gold in ${store.digsUsed} digs.`;
  }

  return `You found all ${store.currentLevelDefinition.goldTarget} gold.`;
});

let errorTimeout: number | null = null;

onMounted(() => {
  void store.initialize();
  updateBoardPixelSize();

  if (typeof ResizeObserver !== 'undefined' && boardViewport.value) {
    boardResizeObserver = new ResizeObserver(() => {
      updateBoardPixelSize();
    });
    boardResizeObserver.observe(boardViewport.value);
  } else {
    window.addEventListener('resize', updateBoardPixelSize);
  }
});

onBeforeUnmount(() => {
  if (boardResizeObserver) {
    boardResizeObserver.disconnect();
    boardResizeObserver = null;
  } else {
    window.removeEventListener('resize', updateBoardPixelSize);
  }
});

watch(
  () => store.errorTick,
  () => {
    if (errorTimeout) {
      window.clearTimeout(errorTimeout);
    }

    if (!store.errorMessage) {
      return;
    }

    errorTimeout = window.setTimeout(() => {
      store.clearError();
      errorTimeout = null;
    }, 2400);
  }
);
</script>
