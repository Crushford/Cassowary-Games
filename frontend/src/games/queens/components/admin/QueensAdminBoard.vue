<template>
  <div
    v-if="store.board"
    class="grid gap-2 rounded-[28px] border border-semantic-neutral-700 bg-surface-overlayMid p-5 shadow-2xl"
    :style="{
      gridTemplateColumns: `repeat(${store.board.size}, minmax(0, 1fr))`,
    }"
  >
    <button
      v-for="cell in flatCells"
      :key="`${cell.row}-${cell.col}`"
      type="button"
      class="relative aspect-square min-h-[76px] rounded-2xl border text-left transition duration-150"
      :class="getCellClasses(cell)"
      @click="store.applyManualToolToCell(cell.row, cell.col)"
    >
      <span class="absolute left-2 top-2 text-[11px] font-semibold text-white/70">
        {{ cell.row }},{{ cell.col }}
      </span>
      <span class="absolute inset-0 flex items-center justify-center text-2xl">
        <span v-if="cell.markType === 'QUEEN'">👑</span>
        <span v-else-if="cell.markType === 'FLAG'">⚑</span>
        <span v-else-if="cell.markType === 'INVALID'">×</span>
      </span>
      <span
        v-if="isSelected(cell.row, cell.col)"
        class="absolute bottom-2 right-2 rounded-full bg-semantic-info-500 px-2 py-0.5 text-[10px] font-semibold text-white"
      >
        inspect
      </span>
    </button>
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
import { computed } from 'vue';
import type { QueensAdminCell } from '../../admin/types';
import { useQueensAdminStore } from '../../stores/queensAdminStore';

const store = useQueensAdminStore();

const flatCells = computed(() => store.board?.cells.flat() ?? []);

function isSelected(row: number, col: number): boolean {
  return store.selectedCell?.row === row && store.selectedCell?.col === col;
}

function getCellClasses(cell: QueensAdminCell): string[] {
  const classes = ['border-semantic-neutral-700', 'bg-semantic-neutral-800', 'hover:scale-[1.01]'];

  if (cell.groupColor) {
    classes.push(`bg-group-${cell.groupColor}-base`);
  }

  if (store.highlightedChangedCells.includes(`${cell.row}:${cell.col}`)) {
    classes.push(
      'ring-2',
      'ring-semantic-info-300',
      'ring-offset-2',
      'ring-offset-semantic-neutral-950'
    );
  }

  if (isSelected(cell.row, cell.col)) {
    classes.push('border-semantic-warning-400', 'ring-1', 'ring-semantic-warning-300');
  }

  return classes;
}
</script>
