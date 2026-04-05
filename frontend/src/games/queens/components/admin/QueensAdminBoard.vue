<template>
  <div
    v-if="store.board"
    class="rounded-[28px] border border-semantic-neutral-700 bg-surface-overlayMid p-5 shadow-2xl"
  >
    <PlayGrid
      class="w-full h-full aspect-square max-w-full"
      :store="queensStore"
      :enable-touch="false"
      role="grid"
      aria-label="Queens admin puzzle grid"
      :aria-rowcount="queensStore.gridSize"
      :aria-colcount="queensStore.gridSize"
      data-game-board="queens-admin"
    >
      <template #default="{ rowIndex, colIndex, store: playStore }">
        <div
          role="button"
          tabindex="0"
          class="relative h-full w-full cursor-pointer"
          @click="store.applyManualToolToCell(rowIndex as number, colIndex as number)"
          @keydown.enter.prevent="
            store.applyManualToolToCell(rowIndex as number, colIndex as number)
          "
          @keydown.space.prevent="
            store.applyManualToolToCell(rowIndex as number, colIndex as number)
          "
        >
          <QueensSquare
            :row-index="rowIndex as number"
            :col-index="colIndex as number"
            :store="playStore"
            class="pointer-events-none h-full w-full"
          />

          <span
            v-if="isSelected(rowIndex as number, colIndex as number)"
            class="absolute bottom-2 right-2 z-30 rounded-full bg-semantic-info-500 px-2 py-0.5 text-[10px] font-semibold text-white"
          >
            selected
          </span>

          <span
            v-if="isChanged(rowIndex as number, colIndex as number)"
            class="pointer-events-none absolute inset-0 z-20 ring-2 ring-semantic-info-300 ring-offset-2 ring-offset-semantic-neutral-950"
          />
        </div>
      </template>
    </PlayGrid>
  </div>

  <div
    v-else
    class="flex min-h-[520px] items-center justify-center rounded-[28px] border border-dashed border-semantic-neutral-700 bg-surface-overlaySoft p-12 text-center text-semantic-neutral-300"
  >
    <div class="max-w-sm space-y-3">
      <p class="text-lg font-semibold text-white">No board in the current admin session</p>
      <p>Create a board from the left panel to start painting colors, flags, and queens.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue';
import type { GridSquare, MarkType } from '../../types/types';
import { useQueensStore } from '../../stores/queensStore';
import { useQueensAdminStore } from '../../stores/queensAdminStore';
import { assignRegionPaletteColors } from '../../utils/regionDisplay';

const PlayGrid = defineAsyncComponent(() => import('@/shared/components/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../queens/QueensSquare.vue'));

const store = useQueensAdminStore();
const queensStore = useQueensStore();
const props = withDefaults(
  defineProps<{
    showSolutionQueens?: boolean;
  }>(),
  {
    showSolutionQueens: true,
  }
);

function toGridSquare(): GridSquare[][] {
  if (!store.board) return [];

  const rawGrid = store.board.cells.map((row) =>
    row.map((cell) => ({
      position: { row: cell.row, col: cell.col },
      groupColor: cell.groupColor ?? undefined,
      isSolutionQueen: props.showSolutionQueens ? cell.isSolutionQueen : false,
    }))
  );

  return assignRegionPaletteColors(rawGrid);
}

function toPlayerMarks(): MarkType[][] {
  if (!store.board) return [];

  return store.board.cells.map((row) =>
    row.map((cell) => {
      if (cell.markType === 'QUEEN') return props.showSolutionQueens ? 'queen' : null;
      if (cell.markType === 'FLAG') return 'flag';
      return null;
    })
  );
}

watch(
  () => [store.board, props.showSolutionQueens],
  () => {
    if (!store.board) return;

    queensStore.grid = toGridSquare();
    queensStore.gridSize = store.board.size;
    queensStore.playerMarks = toPlayerMarks();
    queensStore.isTutorialMode = false;
    queensStore.showErrorFeedback = false;
    queensStore.errorFeedbackSquare = null;
    queensStore.errorSquares = new Set();
    queensStore.errorMessage = null;
  },
  { immediate: true, deep: true }
);

function isSelected(row: number, col: number): boolean {
  return store.selectedCell?.row === row && store.selectedCell?.col === col;
}

function isChanged(row: number, col: number): boolean {
  return store.highlightedChangedCells.includes(`${row}:${col}`);
}
</script>
