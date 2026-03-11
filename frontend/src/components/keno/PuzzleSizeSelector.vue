<template>
  <!-- PuzzleSizeSelector -->
  <div class="relative">
    <!-- Size button -->
    <button
      class="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors duration-150 text-sm"
      @click="sizeDropdownOpen = !sizeDropdownOpen"
    >
      <span>{{ store.puzzleSize }}</span>
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
        <h3 class="text-xl font-semibold text-white mb-4">Puzzle Size</h3>
        <p class="text-gray-300 mb-6">
          Choose the size of the puzzle board. Larger boards have more squares to explore!
        </p>
        <div class="space-y-2">
          <div
            v-for="size in availableSizes"
            :key="size"
            class="px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors duration-150 rounded"
            :class="size === store.puzzleSize ? 'bg-blue-600' : ''"
            @click="selectSize(size)"
          >
            <div class="text-lg font-medium text-white">{{ size }}</div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../shared/Modal.vue';
import type { useKenoStore } from '../../stores/kenoStore';

interface Props {
  store: ReturnType<typeof useKenoStore>;
}

const props = defineProps<Props>();

const sizeDropdownOpen = ref(false);
const availableSizes = ['4x4', '5x5', '6x6', '7x7', '8x8'];

const selectSize = (size: string) => {
  if (props.store.puzzleSize !== size) {
    props.store.setPuzzleSize(size);
  }
  sizeDropdownOpen.value = false;
};

defineOptions({
  name: 'PuzzleSizeSelector',
});
</script>
