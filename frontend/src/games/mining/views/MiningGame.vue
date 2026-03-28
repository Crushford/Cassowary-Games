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
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Days Left</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.daysLeftInMonth }}</div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Level</div>
          <div class="mt-1 font-bold tabular-nums text-semantic-warning-300">
            {{ store.displayLevel }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Gold This Month</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">
            {{ store.goldCollectedThisMonth }}
          </div>
        </div>
        <div class="rounded-xl bg-app-surface px-3 py-2">
          <div class="uppercase tracking-[0.18em] text-app-textMuted">Coins</div>
          <div class="mt-1 font-bold tabular-nums text-app-text">{{ store.coinsTotal }}</div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pt-4">
      <div class="space-y-4 pb-6">
        <section class="rounded-2xl border border-app-border bg-app-surface p-4">
          <MiningBoard
            :truth-gold="store.truthGold"
            :region-ids="store.regionIds"
            :revealed="store.revealed"
            :flagged="store.visibleFlags"
            :reward-label="String(store.goldRewardPerTile)"
            :show-regions="store.canShowScannerRegions"
            :can-excavate-all-hidden="store.foundGoldCount === store.totalGoldOnBoard"
            :disabled="store.phase === 'loading'"
            @dig="store.dig"
            @toggle-flag="store.toggleFlag"
          />
        </section>
      </div>
    </div>

    <div class="flex-none border-t border-app-border bg-app-bgAlt px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm text-app-textMuted">
          A month is 28 digs. When the days run out, you must head back into town for more food.
        </div>
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
      :town-step="store.townStep"
      :display-level="store.displayLevel"
      :gold-total="store.goldTotal"
      :coins-total="store.coinsTotal"
      :exchange-summary="store.exchangeSummary"
      :monthly-upkeep-paid="store.progression.monthlyUpkeepPaid"
      :automation-options="store.visibleAutomationOptions"
      :owned-automation-ids="store.magpieSkillIds"
      :tool-upgrade-options="store.visibleToolUpgradeOptions"
      :owned-tool-upgrade-ids="store.ownedToolUpgradeIds"
      :can-advance="store.canAdvanceTownStep"
      :can-buy-food="store.canBuyFood()"
      :can-exchange-gold="store.canExchangeGold()"
      :show-purchased-upgrades="store.showPurchasedUpgrades"
      :can-buy-automation="(skillId) => store.canBuyAutomation(skillId)"
      :can-buy-tool-upgrade="(upgradeId) => store.canBuyToolUpgrade(upgradeId)"
      @close="store.closeProgressionMenu()"
      @continue="store.continueTownSequence()"
      @buy-food="store.buyFood()"
      @exchange-gold="store.exchangeGoldForCoins()"
      @buy-automation="store.buyAutomation"
      @buy-tool-upgrade="store.buyToolUpgrade"
      @toggle-purchased="store.toggleShowPurchasedUpgrades()"
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
          <p>A month is 28 digs.</p>
          <p>Each dig uses 1 day.</p>
          <p>When the month ends, you go to town to sell gold, pay upkeep, and buy upgrades.</p>
          <p>Tap once to place a gold-here flag.</p>
          <p>
            Tap a gold-here flag to dig for gold. After all gold is found, any hidden tile can be
            dug.
          </p>
          <p>The magpie marks not-gold tiles with an x and likely gold with a target.</p>
          <p>Better months at the exchange unlock new town opportunities.</p>
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
      :is-visible="store.showMonthOverModal"
      aria-label="Month over"
      @close="store.dismissMonthOverModal()"
    >
      <div class="space-y-4 text-white">
        <div>
          <h2 class="text-xl font-bold">The Month Is Over</h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">Time to head into town.</p>
        </div>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.dismissMonthOverModal()"
        >
          Head To Town
        </button>
      </div>
    </Modal>

    <Modal
      :is-visible="store.showUpgradeExplanation"
      aria-label="Tool upgrade explanation"
      @close="store.hideUpgradeExplanation()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">{{ store.upgradeExplanationTitle }}</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              New tools make the contract easier to read and more valuable to work.
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
      :is-visible="Boolean(store.levelCelebration)"
      aria-label="Exchange level reached"
      @close="store.dismissLevelCelebration()"
    >
      <div class="space-y-4 text-white">
        <div>
          <h2 class="text-xl font-bold">
            Congratulations, you reached Level {{ store.levelCelebration?.level }}.
          </h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">
            Your return this month is now {{ store.levelCelebration?.returnPercent }}%.
          </p>
        </div>

        <p class="text-sm leading-relaxed text-semantic-neutral-200">
          New upgrades are now available in town.
        </p>

        <p
          v-if="store.levelCelebration?.scannerUnlocked"
          class="text-sm leading-relaxed text-semantic-neutral-200"
        >
          Gold still follows one per row, one per column, and no diagonal touching, but now there is
          also one gold per color group. The scanner reveals those groups so you can reason instead
          of guessing.
        </p>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.dismissLevelCelebration()"
        >
          Continue
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
            <h2 class="text-xl font-bold">
              {{ store.phase === 'dead' ? 'Game Over' : 'Out of Food' }}
            </h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              {{
                store.phase === 'dead'
                  ? 'You cannot fund another month underground.'
                  : 'Go to town to restock, exchange gold, and manage upgrades.'
              }}
            </p>
          </div>
        </div>

        <p class="text-sm leading-relaxed text-semantic-neutral-200">
          {{ store.deathMessage }}
        </p>

        <button
          v-if="store.phase === 'dead'"
          type="button"
          class="w-full rounded-xl border border-semantic-danger-500 bg-semantic-danger-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-danger-600"
          @click="store.deleteSavedGame()"
        >
          Restart
        </button>

        <button
          v-else
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

    <Modal
      :is-visible="store.showFieldExhaustedModal"
      aria-label="Field fully dug"
      @close="store.dismissFieldExhaustedModal()"
    >
      <div class="space-y-4 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">Field Fully Dug</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">There is nothing left buried here.</p>
          </div>
        </div>

        <p class="text-sm leading-relaxed text-semantic-neutral-200">
          You've dug this entire field! You can move to the next field at any time by clicking "Next
          Field".
        </p>

        <button
          type="button"
          class="w-full rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
          @click="store.dismissFieldExhaustedModal()"
        >
          Keep Looking Around
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
