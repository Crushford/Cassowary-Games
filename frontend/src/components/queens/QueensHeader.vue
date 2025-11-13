<template>
  <div class="flex items-center justify-between w-full">
    <!-- Left side: Puzzle info -->
    <div class="flex items-center space-x-4">
      <div class="text-sm">
        <div v-if="isSinglePuzzleMode" class="font-semibold text-lg">
          <router-link to="/" class="text-white hover:text-gray-300 cursor-pointer"
            >Queens</router-link
          >
        </div>
        <div v-else class="font-semibold text-lg">Queens</div>
        <div class="text-gray-400">{{ queensStore.gridSize }}x{{ queensStore.gridSize }}</div>
      </div>
    </div>

    <!-- Right side: Stats -->
    <div class="flex items-center space-x-4">
      <!-- Timer (only in single puzzle mode) -->
      <div
        v-if="isSinglePuzzleMode && elapsedTime !== null"
        class="flex items-center justify-between min-w-[80px]"
      >
        <span class="text-lg">⏱️</span>
        <span class="text-sm font-semibold">{{ formattedTime }}</span>
      </div>
      <!-- Queens found -->
      <div class="flex items-center space-x-2">
        <span class="text-lg">👑</span>
        <span class="text-sm font-semibold"
          >{{ queensStore.queenPositions.length }}/{{ queensStore.gridSize }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';

const queensStore = useQueensStore();
const route = useRoute();

const isSinglePuzzleMode = computed(() => {
  return !queensStore.isSpeedMode && !queensStore.isTutorialMode && route.name === 'queens-puzzle';
});

// Reactive value to trigger timer updates
const now = ref(Date.now());

const elapsedTime = computed(() => {
  if (!isSinglePuzzleMode.value || !queensStore.puzzleStartTime) {
    return null;
  }
  if (queensStore.isComplete) {
    // If puzzle is complete, show the completion time
    return queensStore.puzzleCompletionTime;
  }
  // Calculate elapsed time using reactive now value
  return (now.value - queensStore.puzzleStartTime) / 1000;
});

const formattedTime = computed(() => {
  if (elapsedTime.value === null) return '0.0s';
  const seconds = elapsedTime.value;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const decimal = Math.floor((secs - wholeSecs) * 10);

  if (minutes > 0) {
    return `${minutes}:${wholeSecs.toString().padStart(2, '0')}.${decimal}`;
  }
  return `${wholeSecs}.${decimal}s`;
});

// Update timer every 100ms for smooth display
let timerInterval: number | null = null;

// Watch for single puzzle mode changes to start/stop timer
watch(
  isSinglePuzzleMode,
  (newValue) => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (newValue) {
      timerInterval = window.setInterval(() => {
        now.value = Date.now();
      }, 100);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
  }
});

defineOptions({
  name: 'QueensHeader',
});
</script>
