<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div>
      <h2 class="text-2xl font-bold text-yellow-400 mb-4">Time's Up! ⏰</h2>
      <p class="text-white mb-2">Great job completing puzzles!</p>
      <p class="text-white mb-6 font-semibold text-xl">
        Total Completed: {{ queensStore.speedModeCompletedCount }}
      </p>

      <!-- New Record Message (only for 2-minute mode) -->
      <div
        v-if="queensStore.speedModeTimerDuration === 120 && queensStore.speedModeIsNewRecord"
        class="mb-6 p-4 bg-yellow-500 bg-opacity-20 border-2 border-yellow-500 rounded-lg"
      >
        <p class="text-yellow-400 font-bold text-lg text-center">🎉 New Record! 🎉</p>
        <p class="text-yellow-300 text-sm text-center mt-1">
          Previous record: {{ queensStore.speedModePreviousRecord }}
        </p>
      </div>

      <!-- Breakdown by Size -->
      <div v-if="Object.keys(queensStore.speedModeCompletedBySize).length > 0" class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Completed by Size:</h3>
        <div class="space-y-2">
          <div
            v-for="[size, count] in sizeBreakdown"
            :key="size"
            class="flex justify-between items-center p-2 bg-gray-700 rounded-lg"
          >
            <span class="text-white font-semibold">{{ size }}</span>
            <span class="text-yellow-400 font-bold">{{ count }}</span>
          </div>
        </div>
      </div>

      <button
        @click="handleClose"
        class="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
      >
        Back to Levels
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import Modal from '../shared/Modal.vue';

const router = useRouter();
const queensStore = useQueensStore();

defineProps<{
  isVisible: boolean;
}>();

const sizeBreakdown = computed(() => {
  return Object.entries(queensStore.speedModeCompletedBySize).sort((a, b) => {
    const aSize = parseInt(a[0].split('x')[0], 10);
    const bSize = parseInt(b[0].split('x')[0], 10);
    return aSize - bSize;
  });
});

function handleClose() {
  queensStore.resetSpeedMode();
  router.push('/queens');
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeCompletionModal',
};
</script>
