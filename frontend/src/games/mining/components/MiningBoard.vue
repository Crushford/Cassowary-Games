<template>
  <div class="grid grid-cols-5 gap-2">
    <MiningSquare
      v-for="stack in stacks"
      :key="`${stack.row}-${stack.col}`"
      :tile="topTileForStack(stack)"
      :floating-message="floatingMessageForStack(stack)"
      :floating-tone="floatingToneForStack(stack)"
      @dig="$emit('dig', { row: stack.row, col: stack.col })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { FloatingResult, GroundStackState, PositionRef } from '../game/types';
import MiningSquare from './MiningSquare.vue';

const props = defineProps<{
  rows: GroundStackState[][];
  topTileForStack: (stack: GroundStackState) => GroundStackState['tiles'][number] | null;
  floatingResult?: FloatingResult | null;
}>();

defineEmits<{
  dig: [position: PositionRef];
}>();

const stacks = computed(() => props.rows.flat());

function floatingMessageForStack(stack: GroundStackState): string | null {
  if (!props.floatingResult) {
    return null;
  }

  return props.floatingResult.row === stack.row && props.floatingResult.col === stack.col
    ? props.floatingResult.message
    : null;
}

function floatingToneForStack(stack: GroundStackState): FloatingResult['tone'] | null {
  if (!props.floatingResult) {
    return null;
  }

  return props.floatingResult.row === stack.row && props.floatingResult.col === stack.col
    ? props.floatingResult.tone
    : null;
}
</script>
