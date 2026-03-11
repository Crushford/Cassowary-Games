<template>
  <div class="relative">
    <!-- Size button -->
    <button
      class="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-700 text-slate-100 rounded transition-colors duration-150"
      @click="sizeDropdownOpen = !sizeDropdownOpen"
    >
      <span class="text-sm">{{ store.gridSize }}×{{ store.gridSize }}</span>
      <svg
        class="w-4 h-4 transition-transform duration-150"
        :class="sizeDropdownOpen ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Modal -->
    <Modal :is-visible="sizeDropdownOpen" @close="sizeDropdownOpen = false">
      <div class="text-center">
        <h3 class="text-xl font-semibold text-white mb-4">Board Size</h3>
        <p class="text-gray-300 mb-6">
          Change the size of the game board. Larger boards have more to explore!
        </p>
        <div class="space-y-2">
          <div
            v-for="size in availableSizes"
            :key="size"
            class="px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors duration-150 rounded"
            :class="size === store.gridSize ? 'bg-blue-600' : ''"
            @click="selectSize(size)"
          >
            <div class="text-lg font-medium text-white">{{ size }}×{{ size }}</div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from './Modal.vue';

interface Props {
  store: {
    gridSize: number;
    setGridSize?: (size: number) => void;
    isTrainingDay?: boolean;
    resetTraining?: () => void;
    restartGame?: () => void;
  };
}

const props = defineProps<Props>();

const sizeDropdownOpen = ref(false);
const availableSizes = [4, 5, 6, 7, 8];

const selectSize = (size: number) => {
  if (props.store.setGridSize && size !== props.store.gridSize) {
    props.store.setGridSize(size);

    // Restart the game with the new size if the store has restart methods
    if (props.store.isTrainingDay && props.store.resetTraining) {
      props.store.resetTraining();
    } else if (props.store.restartGame) {
      props.store.restartGame();
    }
  }
  sizeDropdownOpen.value = false;
};

defineOptions({
  name: 'BoardSizeDropdown',
});
</script>
