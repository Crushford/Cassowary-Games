<template>
  <PlayGrid
    class="w-full max-w-full aspect-square"
    :style="boardStyle"
    :store="store"
    :enable-touch="enableTouch"
    :role="role"
    :aria-label="ariaLabel"
    :aria-rowcount="store.gridSize"
    :aria-colcount="store.gridSize"
    :data-game-board="dataGameBoard"
    @swipe-start="$emit('swipe-start')"
    @swipe-end="$emit('swipe-end')"
  >
    <template #default="{ rowIndex, colIndex, store: playStore }">
      <div
        :role="interactive ? 'button' : undefined"
        :tabindex="interactive ? 0 : undefined"
        class="relative h-full w-full"
        :class="{ 'cursor-pointer': interactive }"
        @click="handleCellActivate(rowIndex as number, colIndex as number)"
        @keydown.enter.prevent="handleCellActivate(rowIndex as number, colIndex as number)"
        @keydown.space.prevent="handleCellActivate(rowIndex as number, colIndex as number)"
      >
        <QueensSquare
          :row-index="rowIndex as number"
          :col-index="colIndex as number"
          :store="playStore"
          class="h-full w-full"
          :class="{ 'pointer-events-none': interactive }"
        />

        <span
          v-if="
            showSelectedCell &&
            selectedCell?.row === (rowIndex as number) &&
            selectedCell?.col === (colIndex as number)
          "
          class="absolute bottom-2 right-2 z-30 rounded-full bg-semantic-info-500 px-2 py-0.5 text-[10px] font-semibold text-white"
        >
          {{ selectedCellLabel }}
        </span>

        <span
          v-if="changedCellSet.has(`${rowIndex as number}:${colIndex as number}`)"
          class="pointer-events-none absolute inset-0 z-20 ring-2 ring-semantic-info-300 ring-offset-2 ring-offset-semantic-neutral-950"
        />
      </div>
    </template>
  </PlayGrid>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { CSSProperties } from 'vue';
import { useQueensStore } from '../../stores/queensStore';

const PlayGrid = defineAsyncComponent(() => import('@/shared/components/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('./QueensSquare.vue'));

type QueensStoreInstance = ReturnType<typeof useQueensStore>;
type BoardCell = {
  row: number;
  col: number;
};

type QueensPuzzleBoardProps = {
  store: QueensStoreInstance;
  enableTouch?: boolean;
  interactive?: boolean;
  showSelectedCell?: boolean;
  selectedCell?: BoardCell | null;
  selectedCellLabel?: string;
  changedCells?: string[];
  boardStyle?: CSSProperties;
  ariaLabel?: string;
  role?: string;
  dataGameBoard?: string;
  onCellActivate?: ((row: number, col: number) => void) | null;
};

const props = withDefaults(defineProps<QueensPuzzleBoardProps>(), {
  enableTouch: false,
  interactive: false,
  showSelectedCell: false,
  selectedCell: null,
  selectedCellLabel: 'selected',
  changedCells: () => [],
  boardStyle: () => ({}),
  ariaLabel: 'Queens puzzle grid',
  role: undefined,
  dataGameBoard: undefined,
  onCellActivate: null,
});

defineEmits<{
  (e: 'swipe-start'): void;
  (e: 'swipe-end'): void;
}>();

const changedCellSet = computed(() => new Set(props.changedCells));

function handleCellActivate(row: number, col: number): void {
  if (!props.interactive || !props.onCellActivate) {
    return;
  }

  props.onCellActivate(row, col);
}
</script>
