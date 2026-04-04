<template>
  <button
    ref="scope"
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
    <span
      ref="autoFlagFlashRef"
      class="auto-flag-flash pointer-events-none absolute inset-0 rounded-[inherit]"
    />

    <div
      v-if="flagged && tileKind === 'hidden'"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <span
        ref="flagIconRef"
        class="text-shadow-mining-flag text-3xl text-white"
        :class="{ 'drop-shadow-mining-flag-glow': autoFlagAnimating && !prefersReducedMotion }"
        >🚧</span
      >
      <span
        ref="autoFlagRippleRef"
        class="auto-flag-ripple-ring pointer-events-none absolute h-[62%] w-[62%] rounded-full border-2"
      />
    </div>

    <template v-if="tileKind === 'gold'">
      <div class="relative flex h-full items-center justify-center overflow-hidden">
        <span
          ref="goldBurstRef"
          class="pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_58%),radial-gradient(circle,rgba(250,204,21,0.5)_12%,rgba(250,204,21,0)_68%)]"
        />
        <span
          ref="goldRippleInnerRef"
          class="gold-ripple-inner pointer-events-none absolute inset-[20%] rounded-full border-2"
        />
        <span
          ref="goldRippleOuterRef"
          class="gold-ripple-outer pointer-events-none absolute inset-[8%] rounded-full border-2"
        />
        <span
          ref="goldSparkLeftRef"
          class="pointer-events-none absolute left-[18%] top-[22%] z-[5] text-base leading-none"
          >✨</span
        >
        <span
          ref="goldSparkRightRef"
          class="pointer-events-none absolute bottom-[20%] right-[18%] z-[5] text-base leading-none"
          >✨</span
        >
        <div
          ref="goldIconRef"
          class="drop-shadow-mining-gold relative z-10 text-3xl leading-none sm:text-4xl"
        >
          {{ GOLD_EMOJI }}
        </div>
      </div>
    </template>

    <template v-else-if="tileKind === 'empty'">
      <div class="relative flex h-full items-center justify-center overflow-hidden">
        <span
          ref="emptyPuffLeftRef"
          class="pointer-events-none absolute bottom-[22%] left-[18%] h-[28%] w-[28%] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.25)_0%,rgba(148,163,184,0)_70%)]"
        />
        <span
          ref="emptyPuffRightRef"
          class="pointer-events-none absolute bottom-[16%] right-[18%] h-[28%] w-[28%] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.25)_0%,rgba(148,163,184,0)_70%)]"
        />
        <span
          ref="emptyFlashRef"
          class="empty-found-flash pointer-events-none absolute inset-0 rounded-[inherit]"
        />
        <div ref="emptyValueRef" class="text-lg font-black leading-none text-app-text sm:text-xl">
          0
        </div>
      </div>
    </template>

    <template v-else-if="flagged" />

    <template v-else />
  </button>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useAnimate, useReducedMotion } from 'motion-v';

