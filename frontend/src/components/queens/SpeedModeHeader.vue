<template>
  <div class="p-3 bg-yellow-900 bg-opacity-50 rounded-lg">
    <div class="flex justify-between items-center mb-2">
      <span class="text-yellow-400 font-semibold">⚡ Speed Mode</span>
      <span class="text-yellow-200 text-sm">
        Completed: {{ queensStore.speedModeCompletedCount }}
      </span>
      <span class="text-yellow-300 font-bold">{{
        formatTime(queensStore.speedModeTimeRemaining || 0)
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleEndRound() {
  // Stop the timer and set time remaining to 0 to trigger completion modal
  if (queensStore.speedModeTimerInterval !== null) {
    clearInterval(queensStore.speedModeTimerInterval);
    queensStore.speedModeTimerInterval = null;
  }
  queensStore.speedModeTimeRemaining = 0;

  // Check and save record for 2-minute mode
  if (queensStore.speedModeTimerDuration === 120) {
    const currentRecord = queensStore.getSpeedMode2MinRecord();
    queensStore.speedModePreviousRecord = currentRecord;
    if (queensStore.speedModeCompletedCount > currentRecord) {
      queensStore.speedModeIsNewRecord = true;
      // Save record using localStorage directly (store method doesn't exist for saving)
      try {
        localStorage.setItem(
          'queens-speed-mode-2min-record',
          String(queensStore.speedModeCompletedCount)
        );
      } catch (e) {
        console.error('Failed to save speed mode record:', e);
      }
    } else {
      queensStore.speedModeIsNewRecord = false;
    }
  }
}

async function handleRestart() {
  // Save current speed mode settings before resetting
  const timerDuration = queensStore.speedModeTimerDuration;
  const selectedSizes = queensStore.speedModeSelectedSizes;

  // Reset speed mode
  queensStore.resetSpeedMode();

  // Restart speed mode with same settings
  if (timerDuration !== null) {
    queensStore.startSpeedMode(timerDuration, selectedSizes);
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
