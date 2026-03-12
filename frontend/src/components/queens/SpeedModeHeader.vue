<template>
  <GameModeHeader color="yellow">
    <template #label>
      <span class="text-semantic-warning-400 font-semibold">⚡ Speed Mode</span>
    </template>
    <template #stats>
      <span class="text-semantic-warning-200 text-sm">
        Completed: {{ speedModeStore.completedCount }}
      </span>
      <span class="text-semantic-warning-300 font-bold">{{
        speedModeStore.getFormattedTimeRemaining
      }}</span>
    </template>
    <template #actions>
      <button
        class="flex-1 p-1 bg-semantic-danger-600 hover:bg-semantic-danger-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
        @click="handleEndRound"
      >
        End Round
      </button>
      <button
        class="flex-1 p-1 bg-semantic-info-600 hover:bg-semantic-info-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
        @click="handleRestart"
      >
        Restart
      </button>
    </template>
  </GameModeHeader>
</template>

<script setup lang="ts">
import { useSpeedModeStore } from '../../stores/speedModeStore';
import GameModeHeader from './GameModeHeader.vue';

const speedModeStore = useSpeedModeStore();

function handleEndRound() {
  speedModeStore.checkAndSaveRecords();
  if (speedModeStore.timerInterval !== null) {
    clearInterval(speedModeStore.timerInterval);
    speedModeStore.timerInterval = null;
  }
  speedModeStore.timeRemaining = 0;
}

async function handleRestart() {
  const timerDuration = speedModeStore.timerDuration;
  const selectedSize = speedModeStore.size;
  speedModeStore.reset();
  if (timerDuration !== null) {
    speedModeStore.start(timerDuration, selectedSize);
    await speedModeStore.startNextPuzzle();
  }
}
</script>

<script lang="ts">
export default {
  name: 'SpeedModeHeader',
};
</script>
