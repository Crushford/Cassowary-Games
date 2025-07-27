<template>
  <div class="flex-1 p-4">
    <div class="flex flex-col gap-4">
      <!-- Step Header -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white-800">
          Step {{ plantStore.currentStep }}: {{ stepTitle }}
        </h3>
        <p class="text-sm text-gray-600 mt-1">{{ stepDescription }}</p>
      </div>

      <!-- Step 1: Honey Pot Placement -->
      <div v-if="plantStore.isHoneyPotStep" class="flex flex-col gap-4">
        <!-- Honey Pot Cards and Grid Size Selector -->
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-4 justify-center flex-1">
            <CardStack
              image-src="/assets/card-backs/honey.png"
              alt-text="honey pot card"
              :is-selected="plantStore.selectedCard?.type === 'honey'"
              @select="plantStore.selectHoneyPot()"
            />
          </div>
          <BoardSizeDropdown :store="plantStore" />
        </div>

        <!-- Honey Pot Counter -->
        <div class="text-center">
          <p class="text-sm text-gray-600">
            Honey pots placed: {{ plantStore.honeyPotsPlaced }} / {{ plantStore.gridSize }}
          </p>
        </div>

        <!-- Next Step Button -->
        <div class="flex justify-center">
          <button
            @click="plantStore.nextStep()"
            :disabled="!plantStore.canProceedToNextStep"
            class="px-6 py-2 bg-blue-500 text-white rounded-md font-medium transition-colors"
            :class="{
              'bg-blue-500 hover:bg-blue-600': plantStore.canProceedToNextStep,
              'bg-gray-300 cursor-not-allowed': !plantStore.canProceedToNextStep,
            }"
          >
            Next Step
          </button>
        </div>
      </div>

      <!-- Step 2: Color Card Placement -->
      <div v-if="plantStore.isColorCardStep" class="flex flex-col gap-4">
        <!-- Color Cards -->
        <div class="flex flex-wrap gap-4 justify-center">
          <CardStack
            v-for="color in plantStore.availableColors"
            :key="color"
            :image-src="`/assets/ant-nest-colors/${color}.png`"
            :alt-text="`${color} card`"
            :is-selected="plantStore.selectedCard?.color === color"
            @select="plantStore.selectCard(color)"
          />
        </div>

        <!-- Previous Step Button -->
        <div class="flex justify-center">
          <button
            @click="plantStore.previousStep()"
            class="px-6 py-2 bg-gray-500 text-white rounded-md font-medium hover:bg-gray-600 transition-colors"
          >
            Previous Step
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, computed } from 'vue';
import { usePlantStore } from '../../stores/plantStore';

const BoardSizeDropdown = defineAsyncComponent(() => import('../shared/BoardSizeDropdown.vue'));
const CardStack = defineAsyncComponent(() => import('./CardStack.vue'));

// Use the store directly instead of through props
const plantStore = usePlantStore();

// Computed properties for step information
const stepTitle = computed(() => {
  switch (plantStore.currentStep) {
    case 1:
      return 'Place Honey Pots';
    case 2:
      return 'Place Color Cards';
    default:
      return 'Unknown Step';
  }
});

const stepDescription = computed(() => {
  switch (plantStore.currentStep) {
    case 1:
      return `Place exactly ${plantStore.gridSize} honey pots on the grid. You can change the grid size using the dropdown.`;
    case 2:
      return 'Place color cards to complete the puzzle.';
    default:
      return '';
  }
});
</script>
