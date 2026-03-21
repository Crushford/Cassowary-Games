<template>
  <component :is="IncrementalQueensGameAsync" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import IncrementalQueensLoadingScreen from '../components/queens/IncrementalQueensLoadingScreen.vue';

const IncrementalQueensGameAsync = defineAsyncComponent({
  loader: () => import('./IncrementalQueensGame.vue'),
  delay: 0,
  loadingComponent: IncrementalQueensLoadingScreen,
});

defineOptions({
  name: 'IncrementalQueensEntry',
});
</script>
