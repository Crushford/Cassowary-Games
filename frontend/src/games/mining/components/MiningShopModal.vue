<template>
  <Modal :is-visible="isVisible" aria-label="Town menu" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Town</h2>
        </div>
        <button
          type="button"
          class="rounded-lg border border-semantic-neutral-600 px-3 py-1.5 text-sm font-semibold text-semantic-neutral-200 hover:bg-semantic-neutral-700"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
          Gold: <span class="text-semantic-warning-300">{{ goldTotal }}</span>
        </div>
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
          Coins: <span class="text-semantic-warning-300">{{ coinsTotal }}</span>
        </div>
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
          Food: <span class="text-semantic-warning-300">{{ foodTotal }}</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors"
          :class="
            selectedTab === tab.id
              ? 'border-semantic-warning-300 bg-semantic-warning-700 text-white'
              : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-300 hover:text-white'
          "
          @click="$emit('select-tab', tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="selectedTab === 'food-shop'" class="space-y-3">
        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="text-base font-bold text-white">Food Shop</div>
          <div class="mt-1 text-sm text-semantic-neutral-300">
            Buy food before the next trip underground.
          </div>
          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            Rate: 1 coin for 30 food
          </div>
          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              canBuyFood
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="!canBuyFood"
            @click="$emit('buy-food')"
          >
            Buy 30 Food
          </button>
        </div>
      </div>

      <div v-else-if="selectedTab === 'gold-exchange'" class="space-y-3">
        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="text-base font-bold text-white">Gold Exchange</div>
          <div class="mt-1 text-sm text-semantic-neutral-300">
            Convert mined gold into coins you can spend in town.
          </div>
          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            Rate: 1 gold for 1 coin
          </div>
          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              canExchangeGold
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="!canExchangeGold"
            @click="$emit('exchange-gold')"
          >
            Exchange 1 Gold
          </button>
        </div>
      </div>

      <div v-else-if="selectedTab === 'animal-trainer'" class="space-y-3">
        <div
          v-for="skill in automationOptions"
          :key="skill.id"
          class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ skill.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">{{ skill.description }}</div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">{{ skill.cost }}</div>
          </div>

          <div
            class="mt-3 text-xs uppercase tracking-[0.18em]"
            :class="skill.implemented ? 'text-semantic-neutral-500' : 'text-semantic-warning-300'"
          >
            {{ skill.implemented ? skill.effectSummary : 'Prototype lesson placeholder' }}
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              ownedAutomationIds.includes(skill.id)
                ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                : skill.implemented && canBuyAutomation(skill.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="
              ownedAutomationIds.includes(skill.id) ||
              !skill.implemented ||
              !canBuyAutomation(skill.id)
            "
            @click="$emit('buy-automation', skill.id)"
          >
            {{
              ownedAutomationIds.includes(skill.id)
                ? 'Owned'
                : skill.implemented
                  ? `Buy ${skill.title}`
                  : 'Coming Soon'
            }}
          </button>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="upgrade in toolUpgradeOptions"
          :key="upgrade.id"
          class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ upgrade.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">{{ upgrade.description }}</div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">{{ upgrade.cost }}</div>
          </div>

          <div
            class="mt-3 text-xs uppercase tracking-[0.18em]"
            :class="upgrade.implemented ? 'text-semantic-neutral-500' : 'text-semantic-warning-300'"
          >
            {{ upgrade.implemented ? upgrade.effectSummary : 'Prototype tool placeholder' }}
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              ownedToolUpgradeIds.includes(upgrade.id)
                ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                : upgrade.implemented && canBuyToolUpgrade(upgrade.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="
              ownedToolUpgradeIds.includes(upgrade.id) ||
              !upgrade.implemented ||
              !canBuyToolUpgrade(upgrade.id)
            "
            @click="$emit('buy-tool-upgrade', upgrade.id)"
          >
            {{
              ownedToolUpgradeIds.includes(upgrade.id)
                ? 'Owned'
                : upgrade.implemented
                  ? `Buy ${upgrade.title}`
                  : 'Coming Soon'
            }}
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/shared/components/Modal.vue';

import type {
  MiningAutomationDefinition,
  MiningMagpieSkillId,
  MiningProgressionTab,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
} from '../game/types';

const tabs: Array<{ id: MiningProgressionTab; label: string }> = [
  { id: 'food-shop', label: 'Food Shop' },
  { id: 'gold-exchange', label: 'Gold Exchange' },
  { id: 'animal-trainer', label: 'Animal Trainer' },
  { id: 'ui-upgrades', label: 'UI Upgrades' },
];

defineProps<{
  isVisible: boolean;
  goldTotal: number;
  coinsTotal: number;
  foodTotal: number;
  selectedTab: MiningProgressionTab;
  automationOptions: MiningAutomationDefinition[];
  ownedAutomationIds: MiningMagpieSkillId[];
  toolUpgradeOptions: MiningToolUpgradeDefinition[];
  ownedToolUpgradeIds: MiningToolUpgradeId[];
  canBuyFood: boolean;
  canExchangeGold: boolean;
  canBuyAutomation: (skillId: MiningMagpieSkillId) => boolean;
  canBuyToolUpgrade: (upgradeId: MiningToolUpgradeId) => boolean;
}>();

defineEmits<{
  close: [];
  'select-tab': [tab: MiningProgressionTab];
  'buy-food': [];
  'exchange-gold': [];
  'buy-automation': [skillId: MiningMagpieSkillId];
  'buy-tool-upgrade': [upgradeId: MiningToolUpgradeId];
}>();
</script>
