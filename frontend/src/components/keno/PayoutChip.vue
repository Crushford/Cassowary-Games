<template>
  <!-- PayoutChip -->
  <div
    class="rounded-lg px-2 py-1 flex items-center justify-center gap-1 border h-full text-xs"
    :class="
      disabled
        ? 'bg-slate-800/40 border-slate-700 text-slate-500'
        : 'bg-slate-800 border-slate-600 text-slate-100'
    "
    role="status"
    :aria-label="`payout for ${k} matches: ${display}`"
  >
    <span>{{ k }}</span>
    <span>→</span>
    <span class="font-semibold">{{ display }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  k: number;
  payout: number;
  disabled?: boolean;
}>();

const display = computed(() => (props.payout > 0 ? props.payout : '–'));
</script>
