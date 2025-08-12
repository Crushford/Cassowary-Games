<template>
  <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
    <div class="bg-red-800 text-white p-8 rounded-lg text-center">
      <h2 class="text-2xl font-bold mb-4">Out of gold.</h2>
      <button
        @click="globalStore.restart"
        class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
      >
        Restart
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoundStore } from '../../stores/round';
import { useGlobalStore } from '../../stores/global';

const roundStore = useRoundStore();
const globalStore = useGlobalStore();

defineOptions({
  name: 'CasinoBustModal',
});
</script>
