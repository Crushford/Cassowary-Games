<template>
  <div class="inline-grid gap-1" :style="gridStyle" aria-hidden="true">
    <div
      v-for="cell in previewCells"
      :key="cell.key"
      class="w-7 h-7 rounded border border-gray-500 flex items-center justify-center text-xs"
      :class="cell.cellClass"
    >
      <span v-if="cell.hasFlag">🚧</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PatternCardDefinition } from '../../utils/incrementalPatternCards';

const props = defineProps<{
  card: PatternCardDefinition;
}>();

function isActiveCell(row: number, col: number): boolean {
  const found = props.card.cells.find((cell) => cell.row === row && cell.col === col);
  return found?.activeSquare === true;
}

function hasFlag(row: number, col: number): boolean {
  return props.card.outputFlags.some((flag) => flag.row === row && flag.col === col);
}

const gridStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${props.card.size}, minmax(0, 1fr))`,
  };
});

const previewCells = computed(() => {
  const cells: Array<{ key: string; cellClass: string; hasFlag: boolean }> = [];

  for (let row = 0; row < props.card.size; row++) {
    for (let col = 0; col < props.card.size; col++) {
      const isActive = isActiveCell(row, col);
      const flag = hasFlag(row, col);

      // Non-green cells are "other" by default.
      let cellClass = 'bg-gray-600';
      if (isActive) {
        cellClass = 'bg-emerald-600';
      }

      cells.push({
        key: `${row}-${col}`,
        cellClass,
        hasFlag: flag,
      });
    }
  }

  return cells;
});
</script>

<script lang="ts">
export default {
  name: 'PatternCardPreview',
};
</script>
