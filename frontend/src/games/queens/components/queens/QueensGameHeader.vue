<template>
  <!-- Standard mode: minimal top bar with optional timer -->
  <div
    v-if="queensStore.currentMode === 'standard'"
    class="relative rounded-xl border border-semantic-neutral-700 bg-surface-overlay px-3 py-2 w-full"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-baseline gap-3 text-sm min-w-0">
        <div v-if="isSinglePuzzleMode" class="font-semibold text-lg shrink-0">
          <router-link to="/" class="text-white hover:text-semantic-neutral-300 cursor-pointer"
            >Queens</router-link
          >
        </div>
        <div v-else class="font-semibold text-lg shrink-0">Queens</div>
        <div class="text-semantic-neutral-400 shrink-0">
          {{ queensStore.gridSize }}x{{ queensStore.gridSize }}
        </div>
      </div>

      <div class="flex items-center gap-4 shrink-0">
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
            {{ queensStore.queenPositions.length }}/{{ queensStore.targetQueenCount }}
          </span>
        </div>
        <div ref="settingsMenuRef" class="relative">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-semantic-neutral-700 bg-surface-overlayDim text-semantic-neutral-200 transition-colors hover:border-semantic-neutral-600 hover:bg-semantic-neutral-800"
            aria-label="Open color settings"
            :aria-expanded="showSettingsMenu"
            @click="toggleSettingsMenu"
          >
            <span class="text-lg leading-none">☰</span>
          </button>

          <div
            v-if="showSettingsMenu"
            class="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-semantic-neutral-700 bg-surface-overlayStrong p-2 shadow-2xl"
          >
            <div
              class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
            >
              Region Colors
            </div>
            <button
              v-for="option in colorModeOptions"
              :key="option.value"
              type="button"
              class="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors"
              :class="
                queensStore.regionColorMode === option.value
                  ? 'bg-semantic-neutral-800 text-white'
                  : 'text-semantic-neutral-300 hover:bg-semantic-neutral-900'
              "
              @click="selectRegionColorMode(option.value)"
            >
              <span
                class="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border text-[10px]"
                :class="
                  queensStore.regionColorMode === option.value
                    ? 'border-semantic-info-400 text-semantic-info-300'
                    : 'border-semantic-neutral-600 text-transparent'
                "
              >
                ●
              </span>
              <span>
                <span class="block text-sm font-semibold">{{ option.label }}</span>
                <span class="mt-0.5 block text-xs leading-5 text-semantic-neutral-400">{{
                  option.description
                }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-1 text-xs text-semantic-neutral-500">
      {{ queensStore.targetQueenCount }} queens, minimum distance of
      {{ queensStore.orthogonalMinDistance }} between queens in each row or column
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
        Queens: {{ queensStore.queenPositions.length }}/{{ queensStore.targetQueenCount }}
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import { useRoute, useRouter } from 'vue-router';
import { useQueensStore } from '../../stores/queensStore';
import { useSpeedModeStore } from '../../stores/speedModeStore';
import type { QueensRegionColorMode } from '../../types/types';
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
const showSettingsMenu = ref(false);
const settingsMenuRef = ref<HTMLElement | null>(null);
const colorModeOptions: Array<{
  value: QueensRegionColorMode;
  label: string;
  description: string;
}> = [
  {
    value: 'repeat-base-colors',
    label: 'Repeat Base Colors',
    description: 'Reuse the 8 core hues while avoiding nearby duplicates when possible.',
  },
  {
    value: 'shade-variants',
    label: 'Shade Variants',
    description: 'Expand each hue into dark shade families for more distinct region treatments.',
  },
  {
    value: 'pattern-variants',
    label: 'Pattern Variants',
    description:
      'Combine the core hues with subtle geometric overlays for the most unique regions.',
  },
];

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
  document.removeEventListener('click', handleDocumentClick);
});

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

function toggleSettingsMenu() {
  showSettingsMenu.value = !showSettingsMenu.value;
}

function selectRegionColorMode(mode: QueensRegionColorMode) {
  queensStore.setRegionColorMode(mode);
  showSettingsMenu.value = false;
}

function handleDocumentClick(event: MouseEvent) {
  const menu = settingsMenuRef.value;
  if (!menu) return;
  if (event.target instanceof Node && menu.contains(event.target)) return;
  showSettingsMenu.value = false;
}

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
