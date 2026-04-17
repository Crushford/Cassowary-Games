<template>
  <div
    class="relative h-svh w-full max-w-[480px] mx-auto overflow-hidden bg-[radial-gradient(120%_120%_at_50%_-15%,rgba(34,197,94,0.24)_0%,rgba(17,24,39,1)_52%)] text-semantic-neutral-100"
  >
    <div
      v-if="infiniteStore.loading"
      class="absolute inset-0 z-30 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
    >
      <div
        class="flex flex-col items-center gap-3 rounded-3xl border border-semantic-neutral-700 bg-surface-darkSoft px-6 py-5 text-center shadow-2xl"
      >
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-semantic-neutral-700 border-t-semantic-success-400"
          aria-hidden="true"
        ></div>
        <div class="text-sm font-semibold text-semantic-neutral-100">
          Loading Infinite Queens...
        </div>
      </div>
    </div>

    <div class="flex h-full flex-col">
      <header class="flex-none px-4 pb-3 pt-4">
        <div
          class="rounded-[28px] border border-semantic-neutral-800 bg-surface-darkFirm px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-semantic-neutral-400">
                Queens
              </p>
              <h1 class="mt-1 text-2xl font-black text-white">Infinite Mode</h1>
            </div>
            <div class="flex flex-col items-end gap-2">
              <button
                class="rounded-2xl border border-semantic-neutral-700 bg-semantic-neutral-900 px-3 py-2 text-xs font-semibold text-semantic-neutral-100 transition-colors hover:bg-semantic-neutral-800"
                @click="restartGame"
              >
                Restart
              </button>
              <div
                class="rounded-2xl border border-semantic-neutral-800 bg-semantic-neutral-950 px-3 py-2 text-right"
              >
                <div class="text-[10px] uppercase tracking-[0.2em] text-semantic-neutral-500">
                  Queens
                </div>
                <div class="mt-1 text-sm font-semibold text-white">
                  {{ infiniteStore.queenCount }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <div
          class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-3 shadow-[0_28px_90px_rgba(0,0,0,0.32)]"
        >
          <div class="relative">
            <div class="px-8 py-8">
              <div class="flex flex-col gap-1.5">
                <div
                  v-for="(row, rowIndex) in infiniteStore.visibleCells"
                  :key="rowIndex"
                  class="grid gap-1.5"
                  :style="{
                    gridTemplateColumns: `repeat(${infiniteStore.viewport.width}, minmax(0, 1fr))`,
                  }"
                >
                  <button
                    v-for="cell in row"
                    :key="`${cell.worldRow}-${cell.worldCol}`"
                    class="group aspect-square rounded-xl border text-[11px] font-semibold transition-transform duration-150 active:scale-[0.98]"
                    :class="cellClass(cell)"
                    :style="cellStyle(cell)"
                    @click="infiniteStore.handleCellClick(cell.worldRow, cell.worldCol)"
                  >
                    <span
                      v-if="cell.playerMark === 'queen'"
                      class="flex h-full w-full items-center justify-center text-lg leading-none text-white drop-shadow"
                    >
                      Q
                    </span>
                    <span
                      v-else-if="cell.playerMark === 'flag'"
                      class="flex h-full w-full items-center justify-center text-lg leading-none text-semantic-warning-100"
                    >
                      ⚑
                    </span>
                    <span
                      v-else-if="cell.isSeamFill"
                      class="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.22em] text-white/45"
                    >
                      •
                    </span>
                  </button>
                </div>
              </div>
            </div>

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

        <div class="mt-3 grid grid-cols-2 gap-3">
          <div class="rounded-3xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-3">
            <div class="text-[10px] uppercase tracking-[0.22em] text-semantic-neutral-500">
              Tool
            </div>
            <div class="mt-2 flex gap-2">
              <button
                class="flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors"
                :class="
                  infiniteStore.activeTool === 'queen'
                    ? 'border-semantic-success-500 bg-semantic-success-900 text-semantic-success-100'
                    : 'border-semantic-neutral-700 bg-semantic-neutral-950 text-semantic-neutral-300'
                "
                @click="infiniteStore.setActiveTool('queen')"
              >
                Queen
              </button>
              <button
                class="flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors"
                :class="
                  infiniteStore.activeTool === 'flag'
                    ? 'border-semantic-warning-500 bg-semantic-warning-900 text-semantic-warning-100'
                    : 'border-semantic-neutral-700 bg-semantic-neutral-950 text-semantic-neutral-300'
                "
                @click="infiniteStore.setActiveTool('flag')"
              >
                Flag
              </button>
            </div>
          </div>

          <div class="rounded-3xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-3">
            <div class="text-[10px] uppercase tracking-[0.22em] text-semantic-neutral-500">
              Actions
            </div>
            <div class="mt-2 flex gap-2">
              <button
                class="flex-1 rounded-2xl border border-semantic-info-700 bg-semantic-info-950 px-3 py-2 text-sm font-semibold text-semantic-info-100 transition-colors hover:bg-semantic-info-900"
                @click="infiniteStore.autoFlagBoard()"
              >
                Auto-flag
              </button>
              <button
                class="flex-1 rounded-2xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition-colors hover:bg-semantic-neutral-900"
                @click="infiniteStore.clearMarks()"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import {
  useInfiniteQueensStore,
  type InfiniteQueensWorldCell,
} from '../stores/infiniteQueensStore';

const infiniteStore = useInfiniteQueensStore();

const palettes = [
  'bg-surface-overlaySoft border-edge-neutralMuted',
  'bg-surface-overlayMid border-edge-neutralMuted',
  'bg-surface-overlayDim border-edge-neutralMuted',
  'bg-surface-darkSoft border-edge-neutralMuted',
  'bg-surface-darkFirm border-edge-neutralMuted',
  'bg-feedback-successSubtle border-edge-neutralMuted',
  'bg-feedback-warningSubtle border-edge-neutralMuted',
];

function paletteClass(cell: InfiniteQueensWorldCell): string {
  if (cell.isBlackout) {
    return 'bg-semantic-neutral-950 border-edge-neutralMuted text-semantic-neutral-500';
  }
  const slot = cell.displayGroupSlot ?? 0;
  return palettes[Math.abs(slot) % palettes.length] ?? palettes[0]!;
}

function cellClass(cell: InfiniteQueensWorldCell): string[] {
  const key = `${cell.worldRow}-${cell.worldCol}`;
  const hasError = infiniteStore.errorCellKeys.has(key);
  return [
    'flex items-center justify-center overflow-hidden',
    paletteClass(cell),
    cell.isSeamFill ? 'ring-1 ring-white/10' : '',
    cell.playerMark === 'queen' ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]' : '',
    cell.playerMark === 'flag' ? 'shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)]' : '',
    hasError ? 'ring-2 ring-semantic-danger-300' : '',
  ];
}

function cellStyle(cell: InfiniteQueensWorldCell): Record<string, string> {
  if (cell.displayGroupId && !cell.isBlackout) {
    return {
      backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0))',
    };
  }
  if (cell.isSeamFill) {
    return {
      backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))',
    };
  }
  return {};
}

async function restartGame(): Promise<void> {
  await infiniteStore.startGame().catch(() => undefined);
}

onMounted(async () => {
  await infiniteStore.startGame().catch(() => undefined);
});
</script>
