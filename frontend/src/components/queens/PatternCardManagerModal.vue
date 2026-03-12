<template>
  <Dialog
    :visible="isVisible"
    modal
    class="w-[min(94vw,36rem)]"
    header="Automations"
    @update:visible="!$event && $emit('close')"
  >
    <div class="flex flex-col max-h-[80vh] overflow-hidden">
      <div class="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
        <div class="text-xs text-semantic-neutral-300">Queen Auto-Place</div>
        <div
          v-for="upgrade in availableAutomationUpgrades"
          :key="upgrade.id"
          class="rounded-lg border border-edge-neutralMuted bg-semantic-neutral-900 p-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="text-xs">
              <div class="font-semibold">{{ upgrade.title }}</div>
              <div class="text-semantic-neutral-300">{{ upgrade.description }}</div>
            </div>
            <div class="text-right">
              <Tag
                class="rounded-full border border-edge-warningMuted bg-surface-overlayStrong px-3 py-1.5 text-xs font-semibold leading-none text-semantic-warning-300"
                :value="`Cost ${upgrade.cost}`"
              />
              <Button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px mt-1"
                :class="
                  upgrade.canBuy
                    ? 'border-semantic-info-800 bg-semantic-info-700 text-semantic-info-100 enabled:hover:bg-semantic-info-600 enabled:hover:border-semantic-info-700'
                    : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-300 opacity-60 cursor-not-allowed'
                "
                :disabled="!upgrade.canBuy"
                label="Buy"
                @click="incrementalStore.buyAutomationUpgrade(upgrade.id)"
              />
            </div>
          </div>
        </div>
        <div
          v-if="availableAutomationUpgrades.length === 0"
          class="rounded-lg border border-edge-neutralMuted bg-semantic-neutral-900 p-2 text-xs text-semantic-neutral-300"
        >
          All queen auto-place upgrades are purchased.
        </div>

        <div class="text-xs text-semantic-neutral-300 mt-3">Pattern Automations</div>
        <div
          v-for="card in availablePatternCards"
          :key="`available-${card.id}`"
          class="rounded-lg border border-edge-neutralMuted bg-semantic-neutral-900 p-2"
        >
          <div class="flex items-start gap-2">
            <PatternCardPreview :card="card" />
            <div class="flex-1">
              <Tag
                class="rounded-full border border-edge-warningMuted bg-surface-overlayStrong px-3 py-1.5 text-xs font-semibold leading-none text-semantic-warning-300"
                :value="`Cost ${incrementalStore.patternCardCost(card.id)}`"
              />
              <Button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px mt-1"
                :class="
                  incrementalStore.canAffordPatternCard(card.id)
                    ? 'border-semantic-info-800 bg-semantic-info-700 text-semantic-info-100 enabled:hover:bg-semantic-info-600 enabled:hover:border-semantic-info-700'
                    : 'border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-300 opacity-60 cursor-not-allowed'
                "
                :disabled="!incrementalStore.canAffordPatternCard(card.id)"
                label="Add"
                @click="incrementalStore.buyPatternCard(card.id)"
              />
            </div>
          </div>
        </div>
        <div
          v-if="availablePatternCards.length === 0 && !canShowCreateCustomAutomation"
          class="rounded-lg border border-edge-neutralMuted bg-semantic-neutral-900 p-2 text-xs text-semantic-neutral-300"
        >
          Purchase all base pattern automations to unlock custom automations.
        </div>
      </div>
      <div class="mt-3 border-t border-semantic-neutral-700 pt-3 bg-semantic-neutral-900">
        <Button
          v-if="canShowCreateCustomAutomation"
          type="button"
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-info-800 bg-semantic-info-700 text-semantic-info-100 enabled:hover:bg-semantic-info-600 enabled:hover:border-semantic-info-700 w-full"
          label="Create Your Own Automation"
          @click="$emit('create-custom')"
        />
        <Button
          type="button"
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-neutral-700 bg-semantic-neutral-800 text-semantic-neutral-200 enabled:hover:bg-semantic-neutral-700 enabled:hover:border-semantic-neutral-600 w-full"
          :class="incrementalStore.canCreateCustomPatternCard ? 'mt-3' : ''"
          label="Done"
          @click="$emit('close')"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { useIncrementalQueensStore } from '../../stores/incrementalQueensStore';
import PatternCardPreview from './PatternCardPreview.vue';

defineProps<{
  isVisible: boolean;
}>();

defineEmits<{
  close: [];
  'create-custom': [];
}>();

const incrementalStore = useIncrementalQueensStore();

const availableAutomationUpgrades = computed(() => {
  return incrementalStore.automationUpgradeOptions.filter((upgrade) => {
    if (upgrade.id === 'auto-queen-color') return !incrementalStore.autoQueenByColorPurchased;
    if (upgrade.id === 'auto-queen-row') return !incrementalStore.autoQueenByRowPurchased;
    return !incrementalStore.autoQueenByColumnPurchased;
  });
});

const availablePatternCards = computed(() => incrementalStore.availableManagePatternCards);

const canShowCreateCustomAutomation = computed(() => incrementalStore.canCreateCustomPatternCard);
</script>

<script lang="ts">
export default {
  name: 'PatternCardManagerModal',
};
</script>
