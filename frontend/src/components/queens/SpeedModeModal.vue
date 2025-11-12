<template>
  <Modal :is-visible="isVisible" @close="$emit('close')">
    <div>
      <h2 class="text-2xl font-bold text-yellow-400 mb-4">Speed Mode ⚡</h2>
      <p class="text-white mb-6">Race against the clock to complete as many puzzles as possible!</p>

      <!-- Timer Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Timer Duration</h3>
        <div class="flex gap-3">
          <button
            @click="selectedTimer = 120"
            class="flex-1 py-3 px-4 rounded-lg transition-colors font-semibold"
            :class="
              selectedTimer === 120
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            "
          >
            2 Minutes
          </button>
          <button
            @click="selectedTimer = 300"
            class="flex-1 py-3 px-4 rounded-lg transition-colors font-semibold"
            :class="
              selectedTimer === 300
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            "
          >
            5 Minutes
          </button>
        </div>
      </div>

      <!-- Size Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Puzzle Sizes</h3>
        <div class="mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" :value="null" v-model="sizeMode" class="w-4 h-4 text-yellow-500" />
            <span class="text-white">Sequential (4x4 → 5x5 → 6x6 → 7x7 → 8x8)</span>
          </label>
        </div>
        <div class="mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="select" v-model="sizeMode" class="w-4 h-4 text-yellow-500" />
            <span class="text-white">Select Sizes</span>
          </label>
        </div>

        <!-- Size Selection Grid -->
        <div v-if="sizeMode === 'select'" class="grid grid-cols-3 gap-2 mt-3">
          <button
            v-for="size in availableSizes"
            :key="size"
            @click="toggleSize(size)"
            class="p-2 rounded-lg transition-colors text-sm font-semibold"
            :class="
              selectedSizes.includes(size)
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            "
          >
            {{ size }}
          </button>
        </div>
      </div>

      <!-- Start Button -->
      <button
        @click="handleStart"
        :disabled="sizeMode === 'select' && selectedSizes.length === 0"
        class="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg transition-colors duration-200"
      >
        Start Speed Mode
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQueensStore } from '../../stores/queensStore';
import Modal from '../shared/Modal.vue';

const queensStore = useQueensStore();

defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const selectedTimer = ref<number>(120);
const sizeMode = ref<'random' | 'select' | null>(null);
const selectedSizes = ref<string[]>([]);

const availableSizes = computed(() => {
  return queensStore.getAvailableSizes();
});

function toggleSize(size: string) {
  const index = selectedSizes.value.indexOf(size);
  if (index === -1) {
    selectedSizes.value.push(size);
  } else {
    selectedSizes.value.splice(index, 1);
  }
}

async function handleStart() {
  const sizes = sizeMode.value === 'select' ? selectedSizes.value : null;
  if (sizeMode.value === 'select' && selectedSizes.value.length === 0) {
    return; // Don't start if no sizes selected
  }
  queensStore.startSpeedMode(selectedTimer.value, sizes);
  await queensStore.startSpeedModePuzzle();
  emit('close');
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeModal',
};
</script>
