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
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Puzzle Mode</h3>
        <div class="grid grid-cols-3 gap-2">
          <!-- Sequential Button -->
          <button
            @click="selectedSize = null"
            class="p-3 rounded-lg transition-colors text-sm font-semibold col-span-3"
            :class="
              selectedSize === null
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            "
          >
            Sequential ({{ sequentialText }})
          </button>

          <!-- Size Buttons -->
          <button
            v-for="size in availableSizes"
            :key="size"
            @click="selectedSize = size"
            class="p-3 rounded-lg transition-colors text-sm font-semibold"
            :class="
              selectedSize === size
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
        class="w-full py-3 px-6 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200"
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
const selectedSize = ref<string | null>(null);

const availableSizes = computed(() => {
  return queensStore.getAvailableSizes();
});

const sequentialText = computed(() => {
  return availableSizes.value.join(' → ');
});

async function handleStart() {
  queensStore.startSpeedMode(selectedTimer.value, selectedSize.value);
  await queensStore.startSpeedModePuzzle();
  emit('close');
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeModal',
};
</script>
