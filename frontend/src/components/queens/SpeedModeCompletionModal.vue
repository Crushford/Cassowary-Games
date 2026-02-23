<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div>
      <h2 v-if="speedRoundHeading" class="text-2xl font-bold text-yellow-400 mb-4">
        {{ speedRoundHeading }}
      </h2>
      <p class="text-white mb-6 font-semibold text-xl">
        Total Completed: {{ queensStore.speedModeCompletedCount }}
      </p>

      <!-- New Record Message (for 2-minute and 5-minute modes) -->
      <div
        v-if="queensStore.speedModeIsNewRecord"
        class="mb-6 p-4 bg-yellow-500 bg-opacity-20 border-2 border-yellow-500 rounded-lg"
      >
        <p class="text-yellow-400 font-bold text-lg text-center">🎉 New Record! 🎉</p>
        <p class="text-yellow-300 text-sm text-center mt-1">
          You've completed {{ queensStore.speedModeCompletedCount }} puzzles
        </p>
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

      <!-- Best Times for This Session -->
      <div v-if="queensStore.getBestTimesThisSession.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Best Times This Session:</h3>
        <div class="space-y-2">
          <div
            v-for="[size, time] in queensStore.getBestTimesThisSession"
            :key="size"
            class="p-2 bg-gray-700 rounded-lg"
          >
            <div class="flex justify-between items-center mb-1">
              <span class="text-white font-semibold">{{ size }}</span>
              <span class="text-yellow-400 font-bold">{{ queensStore.formatTime(time) }}</span>
            </div>
            <div class="text-xs text-gray-400">
              <span
                v-if="queensStore.isRecordForSize(size, time)"
                class="text-yellow-400 font-semibold"
              >
                🏆 New Record!
              </span>
              <span v-else-if="queensStore.getBestTimesPerSize()[size]">
                Record: {{ queensStore.formatTime(queensStore.getBestTimesPerSize()[size]) }}
              </span>
              <span v-else>First time for this size!</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          @click="handleRetry"
          class="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Retry
        </button>
        <button
          @click="handleClose"
          class="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
        >
          Back to Levels
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import Modal from '../shared/Modal.vue';
import { trackGameComplete } from '../../utils/analyticsEvents';

const router = useRouter();
const queensStore = useQueensStore();

const props = defineProps<{
  isVisible: boolean;
}>();

watch(
  () => props.isVisible,
  (isVisible) => {
    if (!isVisible) {
      return;
    }

    trackGameComplete({
      game_name: 'queens',
      game_mode: 'speed',
      speed_timer_s: queensStore.speedModeTimerDuration ?? undefined,
      speed_completed_count: queensStore.speedModeCompletedCount,
      speed_size_filter: queensStore.speedModeSize ?? 'mixed',
      new_record: queensStore.speedModeIsNewRecord,
    });
  }
);

const sizeBreakdown = computed(() => {
  return Object.entries(queensStore.speedModeCompletedBySize).sort((a, b) => {
    const aSize = parseInt(a[0].split('x')[0], 10);
    const bSize = parseInt(b[0].split('x')[0], 10);
    return aSize - bSize;
  });
});

const speedRoundHeading = computed(() => {
  if (queensStore.speedModeTimerDuration === null) return null;
  const minutes = queensStore.speedModeTimerDuration / 60;
  return `${minutes}min speed round`;
});

function handleClose() {
  queensStore.resetSpeedMode();
  router.push('/queens');
}

async function handleRetry() {
  // Save current speed mode settings before resetting
  const timerDuration = queensStore.speedModeTimerDuration;
  const selectedSize = queensStore.speedModeSize;

  // Reset speed mode
  queensStore.resetSpeedMode();

  // Restart speed mode with same settings
  if (timerDuration !== null) {
    queensStore.startSpeedMode(timerDuration, selectedSize);
    // Load first puzzle
    await queensStore.startSpeedModePuzzle();
  }
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeCompletionModal',
};
</script>
