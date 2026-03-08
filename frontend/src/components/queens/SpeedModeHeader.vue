<template>
  <GameModeHeader color="yellow">
    <template #label>
      <span class="text-yellow-400 font-semibold">⚡ Speed Mode</span>
    </template>
    <template #stats>
      <span class="text-yellow-200 text-sm">
        Completed: {{ speedModeStore.completedCount }}
      </span>
      <span class="text-yellow-300 font-bold">{{
        speedModeStore.getFormattedTimeRemaining
      }}</span>
    </template>
    <template #actions>
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
