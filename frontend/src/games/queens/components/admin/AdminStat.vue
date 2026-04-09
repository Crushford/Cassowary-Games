<template>
  <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
    <div class="text-sm text-semantic-neutral-400">{{ label }}</div>
    <div class="mt-1 text-2xl font-semibold text-white">{{ value }}</div>
    <div v-if="detail" class="mt-2 text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
      {{ detail }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  detail?: string;
}>();
</script>
