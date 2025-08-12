<template>
  <div class="flex items-center space-x-2">
    <span class="text-yellow-400 text-2xl">💰</span>
    <span class="text-yellow-400 text-xl font-bold">{{ roundStore.tableStack }}</span>
  </div>
</template>

<script setup lang="ts">
import { useRoundStore } from '../../stores/round';

const roundStore = useRoundStore();

defineOptions({
  name: 'GoldDisplay',
});
</script>

