<template>
  <Modal :is-visible="isVisible" @close="closeModal">
    <div class="relative w-full h-full max-w-4xl mx-auto flex items-center justify-center">
      <!-- Close Button -->
      <button
        @click="closeModal"
        class="absolute -top-8 -right-8 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-600 hover:text-gray-800 rounded-full p-2 transition-all shadow-lg"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <!-- Harvest Game Component -->
      <div class="w-full max-w-md">
        <HarvestGame :is-game-only="true" :puzzle-data="currentPuzzleData" />
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, watch } from 'vue';
import { usePlantStore } from '../../stores/plantStore';

const Modal = defineAsyncComponent(() => import('../shared/Modal.vue'));
const HarvestGame = defineAsyncComponent(() => import('../../views/HarvestGame.vue'));

interface Props {
  isVisible: boolean;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const plantStore = usePlantStore();
const currentPuzzleData = ref<any>(null);

// Load puzzle data when modal becomes visible
watch(
  () => props.isVisible,
  (isVisible) => {
    if (isVisible) {
      currentPuzzleData.value = plantStore.exportPuzzleData();
    } else {
      currentPuzzleData.value = null;
    }
  }
);

const closeModal = () => {
  emit('close');
};

defineOptions({
  name: 'PuzzleValidationModal',
});
</script>
