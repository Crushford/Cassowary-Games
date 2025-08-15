<template>
  <div class="flex items-center space-x-2">
    <span class="text-yellow-400 text-2xl">💰</span>
    <span class="text-yellow-400 text-xl font-bold">{{ globalStore.player.totalChips }}</span>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '../../stores/global';

const globalStore = useGlobalStore();

defineOptions({
  name: 'GoldDisplay',
});
</script>
