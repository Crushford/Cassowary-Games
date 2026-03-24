<template>
  <button
    type="button"
    class="relative aspect-square w-full rounded-2xl border p-2 text-left transition-all duration-150 active:translate-y-px"
    :class="squareClass"
    :style="squareStyle"
    @click="$emit('dig')"
  >
    <Transition name="float-result">
      <div
        v-if="floatingMessage"
        class="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-lg"
        :class="floatingClass"
      >
        {{ floatingMessage }}
      </div>
    </Transition>

    <template v-if="tile">
      <div class="flex h-full flex-col">
        <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
          Depth {{ depth }}
        </div>

        <div class="mt-5 flex-1" />

        <div class="mt-auto">
          <div class="h-2 overflow-hidden rounded-full bg-black/25">
            <div
              class="h-full rounded-full bg-white/85 transition-[width] duration-200"
              :style="{ width: `${healthPercent}%` }"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex h-full flex-col items-center justify-center text-center">
        <div class="text-xs font-bold uppercase tracking-[0.22em] text-app-textMuted">Worked</div>
        <div class="mt-2 text-[11px] text-app-textMuted">No ground left</div>
      </div>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { GroundTileState } from '../game/types';

const props = defineProps<{
  tile: GroundTileState | null;
  floatingMessage?: string | null;
  floatingTone?: 'neutral' | 'success' | 'warning' | null;
}>();

defineEmits<{
  dig: [];
}>();

const depth = computed(() => (props.tile ? props.tile.layerIndex + 1 : 0));
const healthPercent = computed(() => {
  if (!props.tile) {
    return 0;
  }

  return (props.tile.currentDensity / props.tile.maxDensity) * 100;
});

const depthShade = computed(() => {
  if (!props.tile) {
    return 0;
  }

  return Math.min(props.tile.layerIndex * 0.1, 0.45);
});

const squareStyle = computed(() => {
  if (!props.tile) {
    return undefined;
  }

  return {
    boxShadow: `inset 0 0 0 999px rgba(15, 23, 42, ${depthShade.value})`,
  };
});

const floatingClass = computed(() => {
  switch (props.floatingTone) {
    case 'success':
      return 'bg-semantic-success-100 text-semantic-success-900';
    case 'warning':
      return 'bg-semantic-danger-100 text-semantic-danger-900';
    default:
      return 'bg-white text-semantic-neutral-900';
  }
});

const squareClass = computed(() => {
  if (!props.tile) {
    return 'border-app-border bg-app-surface opacity-60';
  }

  switch (props.tile.groundType) {
    case 'quartz':
      return 'border-semantic-warning-300 bg-gradient-to-br from-semantic-warning-700 to-semantic-warning-900 text-white shadow-lg shadow-semantic-warning-950/20';
    case 'rock':
      return 'border-semantic-neutral-500 bg-gradient-to-br from-semantic-neutral-600 to-semantic-neutral-800 text-white shadow-lg shadow-black/20';
    default:
      return 'border-semantic-warning-700 bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800 text-white shadow-lg shadow-semantic-warning-950/15';
  }
});
</script>

<style scoped>
.float-result-enter-active,
.float-result-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.float-result-enter-from,
.float-result-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5rem);
}
</style>
