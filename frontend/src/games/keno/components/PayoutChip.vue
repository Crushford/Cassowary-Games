<template>
  <!-- PayoutChip -->
  <div
    class="rounded-lg px-2 py-1 flex items-center justify-center gap-1 border h-full text-xs"
    :class="
      disabled
        ? 'bg-surface-mutedFaint border-semantic-neutral-700 text-semantic-neutral-500'
        : 'bg-semantic-neutral-800 border-semantic-neutral-600 text-semantic-neutral-100'
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
