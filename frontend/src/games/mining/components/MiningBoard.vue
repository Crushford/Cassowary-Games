<template>
  <div class="grid grid-cols-5 gap-2">
    <MiningSquare
      v-for="cell in cells"
      :key="`${cell.row}-${cell.col}`"
      :row="cell.row"
      :col="cell.col"
      :tile-kind="cell.tileKind"
      :flagged="cell.flagged"
      :reward-label="rewardLabel"
      :region-id="cell.regionId"
      :show-region="showRegions"
      :disabled="disabled || cell.tileKind !== 'hidden'"
      :can-excavate-all-hidden="canExcavateAllHidden"
      @dig="handleDig(cell.row, cell.col)"
      @toggle-flag="handleToggleFlag(cell.row, cell.col)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { MiningFlagType, PositionRef } from '../game/types';
import MiningSquare from './MiningSquare.vue';

const props = defineProps<{
  truthGold: boolean[][];
  regionIds: string[][];
  revealed: boolean[][];
  flagged: Array<Array<MiningFlagType | null>>;
  rewardLabel: string;
  showRegions: boolean;
  canExcavateAllHidden: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  dig: [position: PositionRef];
  'toggle-flag': [position: PositionRef];
}>();

function handleDig(row: number, col: number) {
  console.log('[mining][board] forwarding dig request', {
    row,
    col,
    boardDisabled: Boolean(props.disabled),
    canExcavateAllHidden: props.canExcavateAllHidden,
    flagAtCell: props.flagged[row]?.[col] ?? null,
    revealed: props.revealed[row]?.[col] ?? false,
  });
  emit('dig', { row, col });
}

function handleToggleFlag(row: number, col: number) {
  console.log('[mining][board] forwarding toggle-flag request', {
    row,
    col,
    boardDisabled: Boolean(props.disabled),
    flagAtCell: props.flagged[row]?.[col] ?? null,
    revealed: props.revealed[row]?.[col] ?? false,
  });
  emit('toggle-flag', { row, col });
}

const cells = computed(() => {
  const values: Array<{
    row: number;
    col: number;
    tileKind: 'hidden' | 'gold' | 'empty';
    flagged: MiningFlagType | null;
    regionId: string | null;
  }> = [];

  for (let row = 0; row < props.truthGold.length; row += 1) {
    for (let col = 0; col < props.truthGold[row].length; col += 1) {
      let tileKind: 'hidden' | 'gold' | 'empty' = 'hidden';

      if (props.revealed[row][col]) {
        tileKind = props.truthGold[row][col] ? 'gold' : 'empty';
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
