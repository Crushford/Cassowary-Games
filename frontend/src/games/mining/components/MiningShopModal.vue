<template>
  <Modal :is-visible="isVisible" aria-label="Mining shop" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Mining Shop</h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">
            Spend gold to improve your tools and work deeper ground.
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
        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ powerUpgrade.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">
                {{ powerUpgrade.description }}
              </div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">{{ powerUpgrade.cost }}</div>
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              canBuyPowerUpgrade
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            @click="$emit('buy-power')"
          >
            Buy Power Upgrade
          </button>
        </div>

        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ rockToolUpgrade.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">
                {{ rockToolUpgrade.description }}
              </div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">
              {{ rockToolUpgrade.cost }}
            </div>
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              canBuyRockTool
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            @click="$emit('buy-rock-tool')"
          >
            Buy Rock Tool
          </button>
        </div>

        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ quartzToolUpgrade.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">
                {{ quartzToolUpgrade.description }}
              </div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">
              {{ quartzToolUpgrade.cost }}
            </div>
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              canBuyQuartzTool
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            @click="$emit('buy-quartz-tool')"
          >
            Buy Quartz Tool
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/shared/components/Modal.vue';

import { QUARTZ_TOOL_UPGRADE, ROCK_TOOL_UPGRADE } from '../game/rules/upgrades';
import type { UpgradeDefinition } from '../game/types';

defineProps<{
  isVisible: boolean;
  goldTotal: number;
  powerUpgrade: UpgradeDefinition;
  canBuyPowerUpgrade: boolean;
  canBuyRockTool: boolean;
  canBuyQuartzTool: boolean;
}>();

defineEmits<{
  close: [];
  'buy-power': [];
  'buy-rock-tool': [];
  'buy-quartz-tool': [];
}>();

const rockToolUpgrade = ROCK_TOOL_UPGRADE;
const quartzToolUpgrade = QUARTZ_TOOL_UPGRADE;
</script>
