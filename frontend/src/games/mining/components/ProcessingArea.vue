<template>
  <div class="rounded-2xl border border-app-border bg-app-surface p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-textMuted">
          Processing
        </div>
        <div class="mt-1 text-base font-bold text-app-text">
          {{ processingLoad ? processingLoad.label : 'Empty cradle' }}
        </div>
        <p class="mt-1 text-sm leading-relaxed text-app-textMuted">
          {{ description }}
        </p>
      </div>

      <button
        type="button"
        class="rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
        :class="
          processingLoad
            ? 'border-semantic-success-500 bg-semantic-success-700 text-white hover:bg-semantic-success-600'
            : 'border-app-border bg-app-bg text-app-textMuted'
        "
        @click="$emit('process')"
      >
        {{ buttonLabel }}
      </button>
    </div>

    <div v-if="processingLoad" class="mt-4">
      <div class="mb-1 flex items-center justify-between text-xs text-app-textMuted">
        <span>Work remaining</span>
        <span>{{ processingLoad.remainingDays }}/{{ processingLoad.totalDays }} days</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-app-bg">
        <div
          class="h-full rounded-full bg-semantic-success-400 transition-[width] duration-200"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ProcessingLoad } from '../game/types';

const props = defineProps<{
  processingLoad: ProcessingLoad | null;
  buttonLabel: string;
}>();

defineEmits<{
  process: [];
}>();

const description = computed(() => {
  if (!props.processingLoad) {
    return 'Heavy ground must be finished here before you can start another rock or quartz load.';
  }

  return `Worth ${props.processingLoad.goldValue} gold when fully processed.`;
});

const progressPercent = computed(() => {
  if (!props.processingLoad) {
    return 0;
  }

  const completedDays = props.processingLoad.totalDays - props.processingLoad.remainingDays;
  return (completedDays / props.processingLoad.totalDays) * 100;
});
</script>
