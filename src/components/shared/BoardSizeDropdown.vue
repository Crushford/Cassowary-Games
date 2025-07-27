<template>
  <div class="relative">
    <!-- Size button -->
    <button
      @click="sizeDropdownOpen = !sizeDropdownOpen"
      class="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-700 text-slate-100 rounded transition-colors duration-150"
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

    <!-- Modal overlay -->
    <div
      v-if="sizeDropdownOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      @click="sizeDropdownOpen = false"
    >
      <!-- Size dropdown modal -->
      <div
        class="bg-slate-900 text-slate-100 rounded-lg shadow-xl border border-slate-700 min-w-[300px] max-w-[400px]"
        @click.stop
      >
        <div class="px-6 py-4 border-b border-slate-700">
          <div class="font-semibold text-lg mb-2">Board Size</div>
          <div class="text-sm text-slate-300">
            Change the size of the game board. Larger boards have more to explore!
          </div>
        </div>
        <div class="p-2">
          <div
            v-for="size in availableSizes"
            :key="size"
            class="px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors duration-150 rounded"
            :class="size === store.gridSize ? 'bg-blue-700/30' : ''"
            @click="selectSize(size)"
          >
            <div class="text-lg font-medium">{{ size }}×{{ size }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  store: any; // The store that has gridSize property and setGridSize method
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
