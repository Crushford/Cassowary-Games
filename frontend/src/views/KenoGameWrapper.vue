<template>
  <!-- KenoGameWrapper -->
  <div class="h-svh w-full flex bg-gray-900 overflow-hidden">
    <!-- Keno Game on the left -->
    <div class="flex-shrink-0">
      <KenoGame />
    </div>

    <!-- Debug Panel on the right -->
    <div class="flex-shrink-0 w-64">
      <KenoDebugPanel :store="kenoStore" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useKenoStore } from '../stores/kenoStore';

const KenoGame = defineAsyncComponent(() => import('./KenoGame.vue'));
const KenoDebugPanel = defineAsyncComponent(() => import('../components/keno/KenoDebugPanel.vue'));

const kenoStore = useKenoStore();

defineOptions({
  name: 'KenoGameWrapper',
});
</script>
