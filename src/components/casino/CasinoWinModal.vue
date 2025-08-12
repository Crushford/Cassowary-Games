<template>
  <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
    <div class="bg-green-800 text-white p-8 rounded-lg text-center">
      <h2 class="text-2xl font-bold mb-4">Solved! Final gold: {{ finalGold }}.</h2>
      <button
        @click="$emit('restart')"
        class="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
      >
        Restart
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  finalGold: number;
}>();

defineEmits<{
  restart: [];
}>();

defineOptions({
  name: 'CasinoWinModal',
});
</script>