import type { MiningFlagType } from '../game/types';
import {
  getAutoFlagAnimationSteps,
  getEmptyFoundAnimationSteps,
  getGoldFoundAnimationSteps,
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
const LONG_PRESS_MS = 300;
const DOUBLE_TAP_MS = 240;

const autoFlagFlashRef = ref<HTMLElement | null>(null);
const flagIconRef = ref<HTMLElement | null>(null);
const autoFlagRippleRef = ref<HTMLElement | null>(null);
const goldBurstRef = ref<HTMLElement | null>(null);
const goldRippleInnerRef = ref<HTMLElement | null>(null);
const goldRippleOuterRef = ref<HTMLElement | null>(null);
const goldSparkLeftRef = ref<HTMLElement | null>(null);
const goldSparkRightRef = ref<HTMLElement | null>(null);
const goldIconRef = ref<HTMLElement | null>(null);
const emptyPuffLeftRef = ref<HTMLElement | null>(null);
const emptyPuffRightRef = ref<HTMLElement | null>(null);
const emptyFlashRef = ref<HTMLElement | null>(null);
const emptyValueRef = ref<HTMLElement | null>(null);

const [scope, animate] = useAnimate();
const prefersReducedMotionRef = useReducedMotion();
const prefersReducedMotion = computed(() => Boolean(prefersReducedMotionRef.value));

let longPressTimeout: number | null = null;
let tapTimeout: number | null = null;
let didLongPress = false;

const showAutoFlagRipple = computed(
  () => props.tileKind === 'hidden' && props.autoFlagAnimating && !prefersReducedMotion.value
);

function handleTap() {
  if (props.disabled || props.tileKind !== 'hidden') {
    return;
  }

  if (didLongPress) {
    didLongPress = false;
    return;
  }

  if (tapTimeout !== null) {
    window.clearTimeout(tapTimeout);
    tapTimeout = null;
    emit('dig');
    return;
  }

  tapTimeout = window.setTimeout(() => {
    tapTimeout = null;
    emit('toggle-flag');
  }, DOUBLE_TAP_MS);
}

function startLongPress() {
  if (props.disabled || props.tileKind !== 'hidden') {
    return;
  }

  clearLongPress();
  didLongPress = false;
  longPressTimeout = window.setTimeout(() => {
    clearTap();
    didLongPress = true;
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

function hideElement(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  void animate(
    element,
    { opacity: 0 },
    {
      duration: 0,
    }
  );
}

async function runAnimationSteps(
  steps: Array<{
    element: HTMLElement | null;
    keyframes: Parameters<typeof animate>[1];
    options: Parameters<typeof animate>[2];
  }>
) {
  const activeSteps = steps.filter(
    (
      step
    ): step is {
      element: HTMLElement;
      keyframes: Parameters<typeof animate>[1];
      options: Parameters<typeof animate>[2];
    } => Boolean(step.element)
  );

  await Promise.all(activeSteps.map((step) => animate(step.element, step.keyframes, step.options)));
}

watch(
  () => scope.value,
  () => {
    hideElement(autoFlagFlashRef.value);
    hideElement(autoFlagRippleRef.value);
    hideElement(goldBurstRef.value);
    hideElement(goldRippleInnerRef.value);
    hideElement(goldRippleOuterRef.value);
    hideElement(goldSparkLeftRef.value);
    hideElement(goldSparkRightRef.value);
    hideElement(emptyPuffLeftRef.value);
    hideElement(emptyPuffRightRef.value);
    hideElement(emptyFlashRef.value);
  },
  { immediate: true }
);

watch(
  () => props.autoFlagEventId,
  async (eventId, previousEventId) => {
    if (!eventId || eventId === previousEventId || !props.autoFlagAnimating) {
      return;
    }

    await nextTick();

    const delaySeconds = (props.autoFlagDelayMs ?? 0) / 1000;
    if (!flagIconRef.value || !autoFlagFlashRef.value) {
      return;
    }

    await runAnimationSteps(
      getAutoFlagAnimationSteps(prefersReducedMotion.value, delaySeconds, {
        icon: flagIconRef.value,
        flash: autoFlagFlashRef.value,
        ripple: autoFlagRippleRef.value,
      })
    );
  }
);

watch(
  () => props.goldFoundEventId,
  async (eventId, previousEventId) => {
    if (!eventId || eventId === previousEventId || !props.goldFoundAnimating) {
      return;
    }

    await nextTick();

    if (!goldIconRef.value) {
      return;
    }

    await runAnimationSteps(
      getGoldFoundAnimationSteps(prefersReducedMotion.value, {
        icon: goldIconRef.value,
        burst: goldBurstRef.value,
        innerRipple: goldRippleInnerRef.value,
        outerRipple: goldRippleOuterRef.value,
        sparkLeft: goldSparkLeftRef.value,
        sparkRight: goldSparkRightRef.value,
      })
    );
  }
);

watch(
  () => props.emptyFoundEventId,
  async (eventId, previousEventId) => {
    if (!eventId || eventId === previousEventId || !props.emptyFoundAnimating) {
      return;
    }

    await nextTick();

    if (!emptyValueRef.value) {
      return;
    }

    await runAnimationSteps(
      getEmptyFoundAnimationSteps(prefersReducedMotion.value, {
        value: emptyValueRef.value,
        flash: emptyFlashRef.value,
        puffLeft: emptyPuffLeftRef.value,
        puffRight: emptyPuffRightRef.value,
      })
    );
  }
);
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
