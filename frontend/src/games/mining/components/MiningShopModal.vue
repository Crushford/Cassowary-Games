<template>
  <Modal :is-visible="isVisible" aria-label="Town sequence" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Town</h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">
            Exchange your haul, pay monthly upkeep, then improve the crew.
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

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
          Level: <span class="text-semantic-warning-300">{{ displayLevel }}</span>
        </div>
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
          Gold: <span class="text-semantic-warning-300">{{ goldTotal }}</span>
        </div>
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm font-semibold text-white">
          Coins: <span class="text-semantic-warning-300">{{ coinsTotal }}</span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="step in orderedSteps"
          :key="step.id"
          class="rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]"
          :class="
            townStep === step.id
              ? 'border-semantic-warning-300 bg-semantic-warning-700 text-white'
              : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-400'
          "
        >
          {{ step.label }}
        </div>
      </div>

      <div v-if="townStep === 'exchange'" class="space-y-3">
        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="text-base font-bold text-white">Gold Exchange</div>
          <div class="mt-1 text-sm text-semantic-neutral-300">
            Close out the month, count your haul, and see how far you climbed.
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Gold Sold:
              <span class="font-bold text-semantic-warning-300">{{
                exchangeSummary.processed ? exchangeSummary.soldGold : goldTotal
              }}</span>
            </div>
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Base Value:
              <span class="font-bold text-semantic-warning-300">{{
                exchangeSummary.processed ? exchangeSummary.baseValue : goldTotal
              }}</span>
            </div>
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Return:
              <span class="font-bold text-semantic-warning-300"
                >{{ exchangeSummary.processed ? exchangeSummary.returnPercent : 0 }}%</span
              >
            </div>
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Total Payout:
              <span class="font-bold text-semantic-warning-300">{{
                exchangeSummary.processed ? exchangeSummary.payout : 0
              }}</span>
            </div>
          </div>

          <div class="mt-4">
            <div
              class="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-semantic-neutral-400"
            >
              <span>Progress To Next Level</span>
              <span v-if="exchangeSummary.nextThreshold !== null">
                {{ exchangeSummary.soldGold }} / {{ exchangeSummary.nextThreshold }}
              </span>
              <span v-else>Maxed This Schedule</span>
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-semantic-neutral-950">
              <div
                class="h-full bg-gradient-to-r from-semantic-warning-500 to-semantic-warning-300 transition-all duration-700"
                :style="{ width: `${Math.round(exchangeSummary.progressRatio * 100)}%` }"
              />
            </div>
          </div>

          <button
            type="button"
            class="mt-4 w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
            :class="
              canExchangeGold
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="!canExchangeGold"
            @click="$emit('exchange-gold')"
          >
            {{ exchangeSummary.processed ? 'Exchange Complete' : 'Close Out The Month' }}
          </button>
        </div>
      </div>

      <div v-else-if="townStep === 'food-shop'" class="space-y-3">
        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="text-base font-bold text-white">Food Shop</div>
          <div class="mt-1 text-sm text-semantic-neutral-300">
            Pay the monthly food bill before the next month can begin.
          </div>
          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            Monthly upkeep: 1 coin
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
            {{ monthlyUpkeepPaid ? 'Monthly Upkeep Paid' : 'Pay Food Upkeep' }}
          </button>
        </div>
      </div>

      <div v-else-if="townStep === 'magpie-trainer'" class="space-y-3">
        <div class="text-sm text-semantic-neutral-300">
          Exchange level controls what the magpie trainer can show you.
        </div>

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
            <div class="text-right">
              <div class="text-sm font-bold text-semantic-warning-300">{{ skill.cost }}</div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-500">
                Level {{ skill.requiredLevel }}
              </div>
            </div>
          </div>

          <div
            class="mt-3 text-xs uppercase tracking-[0.18em]"
            :class="skill.implemented ? 'text-semantic-neutral-500' : 'text-semantic-warning-300'"
          >
            {{ skill.implemented ? skill.effectSummary : 'Pattern scaffolding placeholder' }}
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

      <div v-else-if="townStep === 'tool-store'" class="space-y-3">
        <div class="text-sm text-semantic-neutral-300">
          Flow upgrades and scanner access are gated by your best exchange level.
        </div>

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
            <div class="text-right">
              <div class="text-sm font-bold text-semantic-warning-300">{{ upgrade.cost }}</div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-500">
                Level {{ upgrade.requiredLevel }}
              </div>
            </div>
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

      <button
        type="button"
        class="w-full rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
        :class="
          canAdvance
            ? 'border-semantic-warning-300 bg-semantic-warning-700 text-white hover:bg-semantic-warning-600'
            : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
        "
        :disabled="!canAdvance"
        @click="$emit('continue')"
      >
        {{ townStep === 'tool-store' ? 'Begin Next Month' : 'Continue' }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/shared/components/Modal.vue';

import type {
  MiningAutomationDefinition,
  MiningMagpieSkillId,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
  MiningTownStep,
} from '../game/types';

const orderedSteps: Array<{ id: Exclude<MiningTownStep, 'none'>; label: string }> = [
  { id: 'exchange', label: 'Exchange' },
  { id: 'food-shop', label: 'Food Shop' },
  { id: 'magpie-trainer', label: 'Magpie' },
  { id: 'tool-store', label: 'Tools' },
];

defineProps<{
  isVisible: boolean;
  townStep: MiningTownStep;
  displayLevel: number;
  goldTotal: number;
  coinsTotal: number;
  exchangeSummary: {
    soldGold: number;
    baseValue: number;
    returnPercent: number;
    bonus: number;
    payout: number;
    reachedLevel: number;
    bestLevel: number;
    nextThreshold: number | null;
    progressRatio: number;
    processed: boolean;
  };
  monthlyUpkeepPaid: boolean;
  automationOptions: MiningAutomationDefinition[];
  ownedAutomationIds: MiningMagpieSkillId[];
  toolUpgradeOptions: MiningToolUpgradeDefinition[];
  ownedToolUpgradeIds: MiningToolUpgradeId[];
  canAdvance: boolean;
  canBuyFood: boolean;
  canExchangeGold: boolean;
  canBuyAutomation: (skillId: MiningMagpieSkillId) => boolean;
  canBuyToolUpgrade: (upgradeId: MiningToolUpgradeId) => boolean;
}>();

defineEmits<{
  close: [];
  continue: [];
  'buy-food': [];
  'exchange-gold': [];
  'buy-automation': [skillId: MiningMagpieSkillId];
  'buy-tool-upgrade': [upgradeId: MiningToolUpgradeId];
}>();
</script>
