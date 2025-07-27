<template>
  <Modal :is-visible="isVisible">
    <!-- Training Day Completion -->
    <div v-if="harvestStore.isTrainingDay">
      <h2 class="text-2xl font-bold text-green-400 mb-4">Training Complete!</h2>
      <p class="text-white mb-2">Training Day</p>
      <p class="text-white mb-2">Honey Pots: {{ harvestStore.honeyPots }}</p>
      <p class="text-white mb-2">Bites: {{ harvestStore.bites }}</p>
      <p class="text-white mb-4">Best Day: {{ harvestStore.highScore }} Honey Pots</p>
      <div class="flex flex-col space-y-2">
        <button
          @click="harvestStore.startRealGame()"
          class="w-full py-3 px-6 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
        >
          Start Real Game (Day 1)
        </button>
        <button
          @click="harvestStore.continueTraining()"
          class="w-full py-3 px-6 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Continue Training
        </button>
      </div>
    </div>

    <!-- Regular Game Completion -->
    <div v-else>
      <h2 class="text-2xl font-bold text-amber-400 mb-4">You passed out!</h2>
      <p class="text-white mb-2">Day {{ harvestStore.currentDay }}</p>
      <p class="text-white mb-2">Honey Pots: {{ harvestStore.honeyPots }}</p>
      <p class="text-white mb-4">Best Day: {{ harvestStore.highScore }} Honey Pots</p>
      <button
        @click="harvestStore.startNewDay()"
        class="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
      >
        Start Day {{ harvestStore.currentDay + 1 }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { useHarvestStore } from '../../stores/harvestStore';
import Modal from './Modal.vue';

const harvestStore = useHarvestStore();

defineProps<{
  isVisible: boolean;
}>();
</script>

<script lang="ts">
export default {
  name: 'PuzzleCompletionModal',
};
</script>
