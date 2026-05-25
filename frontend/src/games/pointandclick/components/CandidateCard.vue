<template>
  <div
    class="group relative overflow-hidden rounded-2xl border transition-all cursor-pointer"
    :class="
      candidate.selected
        ? 'border-semantic-warning-400 ring-1 ring-semantic-warning-400'
        : 'border-semantic-neutral-700 hover:border-semantic-neutral-500'
    "
    @click="emit('select')"
  >
    <!-- Gradient preview -->
    <div
      class="h-16 w-full"
      :style="{ background: candidate.previewGradient }"
    />

    <div class="p-2">
      <p class="text-xs font-semibold leading-snug text-white truncate">{{ candidate.title }}</p>
      <p class="mt-0.5 text-[10px] leading-relaxed text-semantic-neutral-400 line-clamp-2">{{ candidate.prompt }}</p>
    </div>

    <!-- Selected badge -->
    <div
      v-if="candidate.selected"
      class="absolute top-1.5 right-1.5 rounded-full bg-semantic-warning-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black"
    >
      Selected
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetCandidate } from '../types';

defineProps<{ candidate: AssetCandidate }>();
const emit = defineEmits<{ select: [] }>();
</script>
