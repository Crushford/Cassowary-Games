<template>
  <div class="flex-1 p-4">
    <div class="flex flex-col gap-4">
      <!-- Step Header -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white-800">
          Step {{ plantStore.currentStep }}: {{ plantStore.stepTitle }}
        </h3>
      </div>

      <!-- Step 1: Honey Pot Placement -->
      <div v-if="plantStore.isHoneyPotStep" class="flex flex-col gap-4">
        <!-- All controls in one row -->
        <div class="flex items-center justify-between gap-4">
          <!-- Grid Size Dropdown -->
          <BoardSizeDropdown :store="plantStore" />

          <CardStack
            image-src="/assets/card-backs/honey.png"
            alt-text="honey pot card"
            :is-selected="plantStore.selectedCard?.type === 'honey'"
            @select="plantStore.selectHoneyPot()"
          />

          <!-- Honey Pot Counter -->
          <div class="text-center">
            <p class="text-sm text-gray-600">
              {{ plantStore.honeyPotsPlaced }} / {{ plantStore.gridSize }} placed
            </p>
          </div>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { usePlantStore } from '../../stores/plantStore';

const BoardSizeDropdown = defineAsyncComponent(() => import('../shared/BoardSizeDropdown.vue'));
const CardStack = defineAsyncComponent(() => import('./CardStack.vue'));

// Use the store directly instead of through props
const plantStore = usePlantStore();
</script>
