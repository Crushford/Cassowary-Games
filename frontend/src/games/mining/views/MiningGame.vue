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
          @click="store.leaseNewClaim()"
        >
          New Claim · {{ store.nextClaimCost }}
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between text-xs">
        <div class="flex items-baseline gap-2">
          <span class="uppercase tracking-[0.18em] text-app-textMuted">Day</span>
          <span class="font-bold tabular-nums text-app-text">{{ store.daysElapsed }}</span>
        </div>

        <div class="flex items-baseline gap-2">
          <span class="uppercase tracking-[0.18em] text-app-textMuted">Gold</span>
          <span class="font-bold tabular-nums text-semantic-warning-300">
            {{ store.goldTotal }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pt-4">
      <div class="space-y-4 pb-6">
        <section class="rounded-2xl border border-app-border bg-app-surface p-4">
          <div class="mb-3 flex justify-end">
            <div
              class="rounded-full px-3 py-1 text-xs font-bold"
              :class="
                store.phase === 'claim-complete'
                  ? 'bg-semantic-success-900 text-semantic-success-300'
                  : 'bg-app-bg text-app-textMuted'
              "
            >
              {{ store.phase === 'claim-complete' ? 'Claim Cleared' : 'Active Claim' }}
            </div>
          </div>

          <div class="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-app-bg p-3">
            <div class="flex items-center gap-2 rounded-lg bg-app-surface px-2 py-2">
              <span
                class="h-3 w-3 rounded-full bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800"
              />
              <div>
                <div class="text-xs font-bold text-app-text">Dirt</div>
                <div class="text-[10px] text-app-textMuted">Instant gold</div>
              </div>
            </div>
            <div class="flex items-center gap-2 rounded-lg bg-app-surface px-2 py-2">
              <span
                class="h-3 w-3 rounded-full bg-gradient-to-br from-semantic-neutral-600 to-semantic-neutral-800"
              />
              <div>
                <div class="text-xs font-bold text-app-text">Rock</div>
                <div class="text-[10px] text-app-textMuted">1 day process</div>
              </div>
            </div>
            <div class="flex items-center gap-2 rounded-lg bg-app-surface px-2 py-2">
              <span
                class="h-3 w-3 rounded-full bg-gradient-to-br from-semantic-warning-700 to-semantic-warning-900"
              />
              <div>
                <div class="text-xs font-bold text-app-text">Quartz</div>
                <div class="text-[10px] text-app-textMuted">3 day process</div>
              </div>
            </div>
          </div>

          <MiningBoard
            :rows="store.gridRows"
            :top-tile-for-stack="store.topTileForStack"
            :floating-result="store.floatingResult"
            @dig="store.dig"
          />
        </section>

        <ProcessingArea
          :processing-load="store.processingLoad"
          :button-label="store.processingButtonLabel"
          @process="store.processCurrentLoad()"
        />
      </div>
    </div>

    <div class="flex-none border-t border-app-border bg-app-bgAlt px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-3 text-xs">
            <div class="flex items-baseline gap-2">
              <span class="uppercase tracking-[0.18em] text-app-textMuted">Tool</span>
              <span class="truncate font-semibold text-app-text">{{ store.toolLabel }}</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="uppercase tracking-[0.18em] text-app-textMuted">Power</span>
              <span class="font-semibold tabular-nums text-app-text">{{ store.shovelPower }}</span>
            </div>
          </div>

          <div class="mt-1 text-xs text-app-textMuted">Tailings {{ store.tailingsTotal }}</div>
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
      :power-upgrade="store.powerUpgrade"
      :can-buy-power-upgrade="store.canBuyPowerUpgrade"
      :can-buy-rock-tool="store.canBuyRockTool"
      :can-buy-quartz-tool="store.canBuyQuartzTool"
      @close="store.closeShop()"
      @buy-power="store.buyPowerUpgrade()"
      @buy-rock-tool="store.buyRockTool()"
      @buy-quartz-tool="store.buyQuartzTool()"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

import Toast from '@/shared/components/Toast.vue';

import MiningBoard from '../components/MiningBoard.vue';
import MiningShopModal from '../components/MiningShopModal.vue';
import ProcessingArea from '../components/ProcessingArea.vue';
import { useMiningStore } from '../stores/mining';

const store = useMiningStore();

let errorTimeout: number | null = null;
let floatingTimeout: number | null = null;

onMounted(() => {
  store.initialize();
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

watch(
  () => store.floatingResultTick,
  () => {
    if (floatingTimeout) {
      window.clearTimeout(floatingTimeout);
    }

    if (!store.floatingResult) {
      return;
    }

    floatingTimeout = window.setTimeout(() => {
      store.clearFloatingResult();
      floatingTimeout = null;
    }, 650);
  }
);
</script>
