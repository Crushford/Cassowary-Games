<template>
  <div class="relative w-full max-w-full" :style="boardStyle">
    <div
      class="relative z-10 grid w-full overflow-hidden rounded-[26px] border border-queens-gridLine bg-semantic-neutral-950"
      :style="gridStyle"
      role="grid"
      :aria-label="ariaLabel"
      :aria-rowcount="board.rowCount"
      :aria-colcount="board.colCount"
      data-game-board="scrolling-queens"
    >
      <template v-for="(row, rowIndex) in board.cells" :key="rowIndex">
        <button
          v-for="cell in row"
          :key="`${cell.rowIndex}-${cell.colIndex}`"
          type="button"
          role="gridcell"
          class="relative min-h-0 min-w-0"
          :class="{ 'cursor-pointer': interactive }"
          :tabindex="interactive ? 0 : -1"
          :aria-rowindex="cell.rowIndex + 1"
          :aria-colindex="cell.colIndex + 1"
          @click="handleCellActivate(cell.rowIndex, cell.colIndex)"
          @keydown.enter.prevent="handleCellActivate(cell.rowIndex, cell.colIndex)"
          @keydown.space.prevent="handleCellActivate(cell.rowIndex, cell.colIndex)"
        >
          <QueensSquare
            :cell="cell"
            :row-index="cell.rowIndex"
            :col-index="cell.colIndex"
            :board-size="board.colCount"
            :store="null"
            :on-activate="
              interactive && board.onCellActivate
                ? () => board.onCellActivate?.(cell.rowIndex, cell.colIndex)
                : null
            "
            class="h-full w-full"
            :class="{ 'pointer-events-none': interactive }"
          />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { CSSProperties } from 'vue';
import type { PuzzleBoardCellViewModel } from './puzzleBoardTypes';

const QueensSquare = defineAsyncComponent(() => import('./QueensSquare.vue'));

export interface ScrollingPuzzleBoardAdapter {
  rowCount: number;
  colCount: number;
  cells: PuzzleBoardCellViewModel[][];
  onCellActivate?: ((row: number, col: number) => void) | null;
}

const props = withDefaults(
  defineProps<{
    board: ScrollingPuzzleBoardAdapter;
    interactive?: boolean;
    boardStyle?: CSSProperties;
    ariaLabel?: string;
  }>(),
  {
    interactive: false,
    boardStyle: () => ({}),
    ariaLabel: 'Scrolling Queens stitched puzzle grid',
  }
);

const gridStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(${props.board.colCount}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${props.board.rowCount}, minmax(0, 1fr))`,
  aspectRatio: `${props.board.colCount} / ${props.board.rowCount}`,
}));

function handleCellActivate(row: number, col: number): void {
  if (!props.interactive || !props.board.onCellActivate) return;
  props.board.onCellActivate(row, col);
}
</script>
