<template>
  <button
    type="button"
    class="relative aspect-square w-full rounded-2xl border p-2 text-center transition-all duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0"
    :class="squareClass"
    :disabled="disabled"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointerleave="cancelLongPress"
    @pointercancel="cancelLongPress"
    @contextmenu.prevent="handleContextMenu"
    @click="handleClick"
  >
    <template v-if="tileKind === 'gold'">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Gold</div>
        <div class="mt-2 text-3xl font-black text-white">5</div>
      </div>
    </template>

    <template v-else-if="tileKind === 'quartz'">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-semantic-neutral-200">
          Quartz
        </div>
        <div class="mt-2 text-2xl font-black text-white">0</div>
      </div>
    </template>

    <template v-else-if="tileKind === 'rock'">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Rock</div>
        <div class="mt-2 text-2xl font-black text-white/85">?</div>
      </div>
    </template>

    <template v-else-if="flagged">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-semantic-info-200">
          {{ autoFlagged ? 'Survey' : 'Flagged' }}
        </div>
        <div class="mt-2 text-2xl font-black text-semantic-info-100">×</div>
      </div>
    </template>

    <template v-else>
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Dirt</div>
        <div class="mt-2 text-xs text-white/70">Dig</div>
      </div>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  tileKind: 'hidden' | 'gold' | 'quartz' | 'rock';
  flagged: boolean;
  autoFlagged: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  dig: [];
  'toggle-flag': [];
}>();

const LONG_PRESS_MS = 350;
const longPressTimeout = ref<number | null>(null);
const suppressClick = ref(false);

function cancelLongPress() {
  if (longPressTimeout.value !== null) {
    window.clearTimeout(longPressTimeout.value);
    longPressTimeout.value = null;
  }
}

function toggleFlag() {
  if (props.disabled || props.tileKind !== 'hidden') {
    return;
  }

  suppressClick.value = true;
  emit('toggle-flag');
}

function handlePointerDown() {
  if (props.disabled || props.tileKind !== 'hidden') {
    return;
  }

  suppressClick.value = false;
  cancelLongPress();
  longPressTimeout.value = window.setTimeout(() => {
    longPressTimeout.value = null;
    toggleFlag();
  }, LONG_PRESS_MS);
}

function handlePointerUp(event: PointerEvent) {
  cancelLongPress();

  if (suppressClick.value) {
    event.preventDefault();
    event.stopPropagation();
    window.setTimeout(() => {
      suppressClick.value = false;
    }, 0);
  }
}

function handleContextMenu() {
  toggleFlag();
}

function handleClick(event: MouseEvent) {
  if (suppressClick.value) {
    event.preventDefault();
    event.stopPropagation();
    suppressClick.value = false;
    return;
  }

  emit('dig');
}

const squareClass = computed(() => {
  if (props.tileKind === 'gold') {
    return 'border-semantic-warning-300 bg-gradient-to-br from-semantic-warning-600 to-semantic-warning-900 shadow-lg shadow-semantic-warning-950/20';
  }

  if (props.tileKind === 'quartz') {
    return 'border-white/70 bg-gradient-to-br from-semantic-neutral-100 to-white text-semantic-neutral-900 shadow-lg shadow-black/10';
  }

  if (props.tileKind === 'rock') {
    return 'border-semantic-neutral-500 bg-gradient-to-br from-semantic-neutral-600 to-semantic-neutral-800 shadow-lg shadow-black/20';
  }

  if (props.flagged) {
    return 'border-semantic-info-400 bg-gradient-to-br from-semantic-info-700 to-semantic-info-900';
  }

  return 'border-semantic-warning-700 bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800 shadow-lg shadow-semantic-warning-950/15';
});
</script>
