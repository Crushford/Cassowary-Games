<template>
  <button
    type="button"
    class="relative aspect-square w-full rounded-2xl border p-2 text-center transition-all duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0"
    :class="squareClass"
    :disabled="disabled"
    @click="$emit('dig')"
  >
    <template v-if="revealed && hasGold">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Gold</div>
        <div class="mt-2 text-3xl font-black text-white">5</div>
      </div>
    </template>

    <template v-else-if="revealed">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-textMuted">
          Dug
        </div>
        <div class="mt-2 text-2xl font-black text-app-textMuted">0</div>
      </div>
    </template>

    <template v-else-if="flagged">
      <div class="flex h-full flex-col items-center justify-center">
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-semantic-info-200">
          Flagged
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
import { computed } from 'vue';

const props = defineProps<{
  revealed: boolean;
  hasGold: boolean;
  flagged: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  dig: [];
}>();

const squareClass = computed(() => {
  if (props.revealed && props.hasGold) {
    return 'border-semantic-warning-300 bg-gradient-to-br from-semantic-warning-600 to-semantic-warning-900 shadow-lg shadow-semantic-warning-950/20';
  }

  if (props.revealed) {
    return 'border-app-border bg-app-surface opacity-70';
  }

  if (props.flagged) {
    return 'border-semantic-info-400 bg-gradient-to-br from-semantic-info-700 to-semantic-info-900';
  }

  return 'border-semantic-warning-700 bg-gradient-to-br from-semantic-warning-500 to-semantic-warning-800 shadow-lg shadow-semantic-warning-950/15';
});
</script>
