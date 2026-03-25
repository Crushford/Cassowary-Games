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
        <router-link
          to="/"
          class="text-sm leading-none text-app-textMuted transition-colors hover:text-app-text"
        >
          ← Home
        </router-link>
        <h1 class="text-sm font-bold uppercase tracking-[0.24em] text-semantic-warning-300">
          Gold Mining
        </h1>
        <button
          type="button"
          class="text-xs font-semibold text-app-textMuted transition-colors hover:text-app-text"
          @click="store.openShop()"
        >
          Shop
        </button>
      </div>

      <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Day</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.daysElapsed }}</div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Gold</div>
          <div class="mt-1 font-bold tabular-nums text-semantic-warning-300">
            {{ store.goldTotal }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Reward</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">
            {{ store.goldRewardPerTile }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Board</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.currentLevel }}</div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pt-4">
      <div class="space-y-4 pb-6">
        <section class="rounded-2xl border border-app-border bg-app-surface p-4">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-app-textMuted">Depth</div>
              <div class="mt-1 text-base font-bold text-app-text">{{ store.depthTitle }}</div>
              <div class="mt-1 text-sm text-app-textMuted">{{ store.depthSummary }}</div>
            </div>
            <div
              class="rounded-full px-3 py-1 text-xs font-bold"
              :class="
                store.phase === 'level-complete'
                  ? 'bg-semantic-success-900 text-semantic-success-300'
                  : 'bg-app-bg text-app-textMuted'
              "
            >
              {{ store.phase === 'level-complete' ? 'Board Cleared' : 'Mining' }}
            </div>
          </div>

          <div class="mb-4 grid grid-cols-4 gap-2">
            <button
              v-for="depthLevel in store.availableDepthLevels"
              :key="depthLevel"
              type="button"
              class="rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
              :class="
                store.currentDepthLevel === depthLevel
                  ? 'border-semantic-warning-300 bg-semantic-warning-700 text-white'
                  : 'border-app-border bg-app-bg text-app-textMuted hover:text-app-text'
              "
              @click="store.setDepthLevel(depthLevel)"
            >
              Depth {{ depthLevel }}
            </button>
          </div>

          <div class="mb-4 rounded-xl bg-app-bg p-3 text-sm text-app-textMuted">
            <div>Gold found: {{ store.foundGoldCount }} / 5</div>
            <div class="mt-1">Tap to dig for 1 gold. Long press to place or remove a flag.</div>
            <div class="mt-1">{{ store.lastActionMessage }}</div>
          </div>

          <MiningBoard
            :truth-gold="store.truthGold"
            :truth-quartz="store.truthQuartz"
            :region-ids="store.regionIds"
            :revealed="store.revealed"
            :flagged="store.visibleFlags"
            :depth-level="store.currentDepthLevel"
            :disabled="store.phase !== 'playing'"
            @dig="store.dig"
            @toggle-flag="store.toggleFlag"
          />
        </section>
      </div>
    </div>

    <div class="flex-none border-t border-app-border bg-app-bgAlt px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-[0.18em] text-app-textMuted">Unlocks</div>
          <div class="mt-1 text-sm font-semibold text-app-text">
            Highest depth unlocked: {{ store.highestUnlockedDepthLevel }}
          </div>
        </div>

        <button
          type="button"
          class="rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.openShop()"
        >
          Shop
        </button>
      </div>
    </div>

    <MiningShopModal
      :is-visible="store.shopOpen"
      :gold-total="store.goldTotal"
      :upgrades="store.availableUpgrades"
      :owned-upgrade-ids="store.unlockedUpgradeIds"
      :can-buy-upgrade="(upgradeId) => store.canBuyUpgrade(upgradeId)"
      @close="store.closeShop()"
      @buy-upgrade="store.buyUpgrade"
    />

    <Modal
      :is-visible="store.showUpgradeExplanation"
      aria-label="Depth upgrade explanation"
      @close="store.hideUpgradeExplanation()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">{{ store.upgradeExplanationTitle }}</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              Deeper layers trade gold for clearer information and bigger rewards.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-semantic-neutral-600 px-3 py-1.5 text-sm font-semibold text-semantic-neutral-200 hover:bg-semantic-neutral-700"
            @click="store.hideUpgradeExplanation()"
          >
            Close
          </button>
        </div>

        <p class="text-sm leading-relaxed text-semantic-neutral-200">
          {{ store.upgradeExplanationMessage }}
        </p>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.hideUpgradeExplanation()"
        >
          Back to the Mine
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

import Modal from '@/shared/components/Modal.vue';
import Toast from '@/shared/components/Toast.vue';

import MiningBoard from '../components/MiningBoard.vue';
import MiningShopModal from '../components/MiningShopModal.vue';
import { useMiningStore } from '../stores/mining';

const store = useMiningStore();

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
