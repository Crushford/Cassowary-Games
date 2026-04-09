<template>
  <div class="inline-grid gap-1" :style="gridStyle" aria-hidden="true">
    <div
      v-for="cell in previewCells"
      :key="cell.key"
      class="flex items-center justify-center rounded border border-semantic-neutral-500 text-xs"
      :class="[cell.cellClass, cellSizeClass]"
    >
      <span v-if="cell.hasFlag">🚧</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PatternCell {
  row: number;
  col: number;
  activeSquare?: boolean;
}

interface PatternFlag {
  row: number;
  col: number;
}

const props = withDefaults(
  defineProps<{
    size: number;
    cells: PatternCell[];
    outputFlags: PatternFlag[];
    cellSizeClass?: string;
  }>(),
  {
    cellSizeClass: 'h-7 w-7',
  }
);

function isActiveCell(row: number, col: number): boolean {
  const found = props.cells.find((cell) => cell.row === row && cell.col === col);
  return found?.activeSquare === true;
}

function hasFlag(row: number, col: number): boolean {
  return props.outputFlags.some((flag) => flag.row === row && flag.col === col);
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.size}, minmax(0, 1fr))`,
}));

const previewCells = computed(() => {
  const cells: Array<{ key: string; cellClass: string; hasFlag: boolean }> = [];

  for (let row = 0; row < props.size; row++) {
    for (let col = 0; col < props.size; col++) {
      const active = isActiveCell(row, col);
      const flag = hasFlag(row, col);
      cells.push({
        key: `${row}-${col}`,
        cellClass: active ? 'bg-semantic-success-600' : 'bg-semantic-neutral-600',
        hasFlag: flag,
      });
    }
  }

  return cells;
});
</script>
