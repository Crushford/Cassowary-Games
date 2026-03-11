<template>
  <Dialog
    :visible="isVisible"
    modal
    :closable="false"
    class="w-[min(94vw,34rem)]"
    @update:visible="!$event && handleClose()"
  >
    <div>
      <h2 v-if="speedRoundHeading" class="text-2xl font-bold text-yellow-400 mb-4">
        {{ speedRoundHeading }}
      </h2>
      <p class="text-white mb-6 font-semibold text-xl">
        Total Completed: {{ speedModeStore.completedCount }}
      </p>

      <!-- New Record Message (for 2-minute and 5-minute modes) -->
      <div
        v-if="speedModeStore.isNewRecord"
        class="mb-6 p-4 bg-yellow-500 bg-opacity-20 border-2 border-yellow-500 rounded-lg"
      >
        <p class="text-yellow-400 font-bold text-lg text-center">🎉 New Record! 🎉</p>
        <p class="text-yellow-300 text-sm text-center mt-1">
          You've completed {{ speedModeStore.completedCount }} puzzles
        </p>
        <p class="text-yellow-300 text-sm text-center mt-1">
          Previous record: {{ speedModeStore.previousRecord }}
        </p>
      </div>

      <!-- Breakdown by Size -->
      <div v-if="Object.keys(speedModeStore.completedBySize).length > 0" class="mb-6">
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
      <div v-if="speedModeStore.getBestTimesThisSession.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-3">Best Times This Session:</h3>
        <div class="space-y-2">
          <div
            v-for="[size, time] in speedModeStore.getBestTimesThisSession"
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
        <Button
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-blue-800 bg-blue-700 text-blue-100 enabled:hover:bg-blue-600 enabled:hover:border-blue-700 flex-1"
          label="Retry"
          @click="handleRetry"
        />
        <Button
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-amber-700 bg-amber-800 text-amber-100 enabled:hover:bg-amber-700 enabled:hover:border-amber-600 flex-1"
          label="Back to Levels"
          @click="handleClose"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import { useSpeedModeStore } from '../../stores/speedModeStore';
import { trackGameComplete } from '../../utils/analyticsEvents';

const router = useRouter();
const queensStore = useQueensStore();
const speedModeStore = useSpeedModeStore();

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
      speed_timer_s: speedModeStore.timerDuration ?? undefined,
      speed_completed_count: speedModeStore.completedCount,
      speed_size_filter: speedModeStore.size ?? 'mixed',
      new_record: speedModeStore.isNewRecord,
    });
  }
);

const sizeBreakdown = computed(() => {
  return Object.entries(speedModeStore.completedBySize).sort((a, b) => {
    const aSize = parseInt(a[0].split('x')[0], 10);
    const bSize = parseInt(b[0].split('x')[0], 10);
    return aSize - bSize;
  });
});

const speedRoundHeading = computed(() => {
  if (speedModeStore.timerDuration === null) return null;
  const minutes = speedModeStore.timerDuration / 60;
  return `${minutes}min speed round`;
});

function handleClose() {
  speedModeStore.reset();
  router.push('/queens');
}

async function handleRetry() {
  // Save current speed mode settings before resetting
  const timerDuration = speedModeStore.timerDuration;
  const selectedSize = speedModeStore.size;

  // Reset speed mode
  speedModeStore.reset();

  // Restart speed mode with same settings
  if (timerDuration !== null) {
    speedModeStore.start(timerDuration, selectedSize);
    await speedModeStore.startNextPuzzle();
  }
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeCompletionModal',
};
</script>
