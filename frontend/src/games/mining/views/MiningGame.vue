<template>
  <div
    class="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-app-bgAlt text-app-text bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-semantic-warning-950 to-app-bgAlt"
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
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Level Digs</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.digsUsed }}</div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Gold Found</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">
            {{ store.foundGoldCount }} / {{ store.currentLevelDefinition.goldTarget }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Total Days</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.daysElapsed }}</div>
        </div>
      </div>

      <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Raven</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">
            {{ store.unlockedRavenSkillIds.length }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Tools</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">
            {{ store.unlockedToolUpgradeIds.length }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pt-4">
      <div class="space-y-4 pb-6">
        <section class="rounded-2xl border border-app-border bg-app-surface p-4">
          <div class="mb-4 rounded-xl bg-app-bg px-4 py-3 text-sm text-app-textMuted">
            {{ store.currentLevelGoalText }}
          </div>

          <MiningBoard
            :truth-gold="store.truthGold"
            :region-ids="store.regionIds"
            :revealed="store.revealed"
            :flagged="store.visibleFlags"
            :reward-label="'1'"
            :show-regions="store.canShowScannerRegions"
            :can-excavate-all-hidden="false"
            :disabled="store.phase !== 'playing'"
            @dig="store.dig"
            @toggle-flag="store.toggleFlag"
          />
        </section>
      </div>
    </div>

    <div class="flex-none border-t border-app-border bg-app-bgAlt px-4 py-3">
      <div class="mb-3 grid grid-cols-2 gap-2">
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

      <button
        type="button"
        class="w-full rounded-xl border border-app-border bg-app-surface px-4 py-2 text-center text-sm font-bold leading-tight text-app-text transition-colors hover:bg-app-bg"
        @click="store.retryLevel()"
      >
        Replay Level
      </button>
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
            <h2 class="text-xl font-bold">
              {{ store.currentLevelDefinition.reward?.title ?? 'Congratulations!' }}
            </h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              {{ successSummary }}
            </p>
          </div>

          <p
            v-if="store.currentLevelDefinition.reward"
            class="text-sm leading-relaxed text-semantic-neutral-200"
          >
            {{ store.currentLevelDefinition.reward.body }}
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="rounded-xl border border-semantic-danger-700 bg-semantic-danger-900 px-4 py-2 text-sm font-bold text-semantic-danger-100 transition-colors hover:bg-semantic-danger-800"
              @click="store.retryLevel()"
            >
              Replay Level
            </button>
            <button
              type="button"
              class="rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
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
import { computed, onMounted, watch } from 'vue';

import Modal from '@/shared/components/Modal.vue';
import Toast from '@/shared/components/Toast.vue';

import MiningBoard from '../components/MiningBoard.vue';
import { useMiningStore } from '../stores/mining';

const store = useMiningStore();

const successSummary = computed(() => {
  const maxDigs = store.currentLevelDefinition.winConditions.maxDigsExclusive;
  if (typeof maxDigs === 'number') {
    return `You found all ${store.currentLevelDefinition.goldTarget} gold in ${store.digsUsed} digs.`;
  }

  return `You found all ${store.currentLevelDefinition.goldTarget} gold.`;
});

let errorTimeout: number | null = null;

onMounted(() => {
  void store.initialize();
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
