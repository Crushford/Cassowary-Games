<template>
  <Modal :is-visible="isVisible">
    <div>
      <h2 class="text-2xl font-bold text-green-400 mb-4">Puzzle Complete! 🎉</h2>
      <p class="text-white mb-4">Queens found: {{ queensStore.queenPositions.length }}</p>

      <!-- Completion Time -->
      <div v-if="queensStore.puzzleCompletionTime !== null" class="mb-4">
        <div class="p-3 bg-gray-700 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-gray-300 font-semibold">Your Time:</span>
            <span class="text-green-400 font-bold text-lg">{{
              queensStore.getFormattedPuzzleTime
            }}</span>
          </div>
          <div v-if="queensStore.puzzleBestTime !== null" class="text-xs text-gray-400">
            <span v-if="queensStore.puzzleIsNewRecord" class="text-yellow-400 font-semibold">
              🏆 New Best Time!
            </span>
            <span v-else>
              Best Time: {{ queensStore.formatTime(queensStore.puzzleBestTime) }}
            </span>
          </div>
          <div v-else class="text-xs text-gray-400">First time for this size!</div>
        </div>
      </div>

      <button
        @click="handleNextPuzzle"
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

const handleNextPuzzle = async () => {
  try {
    await queensStore.startNextPuzzle();
  } catch (error) {
    console.error('Error loading next puzzle:', error);
  }
};
</script>

<script lang="ts">
export default {
  name: 'QueensCompletionModal',
};
</script>
