<template>
  <Dialog
    :visible="isVisible"
    modal
    class="w-[min(94vw,36rem)]"
    header="Automations"
    @update:visible="!$event && $emit('close')"
  >
    <div>
      <div class="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
        <div class="text-xs text-gray-300">Queen Auto-Place</div>
        <div
          v-for="upgrade in incrementalStore.automationUpgradeOptions"
          :key="upgrade.id"
          class="rounded-lg border border-slate-700/80 bg-slate-900 p-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="text-xs">
              <div class="font-semibold">{{ upgrade.title }}</div>
              <div class="text-gray-300">{{ upgrade.description }}</div>
            </div>
            <div class="text-right">
              <Tag
                class="rounded-full border border-amber-500/70 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold leading-none text-amber-300"
                :value="`Cost ${upgrade.cost}`"
              />
              <Button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px mt-1"
                :class="
                  upgrade.canBuy
                    ? 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-accent'
                    : 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-subtle opacity-60 cursor-not-allowed'
                "
                :disabled="!upgrade.canBuy"
                @click="incrementalStore.buyAutomationUpgrade(upgrade.id)"
                :label="
                  upgrade.id === 'auto-queen-color' && incrementalStore.autoQueenByColorPurchased
                    ? 'Owned'
                    : upgrade.id === 'auto-queen-row' && incrementalStore.autoQueenByRowPurchased
                      ? 'Owned'
                      : upgrade.id === 'auto-queen-column' &&
                          incrementalStore.autoQueenByColumnPurchased
                        ? 'Owned'
                        : 'Buy'
                "
              />
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-300 mt-3">Pattern Cards</div>
        <div class="text-xs text-gray-300">Owned</div>
        <div
          v-for="card in incrementalStore.ownedPatternCards"
          :key="`owned-${card.id}`"
          class="rounded-lg border border-slate-700/80 bg-slate-900 p-2"
        >
          <div class="flex items-start gap-2">
            <PatternCardPreview :card="card" />
            <div class="flex-1">
              <Button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-slate-700 bg-slate-800 text-slate-200 enabled:hover:bg-slate-700 enabled:hover:border-slate-600 mt-1"
                label="Remove"
                @click="incrementalStore.removePatternCard(card.id)"
              />
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-300 mt-3">Available</div>
        <div
          v-for="card in incrementalStore.availableManagePatternCards"
          :key="`available-${card.id}`"
          class="rounded-lg border border-slate-700/80 bg-slate-900 p-2"
        >
          <div class="flex items-start gap-2">
            <PatternCardPreview :card="card" />
            <div class="flex-1">
              <Tag
                class="rounded-full border border-amber-500/70 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold leading-none text-amber-300"
                :value="`Cost ${incrementalStore.patternCardCost(card.id)}`"
              />
              <Button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px mt-1"
                :class="
                  incrementalStore.canAffordPatternCard(card.id)
                    ? 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-accent'
                    : 'rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px-subtle opacity-60 cursor-not-allowed'
                "
                :disabled="!incrementalStore.canAffordPatternCard(card.id)"
                @click="incrementalStore.buyPatternCard(card.id)"
                label="Add"
              />
            </div>
          </div>
        </div>
      </div>
      <Button
        v-if="incrementalStore.canCreateCustomPatternCard"
        type="button"
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-blue-800 bg-blue-700 text-blue-100 enabled:hover:bg-blue-600 enabled:hover:border-blue-700 w-full mt-3"
        label="Create Your Own Automation"
        @click="$emit('create-custom')"
      />
      <Button
        type="button"
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-slate-700 bg-slate-800 text-slate-200 enabled:hover:bg-slate-700 enabled:hover:border-slate-600 w-full mt-3"
        label="Done"
        @click="$emit('close')"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
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
</script>

<script lang="ts">
export default {
  name: 'PatternCardManagerModal',
};
</script>
