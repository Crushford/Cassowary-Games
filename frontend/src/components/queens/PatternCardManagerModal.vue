<template>
  <Modal :is-visible="isVisible" @close="$emit('close')">
    <div>
      <h2 class="text-xl font-bold text-purple-300 mb-3">Automations</h2>
      <div class="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
        <div class="text-xs text-gray-300">Queen Auto-Place</div>
        <div
          v-for="upgrade in incrementalStore.automationUpgradeOptions"
          :key="upgrade.id"
          class="bg-indigo-900/40 rounded p-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="text-xs">
              <div class="font-semibold">{{ upgrade.title }}</div>
              <div class="text-gray-300">{{ upgrade.description }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-yellow-300">Cost: {{ upgrade.cost }}</div>
              <button
                type="button"
                class="mt-1 px-2 py-1 rounded text-xs"
                :class="
                  upgrade.canBuy
                    ? 'bg-indigo-700 hover:bg-indigo-600'
                    : 'bg-gray-600 opacity-60 cursor-not-allowed'
                "
                :disabled="!upgrade.canBuy"
                @click="incrementalStore.buyAutomationUpgrade(upgrade.id)"
              >
                {{
                  upgrade.id === 'auto-queen-color' && incrementalStore.autoQueenByColorPurchased
                    ? 'Owned'
                    : upgrade.id === 'auto-queen-row' && incrementalStore.autoQueenByRowPurchased
                      ? 'Owned'
                      : upgrade.id === 'auto-queen-column' &&
                          incrementalStore.autoQueenByColumnPurchased
                        ? 'Owned'
                        : 'Buy'
                }}
              </button>
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-300 mt-3">Pattern Cards</div>
        <div class="text-xs text-gray-300">Owned</div>
        <div
          v-for="card in incrementalStore.ownedPatternCards"
          :key="`owned-${card.id}`"
          class="bg-purple-900/40 rounded p-2"
        >
          <div class="flex items-start gap-2">
            <PatternCardPreview :card="card" />
            <div class="flex-1">
              <button
                type="button"
                class="mt-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                @click="incrementalStore.removePatternCard(card.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-300 mt-3">Available</div>
        <div
          v-for="card in incrementalStore.availableManagePatternCards"
          :key="`available-${card.id}`"
          class="bg-gray-700 rounded p-2"
        >
          <div class="flex items-start gap-2">
            <PatternCardPreview :card="card" />
            <div class="flex-1">
              <div class="text-xs text-yellow-300">
                Cost: {{ incrementalStore.patternCardCost(card.id) }}
              </div>
              <button
                type="button"
                class="mt-1 px-2 py-1 rounded text-xs"
                :class="
                  incrementalStore.canAffordPatternCard(card.id)
                    ? 'bg-purple-700 hover:bg-purple-600'
                    : 'bg-gray-600 opacity-60 cursor-not-allowed'
                "
                :disabled="!incrementalStore.canAffordPatternCard(card.id)"
                @click="incrementalStore.buyPatternCard(card.id)"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      <button
        v-if="incrementalStore.canCreateCustomPatternCard"
        type="button"
        class="w-full mt-3 py-2 rounded bg-purple-700 hover:bg-purple-600 font-semibold"
        @click="$emit('create-custom')"
      >
        Create Your Own Automation
      </button>
      <button
        type="button"
        class="w-full mt-3 py-2 rounded bg-gray-600 hover:bg-gray-500 font-semibold"
        @click="$emit('close')"
      >
        Done
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { useIncrementalQueensStore } from '../../stores/incrementalQueensStore';
import Modal from '../shared/Modal.vue';
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
