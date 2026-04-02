<template>
  <Modal :is-visible="isVisible" aria-label="Town" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Town</h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">
            Cash out your haul, improve the crew, then head back to the claim whenever you want.
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
          Next Field: <span class="text-semantic-warning-300">1 Gold</span>
        </div>
      </div>

      <div class="grid gap-2" :class="showPermitOffice ? 'grid-cols-5' : 'grid-cols-4'">
        <button
          v-for="step in visibleSteps"
          :key="step.id"
          type="button"
          class="rounded-xl border px-2 py-2 text-center text-[11px] font-bold uppercase leading-tight tracking-[0.14em]"
          :class="
            townStep === step.id
              ? 'border-semantic-warning-300 bg-semantic-warning-700 text-white'
              : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-400 hover:bg-semantic-neutral-800'
          "
          @click="$emit('select-step', step.id)"
        >
          {{ step.label }}
        </button>
      </div>

      <div v-if="townStep === 'exchange'" class="space-y-3">
        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="text-base font-bold text-white">Gold Exchange</div>
          <div class="mt-1 text-sm text-semantic-neutral-300">
            Grade your haul and see how far you climbed. Your gold stays in your bag for spending.
          </div>

          <div
            class="mt-3 rounded-lg bg-semantic-neutral-950 px-3 py-2 text-sm text-semantic-neutral-200"
          >
            Exchange level is based on the gold you bring in. Level
            {{ exchangeSummary.processed ? exchangeSummary.reachedLevel : displayLevel || 1 }}
            currently grades
            <span class="font-bold text-semantic-warning-300"
              >{{ exchangeSummary.processed ? exchangeSummary.returnPercent : 0 }}%</span
            >
            return.
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Gold Graded:
              <span class="font-bold text-semantic-warning-300">{{
                exchangeSummary.processed ? exchangeSummary.soldGold : goldTotal
              }}</span>
            </div>
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Gold Remaining:
              <span class="font-bold text-semantic-warning-300">{{
                exchangeSummary.processed ? goldTotal : goldTotal
              }}</span>
            </div>
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Return Rate:
              <span class="font-bold text-semantic-warning-300"
                >{{ exchangeSummary.processed ? exchangeSummary.returnPercent : 0 }}%</span
              >
            </div>
            <div class="rounded-lg bg-semantic-neutral-950 px-3 py-2 text-semantic-neutral-200">
              Best Level:
              <span class="font-bold text-semantic-warning-300">{{
                exchangeSummary.processed ? exchangeSummary.reachedLevel : displayLevel
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
            class="mt-4 w-full rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors"
            :class="
              canExchangeGold
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="!canExchangeGold"
            @click="$emit('exchange-gold')"
          >
            {{ exchangeSummary.processed ? 'Exchange Complete' : 'Grade Gold' }}
          </button>
        </div>
      </div>

      <div v-else-if="townStep === 'magpie-trainer'" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm text-semantic-neutral-300">
            Exchange level controls what the magpie trainer can show you.
          </div>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="
              showPurchasedUpgrades
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-200 hover:bg-semantic-neutral-800'
            "
            @click="$emit('toggle-purchased')"
          >
            {{ showPurchasedUpgrades ? 'Hide Purchased' : 'Show Purchased' }}
          </button>
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
              <div class="text-sm font-bold text-semantic-warning-300">{{ skill.cost }} Gold</div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-500">
                Level {{ skill.requiredLevel }}
              </div>
            </div>
          </div>

          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            {{ skill.effectSummary }}
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors"
            :class="
              ownedAutomationIds.includes(skill.id)
                ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                : canBuyAutomation(skill.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="ownedAutomationIds.includes(skill.id) || !canBuyAutomation(skill.id)"
            @click="$emit('buy-automation', skill.id)"
          >
            {{
              ownedAutomationIds.includes(skill.id)
                ? 'Owned'
                : canBuyAutomation(skill.id)
                  ? `Buy ${skill.title}`
                  : skill.id !== 'buy-magpie' && !ownedAutomationIds.includes('buy-magpie')
                    ? 'Requires Magpie'
                    : `Buy ${skill.title}`
            }}
          </button>
        </div>
      </div>

      <div v-else-if="townStep === 'tool-store'" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm text-semantic-neutral-300">
            Flow upgrades and scanner access are gated by your best exchange level.
          </div>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="
              showPurchasedUpgrades
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-200 hover:bg-semantic-neutral-800'
            "
            @click="$emit('toggle-purchased')"
          >
            {{ showPurchasedUpgrades ? 'Hide Purchased' : 'Show Purchased' }}
          </button>
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
              <div class="text-sm font-bold text-semantic-warning-300">{{ upgrade.cost }} Gold</div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-500">
                Level {{ upgrade.requiredLevel }}
              </div>
            </div>
          </div>

          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            {{ upgrade.effectSummary }}
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors"
            :class="
              ownedToolUpgradeIds.includes(upgrade.id)
                ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                : canBuyToolUpgrade(upgrade.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="ownedToolUpgradeIds.includes(upgrade.id) || !canBuyToolUpgrade(upgrade.id)"
            @click="$emit('buy-tool-upgrade', upgrade.id)"
          >
            {{ ownedToolUpgradeIds.includes(upgrade.id) ? 'Owned' : `Buy ${upgrade.title}` }}
          </button>
        </div>
      </div>

      <div v-else-if="townStep === 'permit-office'" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm text-semantic-neutral-300">
            Exchange level 4 opens larger claims. New permits affect future fields, not the one you
            are already working.
          </div>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="
              showPurchasedUpgrades
                ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-200 hover:bg-semantic-neutral-800'
            "
            @click="$emit('toggle-purchased')"
          >
            {{ showPurchasedUpgrades ? 'Hide Purchased' : 'Show Purchased' }}
          </button>
        </div>

        <div class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4">
          <div class="text-sm uppercase tracking-[0.18em] text-semantic-neutral-500">
            Current Claim
          </div>
          <div class="mt-2 text-2xl font-black text-semantic-warning-300">
            {{ maxPlotSize }}x{{ maxPlotSize }}
          </div>
        </div>

        <div
          v-for="permit in plotPermitOptions"
          :key="permit.id"
          class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ permit.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">{{ permit.description }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-semantic-warning-300">{{ permit.cost }} Gold</div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-500">
                Level {{ permit.requiredLevel }}
              </div>
            </div>
          </div>

          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            {{ permit.effectSummary }}
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors"
            :class="
              permit.size <= maxPlotSize
                ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                : canBuyPlotPermit(permit.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
            "
            :disabled="permit.size <= maxPlotSize || !canBuyPlotPermit(permit.id)"
            @click="$emit('buy-plot-permit', permit.id)"
          >
            {{ permit.size <= maxPlotSize ? 'Owned' : `Buy ${permit.title}` }}
          </button>
        </div>
      </div>

      <button
        type="button"
        class="w-full rounded-xl border border-semantic-warning-300 bg-semantic-warning-700 px-4 py-2 text-center text-sm font-bold leading-tight text-white transition-colors hover:bg-semantic-warning-600"
        @click="$emit('return-to-mine')"
      >
        Return To Mine
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import Modal from '@/shared/components/Modal.vue';

import type {
  MiningAutomationDefinition,
  MiningMagpieSkillId,
  MiningPlotPermitDefinition,
  MiningPlotPermitId,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
  MiningTownStep,
} from '../game/types';

const orderedSteps: Array<{ id: Exclude<MiningTownStep, 'none'>; label: string }> = [
  { id: 'exchange', label: 'Exchange' },
  { id: 'magpie-trainer', label: 'Magpie' },
  { id: 'tool-store', label: 'Tools' },
  { id: 'permit-office', label: 'Permits' },
];

const props = defineProps<{
  isVisible: boolean;
  townStep: MiningTownStep;
  displayLevel: number;
  goldTotal: number;
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
  automationOptions: MiningAutomationDefinition[];
  ownedAutomationIds: MiningMagpieSkillId[];
  toolUpgradeOptions: MiningToolUpgradeDefinition[];
  ownedToolUpgradeIds: MiningToolUpgradeId[];
  plotPermitOptions: MiningPlotPermitDefinition[];
  maxPlotSize: number;
  showPermitOffice: boolean;
  canExchangeGold: boolean;
  showPurchasedUpgrades: boolean;
  canBuyAutomation: (skillId: MiningMagpieSkillId) => boolean;
  canBuyToolUpgrade: (upgradeId: MiningToolUpgradeId) => boolean;
  canBuyPlotPermit: (permitId: MiningPlotPermitId) => boolean;
}>();

const visibleSteps = computed(() =>
  orderedSteps.filter((step) => props.showPermitOffice || step.id !== 'permit-office')
);

defineEmits<{
  close: [];
  'return-to-mine': [];
  'select-step': [step: Exclude<MiningTownStep, 'none'>];
  'exchange-gold': [];
  'buy-automation': [skillId: MiningMagpieSkillId];
  'buy-tool-upgrade': [upgradeId: MiningToolUpgradeId];
  'buy-plot-permit': [permitId: MiningPlotPermitId];
  'toggle-purchased': [];
}>();
</script>
