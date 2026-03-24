<template>
  <div class="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl bg-app-bg px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-app-textMuted">Day</div>
        <div class="mt-1 text-lg font-black tabular-nums text-app-text">{{ daysElapsed }}</div>
      </div>

      <div class="rounded-xl bg-app-bg px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-app-textMuted">Gold</div>
        <div class="mt-1 text-lg font-black tabular-nums text-semantic-warning-300">
          {{ goldTotal }}
        </div>
      </div>

      <div class="rounded-xl bg-app-bg px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-app-textMuted">Tool</div>
        <div class="mt-1 text-sm font-bold text-app-text">{{ toolLabel }}</div>
      </div>

      <div class="rounded-xl bg-app-bg px-3 py-2">
        <div class="text-[10px] uppercase tracking-[0.18em] text-app-textMuted">Power</div>
        <div class="mt-1 text-sm font-bold text-app-text">{{ shovelPower }}</div>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-between gap-3">
      <div class="text-xs text-app-textMuted">
        Tailings {{ tailingsTotal }}
        <span v-if="processingLoad"> · Processing {{ processingLoad.label }}</span>
      </div>

      <button
        type="button"
        class="rounded-xl border border-semantic-info-500 bg-semantic-info-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-semantic-info-600"
        @click="$emit('open-shop')"
      >
        Shop
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProcessingLoad } from '../game/types';

defineProps<{
  daysElapsed: number;
  goldTotal: number;
  tailingsTotal: number;
  shovelPower: number;
  toolLabel: string;
  processingLoad: ProcessingLoad | null;
}>();

defineEmits<{
  'open-shop': [];
}>();
</script>
