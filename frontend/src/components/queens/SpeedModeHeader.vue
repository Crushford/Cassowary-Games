<template>
  <div class="p-3 bg-yellow-900 bg-opacity-50 rounded-lg">
    <div class="flex justify-between items-center mb-2">
      <span class="text-yellow-400 font-semibold">⚡ Speed Mode</span>
      <span class="text-yellow-200 text-sm">
        Completed: {{ queensStore.speedModeCompletedCount }}
      </span>
      <span class="text-yellow-300 font-bold">{{
        queensStore.getFormattedSpeedModeTimeRemaining
      }}</span>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleEndRound"
        class="flex-1 p-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
      >
        End Round
      </button>
      <button
        @click="handleRestart"
        class="flex-1 p-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
      >
        Restart
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQueensStore } from '../../stores/queensStore';

const queensStore = useQueensStore();

function handleEndRound() {
  // Check and save records before ending
  queensStore.checkAndSaveSpeedModeRecords();

  // Stop the timer and set time remaining to 0 to trigger completion modal
  if (queensStore.speedModeTimerInterval !== null) {
    clearInterval(queensStore.speedModeTimerInterval);
    queensStore.speedModeTimerInterval = null;
  }
  queensStore.speedModeTimeRemaining = 0;
}

async function handleRestart() {
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
  name: 'SpeedModeHeader',
};
</script>
