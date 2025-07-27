<template>
  <!-- Header -->

  <!-- Card Deck Section -->
  <div class="flex-1 p-4">
    <div class="flex flex-col gap-4">
      <!-- Card Stacks and Board Size Dropdown on same row -->
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-4 justify-center flex-1">
          <CardDeck />
        </div>
        <BoardSizeDropdown :store="plantStore" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { usePlantStore } from '../../stores/plantStore';

const BoardSizeDropdown = defineAsyncComponent(() => import('../shared/BoardSizeDropdown.vue'));
const CardDeck = defineAsyncComponent(() => import('./CardDeck.vue'));

// Use the store directly instead of through props
const plantStore = usePlantStore();
</script>
