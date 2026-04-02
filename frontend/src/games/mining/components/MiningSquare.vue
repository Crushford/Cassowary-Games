<template>
  <button
    type="button"
    class="relative aspect-square h-full w-full rounded-2xl border p-2 text-center transition-colors duration-150 touch-manipulation disabled:cursor-not-allowed"
    :class="[
      squareClass,
      {
        'auto-flag-tint-magpie': autoFlagAnimating,
        'gold-found-tint': goldFoundAnimating,
        'empty-found-tint': emptyFoundAnimating,
      },
    ]"
    :data-row="row"
    :data-col="col"
    :aria-disabled="disabled ? 'true' : 'false'"
    @click="handleTap"
    @pointerdown="startLongPress"
    @pointerup="clearLongPress"
    @pointerleave="clearLongPress"
    @pointercancel="clearLongPress"
    @contextmenu.prevent
  >
    <div
      v-if="flagged && tileKind === 'hidden'"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <span class="text-3xl [text-shadow:0_0_10px_rgba(15,23,42,0.5)]" :class="flagClass">🚧</span>
      <span v-if="showAutoFlagRipple" class="auto-flag-ripple auto-flag-ripple-magpie" />
    </div>

    <template v-if="tileKind === 'gold'">
      <div class="relative flex h-full flex-col items-center justify-center overflow-hidden">
        <span v-if="goldFoundAnimating" class="gold-found-ripple gold-found-ripple-inner" />
        <span v-if="goldFoundAnimating" class="gold-found-ripple gold-found-ripple-outer" />
        <span v-if="goldFoundAnimating" class="gold-found-burst" />
        <span v-if="goldFoundAnimating" class="gold-found-spark gold-found-spark-left">✨</span>
        <span v-if="goldFoundAnimating" class="gold-found-spark gold-found-spark-right">✨</span>
        <div
          class="relative z-10 text-3xl leading-none drop-shadow-[0_0_14px_rgba(255,215,64,0.45)] sm:text-4xl"
          :class="{ 'gold-found-value': goldFoundAnimating }"
        >
          {{ GOLD_EMOJI }}
        </div>
      </div>
    </template>

    <template v-else-if="tileKind === 'empty'">
      <div class="relative flex h-full flex-col items-center justify-center overflow-hidden">
        <span v-if="emptyFoundAnimating" class="empty-found-puff empty-found-puff-left" />
        <span v-if="emptyFoundAnimating" class="empty-found-puff empty-found-puff-right" />
        <div
          class="text-lg font-black leading-none text-app-text sm:text-xl"
          :class="{ 'empty-found-value': emptyFoundAnimating }"
        >
          0
        </div>
      </div>
    </template>

    <template v-else-if="flagged" />

    <template v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { MiningFlagType } from '../game/types';

const props = defineProps<{
  row: number;
  col: number;
  tileKind: 'hidden' | 'gold' | 'empty';
  flagged: MiningFlagType | null;
  rewardLabel: string;
  regionColorClass?: string | null;
  showRegion?: boolean;
  disabled?: boolean;
  autoFlagAnimating?: boolean;
  goldFoundAnimating?: boolean;
  emptyFoundAnimating?: boolean;
}>();

const emit = defineEmits<{
  dig: [];
  'toggle-flag': [];
}>();

const GOLD_EMOJI = '💰';

function handleTap() {
  console.log('[mining][square-click]', {
    row: props.row,
    col: props.col,
    tileKind: props.tileKind,
    flagged: props.flagged,
    disabled: Boolean(props.disabled),
  });

  if (props.disabled || props.tileKind !== 'hidden') {
    console.log('[mining][square-click] blocked before action', {
      row: props.row,
      col: props.col,
      reason: props.disabled ? 'square-disabled' : 'tile-not-hidden',
    });
    return;
  }

  if (didLongPress) {
    didLongPress = false;
    return;
  }

  console.log('[mining][square-click] emitting toggle-flag to toggle gold-here marker', {
    row: props.row,
    col: props.col,
    overridingNotGold: props.flagged === 'not-gold',
    wasFlagged: props.flagged === 'gold-here',
  });
  emit('toggle-flag');
}

const LONG_PRESS_MS = 300;

let longPressTimeout: number | null = null;
let didLongPress = false;

