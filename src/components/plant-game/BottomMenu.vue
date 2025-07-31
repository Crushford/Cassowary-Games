<template>
  <div
    :class="[
      'border-t border-gray-700 flex items-center justify-center gap-3 px-2 py-1',
      $attrs.class,
    ]"
  >
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
      @click="plantStore.resetCurrentStep()"
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

    <!-- Preview Puzzle Button -->
    <button
      v-if="plantStore.isColorCardStep"
      @click="plantStore.openValidationModal()"
      class="px-4 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors text-sm"
    >
      Validate
    </button>

    <!-- Validation Modal -->
    <PuzzleValidationModal
      :is-visible="plantStore.showValidationModal"
      @close="plantStore.closeValidationModal()"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { usePlantStore } from '../../stores/plantStore';

const PuzzleValidationModal = defineAsyncComponent(() => import('./PuzzleValidationModal.vue'));

const plantStore = usePlantStore();
</script>
