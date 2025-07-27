<template>
  <div
    class="h-dvh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Dialogue -->
    <Story class="h-[35%] flex-none" />

    <!-- Game area -->
    <div class="flex-1 bg-gray-700 p-4">
      <PlayGrid :store="plantStore">
        <template #default="{ cell, rowIndex, colIndex, store }">
          <PlantSquare :cell="cell" :row-index="rowIndex" :col-index="colIndex" :store="store" />
        </template>
      </PlayGrid>
    </div>

    <!-- Tools -->
    <PlantTools :plant-store="plantStore" />

    <!-- Modals -->
    <RulesModal :is-visible="plantStore.showGameRules" @close="plantStore.showGameRules = false" />
    <PuzzleCompletionModal :is-visible="plantStore.isComplete" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { usePlantStore } from '../stores/plantStore';

const Story = defineAsyncComponent(() => import('../components/gameplay/Story.vue'));
const PlantTools = defineAsyncComponent(() => import('../components/gameplay/PlantTools.vue'));
const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const PlantSquare = defineAsyncComponent(() => import('../components/gameplay/PlantSquare.vue'));

const RulesModal = defineAsyncComponent(() => import('../components/gameplay/RulesModal.vue'));
const PuzzleCompletionModal = defineAsyncComponent(
  () => import('../components/gameplay/PuzzleCompletionModal.vue')
);

const plantStore = usePlantStore();

onMounted(() => {
  plantStore.loadUserConfiguration();

  if (!plantStore.hasSeenRules()) {
    plantStore.showGameRules = true;
  }
});

defineOptions({
  name: 'PlantGame',
});
</script>
