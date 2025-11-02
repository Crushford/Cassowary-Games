<template>
  <Modal :is-visible="isVisible" @close="() => {}">
    <div>
      <div class="bg-gray-800 text-white p-4 rounded-xl max-w-md mx-auto space-y-4 text-base">
        <h2 class="text-yellow-400 font-bold text-xl text-center">
          Turn {{ currentTurn }} - Choose Your Selection
        </h2>

        <p class="text-center text-gray-300">
          How many squares would you like to select this turn?
        </p>

        <div class="space-y-3">
          <button
            v-for="option in SELECTION_OPTIONS"
            :key="option.count"
            @click="handleSelection(option.count)"
            class="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 text-left"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-bold text-lg">
                  Select {{ option.count }} {{ option.count === 1 ? 'square' : 'squares' }}
                </div>
                <div class="text-sm text-gray-300 mt-1">
                  {{ option.payout }} coin{{ option.payout === 1 ? '' : 's' }} per honeypot
                </div>
              </div>
              <div class="text-yellow-400 font-bold text-xl">🪙 ×{{ option.payout }}</div>
            </div>
          </button>
        </div>

        <p class="text-xs text-gray-400 text-center">
          More selections = Lower risk, lower payout<br />
          Fewer selections = Higher risk, higher payout
        </p>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { SELECTION_OPTIONS } from '../../stores/kenoStore';
import Modal from '../shared/Modal.vue';

interface Props {
  isVisible: boolean;
  currentTurn: number;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [count: number];
}>();

function handleSelection(count: number) {
  emit('select', count);
}

defineOptions({
  name: 'KenoSelectionModal',
});
</script>
