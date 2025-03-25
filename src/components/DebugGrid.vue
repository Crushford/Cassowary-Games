<template>
  <div
    class="grid gap-1 max-w-[200px] mx-auto"
    :style="{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }"
  >
    <template v-for="(row, rowIndex) in grid" :key="rowIndex">
      <div
        v-for="(square, colIndex) in row"
        :key="`${rowIndex}-${colIndex}`"
        class="aspect-square w-full rounded border border-surface flex items-center justify-center"
        :class="{
          'bg-primary': square.state === 'queen' && !square.groupColor,
          'bg-secondary': square.state === 'flag',
          'bg-surface': square.state === 'empty' && !square.groupColor,
          [`bg-group-${square.groupColor}-900`]: square.state === 'queen' && square.groupColor,
          [`bg-group-${square.groupColor}-700`]: square.state !== 'queen' && square.groupColor,
        }"
      >
        <span class="text-xs font-medium">{{ square.state }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { GridSquare } from './GameGrid.vue';

interface Props {
  grid: GridSquare[][];
}

defineProps<Props>();
</script>
