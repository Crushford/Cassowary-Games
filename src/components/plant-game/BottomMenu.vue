<template>
  <div class="border-t border-gray-700 flex items-center justify-center gap-3 px-2 py-1">
    <!-- Undo Button -->
    <button
      @click="plantStore.undo()"
      :disabled="!plantStore.canUndo"
      class="px-3 py-2 bg-yellow-500 text-white rounded-md font-medium transition-colors text-sm"
      :class="{
        'bg-yellow-500 hover:bg-yellow-600': plantStore.canUndo,
        'bg-gray-300 cursor-not-allowed': !plantStore.canUndo,
      }"
    >
      Undo
    </button>

    <!-- Reset Button -->
    <button
      @click="plantStore.resetGame()"
      class="px-3 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-colors text-sm"
    >
      Reset
    </button>

    <!-- Next Step Button -->
    <button
      v-if="plantStore.isHoneyPotStep"
      @click="plantStore.nextStep()"
      :disabled="!plantStore.canProceedToNextStep"
      class="px-4 py-2 bg-blue-500 text-white rounded-md font-medium transition-colors text-sm"
      :class="{
        'bg-blue-500 hover:bg-blue-600': plantStore.canProceedToNextStep,
        'bg-gray-300 cursor-not-allowed': !plantStore.canProceedToNextStep,
      }"
    >
      Next Step
    </button>
  </div>
</template>

<script setup lang="ts">
import { usePlantStore } from '../../stores/plantStore';

const plantStore = usePlantStore();
</script>
