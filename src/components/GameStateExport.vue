<template>
  <div>
    <h3 class="font-semibold mb-4 text-white">Current Game State</h3>
    <pre
      class="font-mono whitespace-pre bg-slate-700 p-4 rounded text-sm overflow-x-auto my-2 text-white leading-relaxed"
      >{{ exportText }}</pre
    >
    <button
      @click="copyToClipboard"
      class="px-4 py-2 bg-indigo-600 text-white border-none rounded cursor-pointer font-medium transition hover:bg-indigo-500"
    >
      Copy to Clipboard
    </button>
    <span v-if="copyStatus" class="ml-2 text-sm text-green-400">{{ copyStatus }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

// Generate export text as a computed property to keep it updated
const exportText = computed(() => {
  return gameStore.exportGameState();
});

// Method to copy text to clipboard
const copyToClipboard = () => {
  navigator.clipboard
    .writeText(exportText.value)
    .then(() => {
      // Show a success message
      copyStatus.value = 'Copied!';
      setTimeout(() => {
        copyStatus.value = '';
      }, 2000);
    })
    .catch((err) => {
      console.error('Failed to copy text: ', err);
      copyStatus.value = 'Failed to copy';
    });
};

// Status message for copy operation
const copyStatus = ref('');
</script>
