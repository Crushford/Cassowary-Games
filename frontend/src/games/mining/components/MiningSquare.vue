<template>
  <button
    type="button"
    class="relative aspect-square w-full rounded-2xl border p-2 text-center transition-all duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0"
    :class="squareClass"
    :style="squareStyle"
    :data-row="row"
    :data-col="col"
    :aria-disabled="disabled ? 'true' : 'false'"
    @click="handleTap"
  >
    <div
      v-if="flagged && tileKind === 'hidden'"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <span class="text-3xl [text-shadow:0_0_10px_rgba(15,23,42,0.5)]">🚧</span>
    </div>

    <template v-if="tileKind === 'gold'">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Gold</div>
        <div class="mt-2 text-3xl font-black text-white">{{ props.rewardLabel }}</div>
      </div>
    </template>

    <template v-else-if="tileKind === 'empty'">
      <div class="flex h-full flex-col items-center justify-center">
        <div
          class="text-[9px] font-semibold uppercase leading-none tracking-[0.14em] text-app-textMuted"
        >
          Empty
        </div>
        <div class="mt-1 text-xl font-black leading-none text-app-textMuted">0</div>
      </div>
    </template>

    <template v-else-if="flagged" />

    <template v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { MiningFlagType } from '../game/types';
import { getRegionColorStyle } from '../game/utils/regionColor';

const props = defineProps<{
  row: number;
  col: number;
  tileKind: 'hidden' | 'gold' | 'empty';
  flagged: MiningFlagType | null;
  rewardLabel: string;
  regionId?: string | null;
  showRegion?: boolean;
  canExcavateAllHidden?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  dig: [];
  'toggle-flag': [];
}>();

function handleTap() {
  console.log('[mining][square-click]', {
    row: props.row,
    col: props.col,
    tileKind: props.tileKind,
    flagged: props.flagged,
    disabled: Boolean(props.disabled),
    canExcavateAllHidden: Boolean(props.canExcavateAllHidden),
  });

  if (props.disabled || props.tileKind !== 'hidden') {
    console.log('[mining][square-click] blocked before action', {
      row: props.row,
      col: props.col,
      reason: props.disabled ? 'square-disabled' : 'tile-not-hidden',
    });
    return;
  }

  if (props.canExcavateAllHidden) {
    console.log('[mining][square-click] emitting dig because all gold is already found', {
      row: props.row,
      col: props.col,
    });
    emit('dig');
    return;
  }

  if (props.flagged === 'gold-here') {
    console.log('[mining][square-click] emitting dig because gold-here flag is present', {
      row: props.row,
      col: props.col,
    });
    emit('dig');
    return;
  }

  console.log('[mining][square-click] emitting toggle-flag to place gold-here marker', {
    row: props.row,
    col: props.col,
    overridingNotGold: props.flagged === 'not-gold',
  });
  emit('toggle-flag');
}

const squareClass = computed(() => {
  if (props.tileKind === 'gold') {
    return 'border-semantic-warning-300 bg-gradient-to-br from-semantic-warning-600 to-semantic-warning-900 shadow-lg shadow-semantic-warning-950/20';
  }

  if (props.tileKind === 'empty') {
    return 'border-app-border bg-app-surface opacity-80';
  }

  if (props.showRegion) {
    return 'shadow-lg shadow-semantic-warning-950/15';
  }

  return 'border-semantic-warning-700 bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800 shadow-lg shadow-semantic-warning-950/15';
});

const squareStyle = computed(() => {
  if (!props.showRegion || props.tileKind === 'gold') {
    return undefined;
  }

  return getRegionColorStyle(props.regionId ?? null, false);
});
</script>
