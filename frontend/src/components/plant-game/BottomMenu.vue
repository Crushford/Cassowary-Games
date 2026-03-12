<template>
  <div
    :class="[
      'border-t border-semantic-neutral-700 flex items-center justify-center gap-3 px-2 py-1 relative',
      $attrs.class,
    ]"
  >
    <!-- Undo Button -->
    <button
      :disabled="!plantStore.canUndo"
      class="px-3 py-2 text-white rounded-md font-medium transition-colors text-sm"
      :class="{
        'bg-semantic-warning-500 hover:bg-semantic-warning-600': plantStore.canUndo,
        'bg-semantic-neutral-400 text-semantic-neutral-200 cursor-not-allowed opacity-60':
          !plantStore.canUndo,
      }"
      @click="plantStore.undo()"
    >
      Undo
    </button>

    <!-- Reset Button -->
    <button
      class="px-3 py-2 bg-semantic-danger-500 text-white rounded-md font-medium hover:bg-semantic-danger-600 transition-colors text-sm"
      @click="plantStore.resetCurrentStep()"
    >
      Reset
    </button>

    <!-- Next Step Button -->
    <button
      v-if="plantStore.isHoneyPotStep"
      :disabled="!plantStore.canProceedToNextStep"
      class="px-4 py-2 text-white rounded-md font-medium transition-colors text-sm"
      :class="{
        'bg-semantic-info-500 hover:bg-semantic-info-600': plantStore.canProceedToNextStep,
        'bg-semantic-neutral-400 text-semantic-neutral-200 cursor-not-allowed opacity-60':
          !plantStore.canProceedToNextStep,
      }"
      @click="plantStore.nextStep()"
    >
      Next Step
    </button>

    <!-- Validate Puzzle Button -->
    <button
      v-if="plantStore.isColorCardStep"
      class="px-4 py-2 bg-semantic-success-500 text-white rounded-md font-medium hover:bg-semantic-success-600 transition-colors text-sm"
      @click="plantStore.openValidationModal()"
    >
      Validate
    </button>

    <!-- Validation Modal -->
    <PuzzleValidationModal
      :is-visible="plantStore.showValidationModal"
      mode="validation"
      @close="plantStore.closeValidationModal()"
    />

    <!-- Save Modal -->
    <PuzzleValidationModal
      :is-visible="plantStore.showSaveModal"
      mode="save"
      @close="plantStore.closeSaveModal()"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { usePlantStore } from '../../stores/plantStore';

const PuzzleValidationModal = defineAsyncComponent(() => import('./PuzzleValidationModal.vue'));

const plantStore = usePlantStore();
</script>
