<template>
  <Modal :is-visible="isVisible" aria-label="Mining progression menu" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Progression Menu</h2>
          <p class="mt-1 text-sm text-semantic-neutral-300">
            Prototype mode: every item costs 1 so field, automation, permits, and tools can be
            tested quickly.
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

      <div class="grid grid-cols-4 gap-2">
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

      <div v-if="selectedTab === 'field'" class="space-y-3">
        <div
          v-for="field in fieldOptions"
          :key="field.id"
          class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ field.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">
                {{ field.description }}
              </div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">{{ field.cost }}</div>
          </div>

          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            {{ field.implemented ? 'Live profile' : 'Coming soon' }}
          </div>

          <div class="mt-3 flex gap-2">
            <button
              v-if="!ownedFieldIds.includes(field.id)"
              type="button"
              class="flex-1 rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
              :class="
                field.implemented && canBuyField(field.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
              "
              :disabled="!field.implemented || !canBuyField(field.id)"
              @click="$emit('buy-field', field.id)"
            >
              {{ field.implemented ? `Unlock ${field.title}` : 'Coming Soon' }}
            </button>
            <button
              v-else
              type="button"
              class="flex-1 rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
              :class="
                currentFieldId === field.id
                  ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                  : 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
              "
              @click="$emit('select-field', field.id)"
            >
              {{ currentFieldId === field.id ? 'Selected' : 'Select Field' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="selectedTab === 'automation'" class="space-y-3">
        <div class="rounded-xl bg-semantic-neutral-900 px-4 py-3 text-sm text-semantic-neutral-200">
          {{ hasMagpie ? 'Magpie on payroll.' : 'No magpie hired yet.' }}
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

      <div v-else-if="selectedTab === 'permits'" class="space-y-3">
        <div
          v-for="permit in permitOptions"
          :key="permit.id"
          class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-base font-bold text-white">{{ permit.title }}</div>
              <div class="mt-1 text-sm text-semantic-neutral-300">{{ permit.description }}</div>
            </div>
            <div class="text-sm font-bold text-semantic-warning-300">{{ permit.cost }}</div>
          </div>

          <div class="mt-3 text-xs uppercase tracking-[0.18em] text-semantic-neutral-500">
            Pays {{ permit.payoutMultiplier }}x the base depth reward
          </div>

          <div class="mt-3 flex gap-2">
            <button
              v-if="!ownedPermitTierIds.includes(permit.id)"
              type="button"
              class="flex-1 rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
              :class="
                canBuyPermit(permit.id)
                  ? 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
                  : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-500'
              "
              :disabled="!canBuyPermit(permit.id)"
              @click="$emit('buy-permit', permit.id)"
            >
              Buy {{ permit.title }}
            </button>
            <button
              v-else
              type="button"
              class="flex-1 rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
              :class="
                activePermitTierId === permit.id
                  ? 'border-semantic-success-700 bg-semantic-success-900 text-semantic-success-200'
                  : 'border-semantic-info-500 bg-semantic-info-700 text-white hover:bg-semantic-info-600'
              "
              @click="$emit('activate-permit', permit.id)"
            >
              {{ activePermitTierId === permit.id ? 'Active Permit' : 'Activate Permit' }}
            </button>
          </div>
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
  MiningFieldDefinition,
  MiningFieldId,
  MiningMagpieSkillId,
  MiningPermitDefinition,
  MiningPermitTierId,
  MiningProgressionTab,
  MiningToolUpgradeDefinition,
  MiningToolUpgradeId,
} from '../game/types';

const tabs: Array<{ id: MiningProgressionTab; label: string }> = [
  { id: 'field', label: 'Field' },
  { id: 'automation', label: 'Automation' },
  { id: 'permits', label: 'Permits' },
  { id: 'upgrades', label: 'Tools' },
];

defineProps<{
  isVisible: boolean;
  goldTotal: number;
  selectedTab: MiningProgressionTab;
  fieldOptions: MiningFieldDefinition[];
  currentFieldId: MiningFieldId;
  ownedFieldIds: MiningFieldId[];
  automationOptions: MiningAutomationDefinition[];
  hasMagpie: boolean;
  ownedAutomationIds: MiningMagpieSkillId[];
  permitOptions: MiningPermitDefinition[];
  ownedPermitTierIds: MiningPermitTierId[];
  activePermitTierId: MiningPermitTierId | null;
  toolUpgradeOptions: MiningToolUpgradeDefinition[];
  ownedToolUpgradeIds: MiningToolUpgradeId[];
  canBuyField: (fieldId: MiningFieldId) => boolean;
  canBuyAutomation: (skillId: MiningMagpieSkillId) => boolean;
  canBuyPermit: (permitId: MiningPermitTierId) => boolean;
  canBuyToolUpgrade: (upgradeId: MiningToolUpgradeId) => boolean;
}>();

defineEmits<{
  close: [];
  'select-tab': [tab: MiningProgressionTab];
  'buy-field': [fieldId: MiningFieldId];
  'select-field': [fieldId: MiningFieldId];
  'buy-automation': [skillId: MiningMagpieSkillId];
  'buy-permit': [permitId: MiningPermitTierId];
  'activate-permit': [permitId: MiningPermitTierId];
  'buy-tool-upgrade': [upgradeId: MiningToolUpgradeId];
}>();
</script>
