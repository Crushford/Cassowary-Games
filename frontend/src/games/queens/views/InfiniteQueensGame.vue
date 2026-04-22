<template>
  <div
    class="relative w-full max-w-[480px] mx-auto bg-semantic-neutral-950 text-semantic-neutral-100 bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-queens-gradientStart to-queens-gradientEnd flex flex-col overflow-hidden h-dvh"
  >
    <div
      v-if="infiniteStore.loading"
      class="absolute inset-0 z-30 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
    >
      <div
        class="flex flex-col items-center gap-3 rounded-3xl border border-semantic-neutral-700 bg-surface-darkSoft px-6 py-5 text-center shadow-2xl"
      >
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-semantic-neutral-700 border-t-semantic-info-400"
          aria-hidden="true"
        ></div>
        <div class="text-sm font-semibold text-semantic-neutral-100">
          Loading Infinite Queens...
        </div>
      </div>
    </div>

    <div class="flex h-full flex-col">
      <header class="flex-none p-3 pb-2">
        <QueensGameHeader
          variant="infinite"
          infinite-title="Infinite Mode"
          :infinite-queen-count="infiniteStore.queenCount"
          :on-restart="restartGame"
        />
      </header>

      <main class="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <div
          class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-3 shadow-[0_28px_90px_rgba(0,0,0,0.32)]"
        >
          <div class="relative">
            <QueensPuzzleBoard
              :board="boardAdapter"
              interactive
              :board-style="{ transform: 'translateZ(0)' }"
              aria-label="Infinite Queens puzzle grid"
              data-game-board="queens-infinite"
            />

            <button
              class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-lg leading-none text-white shadow-lg transition-colors hover:bg-semantic-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
              :disabled="infiniteStore.viewport.row === 0"
              aria-label="Move up"
              @click="infiniteStore.moveViewport(-1, 0)"
            >
              ↑
            </button>
            <button
              class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-lg leading-none text-white shadow-lg transition-colors hover:bg-semantic-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
              :disabled="infiniteStore.viewport.col === 0"
              aria-label="Move left"
              @click="infiniteStore.moveViewport(0, -1)"
            >
              ←
            </button>
            <button
              class="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-lg leading-none text-white shadow-lg transition-colors hover:bg-semantic-neutral-900"
              aria-label="Move right"
              @click="infiniteStore.moveViewport(0, 1)"
            >
              →
            </button>
            <button
              class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-lg leading-none text-white shadow-lg transition-colors hover:bg-semantic-neutral-900"
              aria-label="Move down"
              @click="infiniteStore.moveViewport(1, 0)"
            >
              ↓
            </button>
          </div>
        </div>

        <div
          v-if="infiniteStore.worldValidationMessage"
          class="mt-3 rounded-2xl border border-semantic-danger-800 bg-semantic-danger-950 px-4 py-3 text-sm text-semantic-danger-100"
        >
          {{ infiniteStore.worldValidationMessage }}
        </div>

        <div
          v-else-if="infiniteStore.statusMessage"
          class="mt-3 rounded-2xl border border-semantic-neutral-800 bg-semantic-neutral-950 px-4 py-3 text-sm text-semantic-neutral-200"
        >
          {{ infiniteStore.statusMessage }}
        </div>

        <div
          v-if="infiniteStore.errorMessage"
          class="mt-3 rounded-2xl border border-semantic-danger-800 bg-semantic-danger-950 px-4 py-3 text-sm text-semantic-danger-100"
        >
          {{ infiniteStore.errorMessage }}
        </div>

        <div class="mt-3 space-y-3">
          <QueensToolSelector :controller="toolController" />
          <QueensActionMenu :actions="actionMenuActions" />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue';
import { useInfiniteQueensStore } from '../stores/infiniteQueensStore';
import { buildInfinitePuzzleBoardAdapter } from '../components/queens/puzzleBoardAdapters';
import type { PuzzleBoardAdapter } from '../components/queens/puzzleBoardTypes';
import type {
  QueensActionMenuAction,
  QueensPlacementMode,
  QueensToolSelectorController,
} from '../components/queens/queensUiContracts';

const QueensGameHeader = defineAsyncComponent(
  () => import('../components/queens/QueensGameHeader.vue')
);
const QueensPuzzleBoard = defineAsyncComponent(
  () => import('../components/queens/QueensPuzzleBoard.vue')
);
const QueensToolSelector = defineAsyncComponent(
  () => import('../components/queens/QueensToolSelector.vue')
);
const QueensActionMenu = defineAsyncComponent(
  () => import('../components/queens/QueensActionMenu.vue')
);

const infiniteStore = useInfiniteQueensStore();

const boardAdapter = computed<PuzzleBoardAdapter>(() =>
  buildInfinitePuzzleBoardAdapter(infiniteStore)
);

const toolController = computed<QueensToolSelectorController>(() => ({
  placementMode: infiniteStore.activeTool as QueensPlacementMode,
  autoFlagging: infiniteStore.autoFlagging,
  isTutorialMode: false,
  highlightToolSelector: false,
  setPlacementMode: infiniteStore.setActiveTool,
  setAutoFlagging: infiniteStore.setAutoFlagging,
}));

const actionMenuActions = computed<QueensActionMenuAction[]>(() => [
  {
    label: 'Auto-flag',
    class:
      'border-semantic-info-700 bg-feedback-infoFaint text-semantic-info-100 enabled:hover:border-semantic-info-600 enabled:hover:bg-feedback-infoSoft',
    onClick: () => infiniteStore.autoFlagBoard(),
  },
  {
    label: 'Clear',
    class:
      'border-semantic-danger-800 bg-semantic-danger-900 text-semantic-danger-100 enabled:hover:bg-semantic-danger-800 enabled:hover:border-semantic-danger-700',
    onClick: () => infiniteStore.clearMarks(),
  },
  {
    label: 'Copy Link',
    class:
      'border-semantic-neutral-500 bg-semantic-neutral-700 text-white enabled:hover:border-semantic-neutral-400 enabled:hover:bg-semantic-neutral-600',
    onClick: () => {
      void copyCurrentLink();
    },
  },
  {
    label: 'Restart',
    class:
      'border-semantic-warning-700 bg-feedback-warningSubtle text-semantic-warning-100 enabled:hover:border-semantic-warning-600 enabled:hover:bg-feedback-warningSoft',
    onClick: () => {
      void restartGame();
    },
  },
]);

async function restartGame(): Promise<void> {
  await infiniteStore.startGame().catch(() => undefined);
}

async function copyCurrentLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    infiniteStore.statusMessage = 'Copied Infinite Queens link.';
  } catch {
    infiniteStore.statusMessage = 'Unable to copy the link.';
  }
}

onMounted(async () => {
  await infiniteStore.startGame().catch(() => undefined);
});
</script>
