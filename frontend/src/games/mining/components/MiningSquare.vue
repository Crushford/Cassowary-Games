<template>
  <button
    type="button"
    class="relative aspect-square w-full rounded-2xl border p-2 text-center transition-all duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0"
    :class="[
      squareClass,
      {
        'auto-flag-tint-magpie': autoFlagAnimating,
        'gold-found-tint': goldFoundAnimating,
      },
    ]"
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
      <span :class="flagClass">🚧</span>
      <span v-if="showAutoFlagRipple" class="auto-flag-ripple auto-flag-ripple-magpie" />
    </div>

    <template v-if="tileKind === 'gold'">
      <div class="relative flex h-full flex-col items-center justify-center overflow-hidden">
        <span v-if="goldFoundAnimating" class="gold-found-ripple gold-found-ripple-inner" />
        <span v-if="goldFoundAnimating" class="gold-found-ripple gold-found-ripple-outer" />
        <span v-if="goldFoundAnimating" class="gold-found-burst" />
        <div
          class="relative z-10 text-[9px] font-semibold uppercase leading-none tracking-[0.14em] text-white/80"
          :class="{ 'gold-found-label': goldFoundAnimating }"
        >
          Gold
        </div>
        <div
          class="relative z-10 mt-1 text-xl font-black leading-none text-white"
          :class="{ 'gold-found-value': goldFoundAnimating }"
        >
          {{ props.rewardLabel }}
        </div>
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
  autoFlagAnimating?: boolean;
  goldFoundAnimating?: boolean;
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
  if (props.tileKind === 'empty') {
    return 'border-app-border bg-app-surface opacity-80';
  }

  if (props.showRegion) {
    return 'shadow-lg shadow-semantic-warning-950/15';
  }

  return 'border-semantic-warning-700 bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800 shadow-lg shadow-semantic-warning-950/15';
});

const squareStyle = computed(() => {
  if (!props.showRegion) {
    return undefined;
  }

  return getRegionColorStyle(props.regionId ?? null, false);
});

const showAutoFlagRipple = computed(() => props.tileKind === 'hidden' && props.autoFlagAnimating);
const goldFoundAnimating = computed(() => props.tileKind === 'gold' && props.goldFoundAnimating);

const flagClass = computed(() => [
  'text-3xl',
  '[text-shadow:0_0_10px_rgba(15,23,42,0.5)]',
  {
    'auto-flag-pop auto-flag-magpie': props.autoFlagAnimating,
  },
]);
</script>

<style scoped>
.auto-flag-pop {
  animation: auto-flag-pop 220ms ease-out;
}

.auto-flag-magpie {
  filter: drop-shadow(0 0 9px rgba(253, 224, 71, 0.65));
}

.auto-flag-ripple {
  position: absolute;
  width: 62%;
  height: 62%;
  border-radius: 9999px;
  border: 2px solid transparent;
  animation: auto-flag-ripple 320ms ease-out;
}

.auto-flag-ripple-magpie {
  border-color: rgba(253, 224, 71, 0.65);
}

.auto-flag-tint-magpie {
  animation: auto-flag-tint-magpie 180ms ease-out;
}

.gold-found-tint {
  animation: gold-found-tint 280ms ease-out;
}

.gold-found-value {
  animation: gold-found-pop 260ms ease-out;
  text-shadow: 0 0 16px rgba(255, 244, 180, 0.5);
}

.gold-found-label {
  animation: gold-found-rise 220ms ease-out;
}

.gold-found-burst {
  position: absolute;
  inset: 18%;
  border-radius: 9999px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 58%),
    radial-gradient(circle, rgba(250, 204, 21, 0.5) 12%, rgba(250, 204, 21, 0) 68%);
  animation: gold-found-burst 360ms ease-out;
}

.gold-found-ripple {
  position: absolute;
  border-radius: 9999px;
  border: 2px solid rgba(255, 244, 180, 0.6);
}

.gold-found-ripple-inner {
  inset: 20%;
  animation: gold-found-ripple 320ms ease-out;
}

.gold-found-ripple-outer {
  inset: 8%;
  animation: gold-found-ripple 420ms ease-out 40ms;
}

@keyframes auto-flag-pop {
  0% {
    transform: scale(0.72);
    opacity: 0.7;
  }

  65% {
    transform: scale(1.15);
    opacity: 1;
  }

  100% {
    transform: scale(1);
  }
}

@keyframes auto-flag-ripple {
  0% {
    transform: scale(0.45);
    opacity: 0.45;
  }

  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}

@keyframes auto-flag-tint-magpie {
  0% {
    box-shadow: inset 0 0 0 9999px rgba(253, 224, 71, 0.12);
  }

  100% {
    box-shadow: inset 0 0 0 9999px rgba(253, 224, 71, 0);
  }
}

@keyframes gold-found-pop {
  0% {
    transform: scale(0.78);
    opacity: 0.8;
  }

  55% {
    transform: scale(1.14);
    opacity: 1;
  }

  100% {
    transform: scale(1);
  }
}

@keyframes gold-found-rise {
  0% {
    transform: translateY(4px);
    opacity: 0.65;
  }

  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes gold-found-ripple {
  0% {
    transform: scale(0.6);
    opacity: 0.45;
  }

  100% {
    transform: scale(1.12);
    opacity: 0;
  }
}

@keyframes gold-found-burst {
  0% {
    transform: scale(0.5);
    opacity: 0.22;
  }

  50% {
    opacity: 0.42;
  }

  100% {
    transform: scale(1.18);
    opacity: 0;
  }
}

@keyframes gold-found-tint {
  0% {
    box-shadow:
      inset 0 0 0 9999px rgba(255, 244, 180, 0.18),
      0 0 0 rgba(250, 204, 21, 0);
  }

  100% {
    box-shadow:
      inset 0 0 0 9999px rgba(255, 244, 180, 0),
      0 0 24px rgba(250, 204, 21, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auto-flag-pop,
  .auto-flag-ripple,
  .auto-flag-tint-magpie,
  .gold-found-tint,
  .gold-found-value,
  .gold-found-label,
  .gold-found-burst,
  .gold-found-ripple {
    animation: none;
  }
}
</style>
