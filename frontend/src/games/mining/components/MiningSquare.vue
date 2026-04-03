<template>
  <button
    type="button"
    class="relative aspect-square h-full w-full overflow-hidden rounded-2xl border p-2 text-center transition-colors duration-150 touch-manipulation disabled:cursor-not-allowed"
    :class="squareClass"
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
    <AnimatePresence>
      <m.span
        v-if="showAutoFlagFlash"
        :key="`auto-flag-flash-${autoFlagEventId}`"
        class="auto-flag-flash pointer-events-none absolute inset-0 rounded-[inherit]"
        :variants="autoFlagRippleVariants"
        initial="hidden"
        animate="visible"
        exit="exit"
        :transition="{ delay: autoFlagDelaySeconds }"
      />
    </AnimatePresence>

    <div
      v-if="flagged && tileKind === 'hidden'"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <m.span
        :key="`auto-flag-icon-${autoFlagEventId}`"
        class="text-shadow-mining-flag text-3xl text-white"
        :class="{
          'drop-shadow-mining-flag-glow': autoFlagAnimating && !prefersReducedMotion,
        }"
        :variants="autoFlagIconVariants"
        :initial="autoFlagAnimating ? 'hidden' : 'visible'"
        animate="visible"
        :transition="{ delay: autoFlagDelaySeconds }"
        >🚧</m.span
      >
      <AnimatePresence>
        <m.span
          v-if="showAutoFlagRipple"
          :key="`auto-flag-ripple-${autoFlagEventId}`"
          class="auto-flag-ripple-ring pointer-events-none absolute h-[62%] w-[62%] rounded-full border-2"
          :variants="autoFlagRippleVariants"
          initial="hidden"
          animate="visible"
          exit="exit"
          :transition="{ delay: autoFlagDelaySeconds }"
        />
      </AnimatePresence>
    </div>

    <template v-if="tileKind === 'gold'">
      <div class="relative flex h-full items-center justify-center overflow-hidden">
        <AnimatePresence>
          <m.span
            v-if="showGoldBurst"
            :key="`gold-burst-${goldFoundEventId}`"
            class="pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_58%),radial-gradient(circle,rgba(250,204,21,0.5)_12%,rgba(250,204,21,0)_68%)]"
            :variants="goldBurstVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
          />
        </AnimatePresence>
        <AnimatePresence>
          <m.span
            v-if="showGoldBurst"
            :key="`gold-ripple-inner-${goldFoundEventId}`"
            class="gold-ripple-inner pointer-events-none absolute inset-[20%] rounded-full border-2"
            :variants="goldBurstVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
          />
        </AnimatePresence>
        <AnimatePresence>
          <m.span
            v-if="showGoldBurst"
            :key="`gold-ripple-outer-${goldFoundEventId}`"
            class="gold-ripple-outer pointer-events-none absolute inset-[8%] rounded-full border-2"
            :variants="goldBurstVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
            :transition="{ delay: 0.04 }"
          />
        </AnimatePresence>
        <AnimatePresence>
          <m.span
            v-if="showGoldBurst"
            :key="`gold-spark-left-${goldFoundEventId}`"
            class="pointer-events-none absolute left-[18%] top-[22%] z-[5] text-base leading-none"
            :variants="goldSparkVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
            >✨</m.span
          >
        </AnimatePresence>
        <AnimatePresence>
          <m.span
            v-if="showGoldBurst"
            :key="`gold-spark-right-${goldFoundEventId}`"
            class="pointer-events-none absolute bottom-[20%] right-[18%] z-[5] text-base leading-none"
            :variants="goldSparkVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
            :transition="{ delay: 0.05 }"
            >✨</m.span
          >
        </AnimatePresence>
        <m.div
          :key="`gold-icon-${goldFoundEventId}`"
          class="drop-shadow-mining-gold relative z-10 text-3xl leading-none sm:text-4xl"
          :variants="goldIconVariants"
          :initial="goldFoundAnimating ? 'hidden' : 'visible'"
          animate="visible"
        >
          {{ GOLD_EMOJI }}
        </m.div>
      </div>
    </template>

    <template v-else-if="tileKind === 'empty'">
      <div class="relative flex h-full items-center justify-center overflow-hidden">
        <AnimatePresence>
          <m.span
            v-if="showEmptyPuffs"
            :key="`empty-puff-left-${emptyFoundEventId}`"
            class="pointer-events-none absolute bottom-[22%] left-[18%] h-[28%] w-[28%] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.25)_0%,rgba(148,163,184,0)_70%)]"
            :variants="emptyPuffVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
          />
        </AnimatePresence>
        <AnimatePresence>
          <m.span
            v-if="showEmptyPuffs"
            :key="`empty-puff-right-${emptyFoundEventId}`"
            class="pointer-events-none absolute bottom-[16%] right-[18%] h-[28%] w-[28%] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.25)_0%,rgba(148,163,184,0)_70%)]"
            :variants="emptyPuffVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
            :transition="{ delay: 0.03 }"
          />
        </AnimatePresence>
        <AnimatePresence>
          <m.span
            v-if="showEmptyPuffs"
            :key="`empty-flash-${emptyFoundEventId}`"
            class="empty-found-flash pointer-events-none absolute inset-0 rounded-[inherit]"
            :variants="emptyPuffVariants"
            initial="hidden"
            animate="visible"
            exit="exit"
          />
        </AnimatePresence>
        <m.div
          :key="`empty-value-${emptyFoundEventId}`"
          class="text-lg font-black leading-none text-app-text sm:text-xl"
          :variants="emptyValueVariants"
          :initial="emptyFoundAnimating ? 'hidden' : 'visible'"
          animate="visible"
        >
          0
        </m.div>
      </div>
    </template>

    <template v-else-if="flagged" />

    <template v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AnimatePresence, m, useReducedMotion } from 'motion-v';

