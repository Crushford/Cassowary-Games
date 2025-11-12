<template>
  <Modal :is-visible="isVisible">
    <div>
      <h2 class="text-2xl font-bold text-green-400 mb-4">Puzzle Complete! 🎉</h2>
      <p class="text-white mb-2">Great job solving the puzzle!</p>
      <p class="text-white mb-4">Queens found: {{ queensStore.queenPositions.length }}</p>
      <button
        @click="handleNewPuzzle"
        class="w-full py-3 px-6 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
      >
        New Puzzle
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { useQueensStore } from '../../stores/queensStore';
import Modal from '../shared/Modal.vue';

const queensStore = useQueensStore();

defineProps<{
  isVisible: boolean;
}>();

async function handleNewPuzzle() {
  // Reset game state
  queensStore.isComplete = false;
  queensStore.clearMarkers();

  // Load a new random puzzle
  await queensStore.loadRandomPuzzle();
}
</script>

<script lang="ts">
export default {
  name: 'QueensCompletionModal',
};
</script>
