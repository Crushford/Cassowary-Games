<template>
  <Modal :is-visible="isVisible" @close="$emit('close')">
    <div>
      <h2 class="text-xl font-bold text-purple-300 mb-3">Pattern Cards</h2>
      <div class="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
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
        Create Your Own Pattern Card
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
