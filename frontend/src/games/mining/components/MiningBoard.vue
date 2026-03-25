<template>
  <div class="grid grid-cols-5 gap-2">
    <MiningSquare
      v-for="cell in cells"
      :key="`${cell.row}-${cell.col}`"
      :tile-kind="cell.tileKind"
      :flagged="cell.flagged"
      :region-id="cell.regionId"
      :depth-level="depthLevel"
      :disabled="disabled || cell.tileKind !== 'hidden'"
      @dig="$emit('dig', { row: cell.row, col: cell.col })"
      @toggle-flag="$emit('toggle-flag', { row: cell.row, col: cell.col })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { MiningDepthLevel, PositionRef } from '../game/types';
import MiningSquare from './MiningSquare.vue';

const props = defineProps<{
  truthGold: boolean[][];
  truthQuartz: boolean[][];
  regionIds: string[][];
  revealed: boolean[][];
  flagged: boolean[][];
  depthLevel: MiningDepthLevel;
  disabled?: boolean;
}>();

defineEmits<{
  dig: [position: PositionRef];
  'toggle-flag': [position: PositionRef];
}>();

const cells = computed(() => {
  const values: Array<{
    row: number;
    col: number;
    tileKind: 'hidden' | 'gold' | 'quartz' | 'rock';
    flagged: boolean;
    regionId: string | null;
  }> = [];

  for (let row = 0; row < props.truthGold.length; row += 1) {
    for (let col = 0; col < props.truthGold[row].length; col += 1) {
      let tileKind: 'hidden' | 'gold' | 'quartz' | 'rock' = 'hidden';

      if (props.revealed[row][col]) {
        if (props.truthGold[row][col]) {
          tileKind = 'gold';
        } else if (props.depthLevel === 2 && props.truthQuartz[row][col]) {
          tileKind = 'quartz';
        } else {
          tileKind = 'rock';
        }
      }

      values.push({
        row,
        col,
        tileKind,
        flagged: props.flagged[row][col],
        regionId: props.regionIds[row][col] ?? null,
      });
    }
  }

  return values;
});
</script>