function startLongPress() {
  if (props.disabled || props.tileKind !== 'hidden') {
    return;
  }

  clearLongPress();
  didLongPress = false;
  longPressTimeout = window.setTimeout(() => {
    didLongPress = true;
    console.log('[mining][square-click] emitting dig because long press threshold was met', {
      row: props.row,
      col: props.col,
    });
    emit('dig');
  }, LONG_PRESS_MS);
}

function clearLongPress() {
  if (longPressTimeout !== null) {
    window.clearTimeout(longPressTimeout);
    longPressTimeout = null;
  }
}

const squareClass = computed(() => {
  if (props.showRegion) {
    return [
      props.regionColorClass ?? 'bg-app-surface',
      'border-app-border',
      'shadow-lg shadow-semantic-warning-950/15',
    ];
  }

  if (props.tileKind === 'empty') {
    return 'border-app-border bg-app-surface';
  }

  return 'border-semantic-warning-700 bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800 shadow-lg shadow-semantic-warning-950/15';
});

const showAutoFlagRipple = computed(() => props.tileKind === 'hidden' && props.autoFlagAnimating);
const goldFoundAnimating = computed(() => props.tileKind === 'gold' && props.goldFoundAnimating);
const emptyFoundAnimating = computed(() => props.tileKind === 'empty' && props.emptyFoundAnimating);

const flagClass = computed(() => [
  'text-white',
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
  animation: gold-found-pop 460ms cubic-bezier(0.18, 0.89, 0.32, 1.24);
  text-shadow: 0 0 16px rgba(255, 244, 180, 0.5);
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

.gold-found-spark {
  position: absolute;
  z-index: 5;
  font-size: 1rem;
  line-height: 1;
  filter: drop-shadow(0 0 8px rgba(255, 238, 170, 0.65));
  animation: gold-found-spark 520ms ease-out;
}

.gold-found-spark-left {
  left: 18%;
  top: 22%;
}

.gold-found-spark-right {
  right: 18%;
  bottom: 20%;
  animation-delay: 50ms;
}

.empty-found-tint {
  animation: empty-found-tint 260ms ease-out;
}

.empty-found-value {
  animation: empty-found-drop 340ms ease-out;
}

.empty-found-puff {
  position: absolute;
  width: 28%;
  height: 28%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0) 70%);
  animation: empty-found-puff 360ms ease-out;
}

.empty-found-puff-left {
  left: 18%;
  bottom: 22%;
}

.empty-found-puff-right {
  right: 18%;
  bottom: 16%;
  animation-delay: 30ms;
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
    transform: translateY(5px) scale(0.72) rotate(-10deg);
    opacity: 0.55;
  }

  42% {
    transform: translateY(-8px) scale(1.18) rotate(8deg);
    opacity: 1;
  }

  72% {
    transform: translateY(1px) scale(0.96) rotate(-4deg);
  }

  100% {
    transform: translateY(0) scale(1) rotate(0deg);
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

@keyframes gold-found-spark {
  0% {
    transform: translateY(6px) scale(0.4) rotate(-18deg);
    opacity: 0;
  }

  35% {
    opacity: 1;
  }

  100% {
    transform: translateY(-12px) scale(1.2) rotate(14deg);
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

@keyframes empty-found-drop {
  0% {
    transform: translateY(-3px) scale(1.05);
    opacity: 0.8;
  }

  45% {
    transform: translateY(4px) scale(0.9);
    opacity: 1;
  }

  72% {
    transform: translateY(-1px) scale(1.02);
  }

  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes empty-found-puff {
  0% {
    transform: scale(0.45);
    opacity: 0;
  }

  35% {
    opacity: 0.45;
  }

  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@keyframes empty-found-tint {
  0% {
    box-shadow: inset 0 0 0 9999px rgba(148, 163, 184, 0.12);
  }

  100% {
    box-shadow: inset 0 0 0 9999px rgba(148, 163, 184, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auto-flag-pop,
  .auto-flag-ripple,
  .auto-flag-tint-magpie,
  .gold-found-tint,
  .gold-found-value,
  .gold-found-burst,
  .gold-found-ripple,
  .gold-found-spark,
  .empty-found-tint,
  .empty-found-value,
  .empty-found-puff {
    animation: none;
  }
}
</style>
