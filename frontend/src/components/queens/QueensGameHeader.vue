<template>
  <!-- Standard mode: minimal top bar with optional timer -->
  <div
    v-if="queensStore.currentMode === 'standard'"
    class="flex items-center justify-between w-full"
  >
    <!-- Left: puzzle title + size -->
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

    <!-- Right: timer + queens count -->
    <div class="flex items-center space-x-4">
      <div
        v-if="isSinglePuzzleMode && elapsedTime !== null"
        class="flex items-center justify-between min-w-[80px]"
      >
        <span class="text-lg">⏱️</span>
        <span class="text-sm font-semibold">{{ formattedTime }}</span>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-lg">👑</span>
        <span class="text-sm font-semibold">
          {{ queensStore.queenPositions.length }}/{{ queensStore.gridSize }}
        </span>
      </div>
    </div>
  </div>

  <!-- Speed mode: yellow banner with timer countdown and controls -->
  <GameModeHeader v-else-if="queensStore.currentMode === 'speed'" color="yellow">
    <template #label>
      <span class="text-yellow-400 font-semibold">⚡ Speed Mode</span>
    </template>
    <template #stats>
      <span class="text-yellow-200 text-sm"> Completed: {{ speedModeStore.completedCount }} </span>
      <span class="text-yellow-300 font-bold">{{ speedModeStore.getFormattedTimeRemaining }}</span>
    </template>
    <template #actions>
      <button
        @click="handleSpeedEndRound"
        class="flex-1 p-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
      >
        End Round
      </button>
      <button
        @click="handleSpeedRestart"
        class="flex-1 p-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
      >
        Restart
      </button>
    </template>
  </GameModeHeader>

  <!-- Rotate mode: green banner with queens count and navigation -->
  <GameModeHeader v-else color="green">
    <template #label>
      <span class="text-green-400 font-semibold">🔄 Rotate Mode</span>
    </template>
    <template #stats>
      <span class="text-green-200 text-sm">
        Queens: {{ queensStore.queenPositions.length }}/{{ queensStore.gridSize }}
      </span>
    </template>
    <template #actions>
      <button
        @click="handleRotateEnd"
        class="flex-1 p-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
      >
        Exit
      </button>
      <button
        @click="queensStore.startNextPuzzle()"
        class="flex-1 p-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
      >
        Next Puzzle
      </button>
    </template>
  </GameModeHeader>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import { useSpeedModeStore } from '../../stores/speedModeStore';
import GameModeHeader from './GameModeHeader.vue';

const queensStore = useQueensStore();
const speedModeStore = useSpeedModeStore();
const route = useRoute();
const router = useRouter();

// ── Standard mode ─────────────────────────────────────────────────────────────

const isSinglePuzzleMode = computed(
  () =>
    queensStore.currentMode === 'standard' &&
    !queensStore.isTutorialMode &&
    route.name === 'queens-puzzle'
);

const now = ref(Date.now());

const elapsedTime = computed(() => {
  if (!isSinglePuzzleMode.value || !queensStore.puzzleStartTime) return null;
  if (queensStore.isComplete) return queensStore.puzzleCompletionTime;
  return (now.value - queensStore.puzzleStartTime) / 1000;
});

const formattedTime = computed(() => {
  if (elapsedTime.value === null) return '0.0s';
  const seconds = elapsedTime.value;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const decimal = Math.floor((secs - wholeSecs) * 10);
  if (minutes > 0) return `${minutes}:${wholeSecs.toString().padStart(2, '0')}.${decimal}`;
  return `${wholeSecs}.${decimal}s`;
});

let timerInterval: number | null = null;

watch(
  isSinglePuzzleMode,
  (active) => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (active) {
      timerInterval = window.setInterval(() => {
        now.value = Date.now();
      }, 100);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (timerInterval !== null) clearInterval(timerInterval);
});

// ── Speed mode ────────────────────────────────────────────────────────────────

function handleSpeedEndRound() {
  speedModeStore.checkAndSaveRecords();
  if (speedModeStore.timerInterval !== null) {
    clearInterval(speedModeStore.timerInterval);
    speedModeStore.timerInterval = null;
  }
  speedModeStore.timeRemaining = 0;
}

async function handleSpeedRestart() {
  const timerDuration = speedModeStore.timerDuration;
  const selectedSize = speedModeStore.size;
  speedModeStore.reset();
  if (timerDuration !== null) {
    speedModeStore.start(timerDuration, selectedSize);
    await speedModeStore.startNextPuzzle();
  }
}

// ── Rotate mode ───────────────────────────────────────────────────────────────

function handleRotateEnd() {
  queensStore.resetRotateMode();
  router.push('/queens');
}

defineOptions({ name: 'QueensGameHeader' });
</script>