import type { MiningFlagType } from '../game/types';
import {
  getAutoFlagIconVariants,
  getAutoFlagRippleVariants,
  getEmptyPuffVariants,
  getEmptyValueVariants,
  getGoldBurstVariants,
  getGoldIconVariants,
  getGoldSparkVariants,
} from './motion/miningTileMotion';

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
  autoFlagDelayMs?: number;
  autoFlagEventId?: number;
  goldFoundAnimating?: boolean;
  goldFoundEventId?: number;
  emptyFoundAnimating?: boolean;
  emptyFoundEventId?: number;
}>();

const emit = defineEmits<{
  dig: [];
  'toggle-flag': [];
}>();

const GOLD_EMOJI = '💰';
const prefersReducedMotionRef = useReducedMotion();

const prefersReducedMotion = computed(() => Boolean(prefersReducedMotionRef.value));
const autoFlagDelaySeconds = computed(() => (props.autoFlagDelayMs ?? 0) / 1000);

const autoFlagIconVariants = computed(() => getAutoFlagIconVariants(prefersReducedMotion.value));
const autoFlagRippleVariants = computed(() =>
  getAutoFlagRippleVariants(prefersReducedMotion.value)
);
const goldIconVariants = computed(() => getGoldIconVariants(prefersReducedMotion.value));
const goldBurstVariants = computed(() => getGoldBurstVariants(prefersReducedMotion.value));
const goldSparkVariants = computed(() => getGoldSparkVariants(prefersReducedMotion.value));
const emptyValueVariants = computed(() => getEmptyValueVariants(prefersReducedMotion.value));
const emptyPuffVariants = computed(() => getEmptyPuffVariants(prefersReducedMotion.value));

const showAutoFlagRipple = computed(
  () => props.tileKind === 'hidden' && props.autoFlagAnimating && !prefersReducedMotion.value
);
const showAutoFlagFlash = computed(() => props.tileKind === 'hidden' && props.autoFlagAnimating);
const goldFoundAnimating = computed(() => props.tileKind === 'gold' && props.goldFoundAnimating);
const emptyFoundAnimating = computed(() => props.tileKind === 'empty' && props.emptyFoundAnimating);
const showGoldBurst = computed(() => goldFoundAnimating.value);
const showEmptyPuffs = computed(() => emptyFoundAnimating.value);

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

  if (tapTimeout !== null) {
    window.clearTimeout(tapTimeout);
    tapTimeout = null;
    console.log('[mining][square-click] emitting dig because double tap threshold was met', {
      row: props.row,
      col: props.col,
    });
    emit('dig');
    return;
  }

  tapTimeout = window.setTimeout(() => {
    tapTimeout = null;
    console.log('[mining][square-click] emitting toggle-flag to toggle gold-here marker', {
      row: props.row,
      col: props.col,
      overridingNotGold: props.flagged === 'not-gold',
      wasFlagged: props.flagged === 'gold-here',
    });
    emit('toggle-flag');
  }, DOUBLE_TAP_MS);
}

const LONG_PRESS_MS = 300;
const DOUBLE_TAP_MS = 240;

let longPressTimeout: number | null = null;
let tapTimeout: number | null = null;
let didLongPress = false;

function startLongPress() {
  if (props.disabled || props.tileKind !== 'hidden') {
    return;
  }

  clearLongPress();
  didLongPress = false;
  longPressTimeout = window.setTimeout(() => {
    clearTap();
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

function clearTap() {
  if (tapTimeout !== null) {
    window.clearTimeout(tapTimeout);
    tapTimeout = null;
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
</script>

<style scoped>
.auto-flag-flash {
  background-color: rgb(var(--color-semantic-warning-200) / 0.1);
}

.auto-flag-ripple-ring {
  border-color: rgb(var(--color-semantic-warning-300) / 0.65);
}

.gold-ripple-inner {
  border-color: rgba(255, 244, 180, 0.6);
}

.gold-ripple-outer {
  border-color: rgba(255, 244, 180, 0.45);
}

.empty-found-flash {
  background-color: rgb(148 163 184 / 0.1);
}
</style>
