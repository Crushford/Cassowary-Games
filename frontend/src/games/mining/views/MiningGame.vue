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
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Day</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.daysElapsed }}</div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Food</div>
          <div class="mt-1 font-bold tabular-nums text-semantic-warning-300">
            {{ store.foodTotal }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Coins</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.coinsTotal }}</div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Gold</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.goldTotal }}</div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pt-4">
      <div class="space-y-4 pb-6">
        <section class="rounded-2xl border border-app-border bg-app-surface p-4">
          <div v-if="store.availableDepthLevels.length > 1" class="mb-4 grid grid-cols-4 gap-2">
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
        <button
          type="button"
          class="rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.openProgressionMenu()"
        >
          Go to Town
        </button>
        <button
          type="button"
          class="rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
          :class="
            store.canTravelToNextField()
              ? 'border-semantic-warning-300 bg-semantic-warning-700 text-white hover:bg-semantic-warning-600'
              : 'border-app-border bg-app-bg text-app-textMuted'
          "
          :disabled="!store.canTravelToNextField()"
          @click="store.goToNextField()"
        >
          Next Field
        </button>
      </div>
    </div>

    <MiningShopModal
      :is-visible="store.progressionMenuOpen"
      :gold-total="store.goldTotal"
      :coins-total="store.coinsTotal"
      :food-total="store.foodTotal"
      :selected-tab="store.selectedProgressionTab"
      :automation-options="store.automationOptions"
      :owned-automation-ids="store.magpieSkillIds"
      :tool-upgrade-options="store.toolUpgradeOptions"
      :owned-tool-upgrade-ids="store.ownedToolUpgradeIds"
      :can-buy-food="store.canBuyFood()"
      :can-exchange-gold="store.canExchangeGold()"
      :can-buy-automation="(skillId) => store.canBuyAutomation(skillId)"
      :can-buy-tool-upgrade="(upgradeId) => store.canBuyToolUpgrade(upgradeId)"
      @close="store.closeProgressionMenu()"
      @select-tab="store.setProgressionTab"
      @buy-food="store.buyFood()"
      @exchange-gold="store.exchangeGoldForCoins()"
      @buy-automation="store.buyAutomation"
      @buy-tool-upgrade="store.buyToolUpgrade"
    />

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
      :is-visible="store.showIntroModal"
      aria-label="Mining contract"
      @close="store.dismissIntro()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">How To Dig</h2>
          </div>
          <button
            type="button"
            class="rounded-lg border border-semantic-neutral-600 px-3 py-1.5 text-sm font-semibold text-semantic-neutral-200 hover:bg-semantic-neutral-700"
            @click="store.dismissIntro()"
          >
            Close
          </button>
        </div>

        <div class="space-y-3 text-sm leading-relaxed text-semantic-neutral-200">
          <p>Tap once to place a flag.</p>
          <p>Tap a flag to dig for gold.</p>
          <p>Digging takes 1 day and costs you 1 food.</p>
          <p>Moving to the next field costs 1 coin, and you can do it whenever you want.</p>
        </div>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.dismissIntro()"
        >
          Start Digging
        </button>
      </div>
    </Modal>

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
          Back to the Contract
        </button>
      </div>
    </Modal>

    <Modal
      :is-visible="store.showHintModal"
      aria-label="Old miners advice"
      @close="store.closeHints()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">Old Miners' Advice</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              Nobody agrees on the story. Everyone agrees the hill punishes lazy guesses.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-semantic-neutral-600 px-3 py-1.5 text-sm font-semibold text-semantic-neutral-200 hover:bg-semantic-neutral-700"
            @click="store.closeHints()"
          >
            Close
          </button>
        </div>

        <p class="text-sm leading-relaxed text-semantic-neutral-200">
          {{ store.currentHintText }}
        </p>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.closeHints()"
        >
          Back to the Shaft
        </button>
      </div>
    </Modal>

    <Modal
      :is-visible="store.showDeathModal"
      aria-label="Out of food"
      @close="store.dismissDeathModal()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">Out of Food</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              Go to town to restock, exchange gold, and manage upgrades.
            </p>
          </div>
        </div>

        <p class="text-sm leading-relaxed text-semantic-neutral-200">
          {{ store.deathMessage }}
        </p>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="
            store.dismissDeathModal();
            store.openProgressionMenu();
          "
        >
          Go To Town
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
