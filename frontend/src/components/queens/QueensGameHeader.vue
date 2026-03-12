<template>
  <!-- Standard mode: minimal top bar with optional timer -->
  <div
    v-if="queensStore.currentMode === 'standard'"
    class="rounded-xl border border-semantic-neutral-700 bg-surface-overlay px-3 py-2 flex items-center justify-between w-full"
  >
    <!-- Left: puzzle title + size -->
    <div class="flex items-center space-x-4">
      <div class="text-sm">
        <div v-if="isSinglePuzzleMode" class="font-semibold text-lg">
          <router-link to="/" class="text-white hover:text-semantic-neutral-300 cursor-pointer"
            >Queens</router-link
          >
        </div>
        <div v-else class="font-semibold text-lg">Queens</div>
        <div class="text-semantic-neutral-400">
          {{ queensStore.gridSize }}x{{ queensStore.gridSize }}
        </div>
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
      <Button
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-danger-800 bg-semantic-danger-900 text-semantic-danger-100 enabled:hover:bg-semantic-danger-800 enabled:hover:border-semantic-danger-700 flex-1"
        label="End Round"
        @click="handleSpeedEndRound"
      />
      <Button
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-info-800 bg-semantic-info-700 text-semantic-info-100 enabled:hover:bg-semantic-info-600 enabled:hover:border-semantic-info-700 flex-1"
        label="Restart"
        @click="handleSpeedRestart"
      />
    </template>
  </GameModeHeader>

  <!-- Rotate mode: green banner with queens count and navigation -->
  <GameModeHeader v-else color="green">
    <template #label>
      <span class="text-semantic-success-400 font-semibold">🔄 Rotate Mode</span>
    </template>
    <template #stats>
      <span class="text-semantic-success-200 text-sm">
        Queens: {{ queensStore.queenPositions.length }}/{{ queensStore.gridSize }}
      </span>
    </template>
    <template #actions>
      <Button
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-danger-800 bg-semantic-danger-900 text-semantic-danger-100 enabled:hover:bg-semantic-danger-800 enabled:hover:border-semantic-danger-700 flex-1"
        label="Exit"
        @click="handleRotateEnd"
      />
      <Button
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-info-800 bg-semantic-info-700 text-semantic-info-100 enabled:hover:bg-semantic-info-600 enabled:hover:border-semantic-info-700 flex-1"
        label="Next Puzzle"
        @click="queensStore.startNextPuzzle()"
      />
    </template>
  </GameModeHeader>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Button from 'primevue/button';
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
