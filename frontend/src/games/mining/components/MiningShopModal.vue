<template>
  <Modal :is-visible="isVisible" aria-label="Mining shop" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Mining Shop</h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">
            Spend contract gold on tools, rumors, and birds clever enough to outlive a miner.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-semantic-neutral-600 px-3 py-1.5 text-sm font-semibold text-semantic-neutral-200 hover:bg-semantic-neutral-700"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>

      <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
        Gold on hand: <span class="text-semantic-warning-300">{{ goldTotal }}</span>
      </div>

      <div class="space-y-3">
        <div
          v-for="upgrade in upgrades"
          :key="upgrade.id"
          class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ upgrade.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">
                {{ upgrade.description }}
              </div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">{{ upgrade.cost }}</div>
          </div>

          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            Unlocks depth {{ upgrade.unlocksDepth }}
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              ownedUpgradeIds.includes(upgrade.id)
                ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                : canBuyUpgrade(upgrade.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="ownedUpgradeIds.includes(upgrade.id) || !canBuyUpgrade(upgrade.id)"
            @click="$emit('buy-upgrade', upgrade.id)"
          >
            {{ ownedUpgradeIds.includes(upgrade.id) ? 'Purchased' : `Buy ${upgrade.title}` }}
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/shared/components/Modal.vue';

import type { MiningUpgradeDefinition, MiningUpgradeId } from '../game/types';

defineProps<{
  isVisible: boolean;
  goldTotal: number;
  upgrades: MiningUpgradeDefinition[];
  ownedUpgradeIds: MiningUpgradeId[];
  canBuyUpgrade: (upgradeId: MiningUpgradeId) => boolean;
}>();

defineEmits<{
  close: [];
  'buy-upgrade': [upgradeId: MiningUpgradeId];
}>();
</script>
