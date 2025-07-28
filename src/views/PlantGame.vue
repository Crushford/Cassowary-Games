<template>
  <div
    class="h-dvh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Dialogue -->
    <Story class="h-[35%] flex-none" />

    <!-- Plant Tools - Reduced height -->
    <PlantTools class="h-[15%] flex-none" />

    <!-- PlayGrid - Flex to fill available space -->
    <PlayGrid class="w-full aspect-square max-h-[45vh]" :store="plantStore">
      <template #default="{ rowIndex, colIndex, store }">
        <PlantSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
      </template>
    </PlayGrid>

    <!-- Bottom Menu -->
    <BottomMenu class="h-[15%]" />

    <!-- Modals -->
    <PlantRulesModal />
    <PuzzleCompletionModal :is-visible="plantStore.isComplete" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { usePlantStore } from '../stores/plantStore';
import { useDialogueStore } from '../stores/dialogueStore';

const Story = defineAsyncComponent(() => import('../components/shared/Story.vue'));
const PlantTools = defineAsyncComponent(() => import('../components/plant-game/PlantTools.vue'));
const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const PlantSquare = defineAsyncComponent(() => import('../components/plant-game/PlantSquare.vue'));
const BottomMenu = defineAsyncComponent(() => import('../components/plant-game/BottomMenu.vue'));

const PlantRulesModal = defineAsyncComponent(
  () => import('../components/plant-game/PlantRulesModal.vue')
);
const PuzzleCompletionModal = defineAsyncComponent(
  () => import('../components/shared/PuzzleCompletionModal.vue')
);

const plantStore = usePlantStore();
const dialogueStore = useDialogueStore();

onMounted(() => {
  // Set the current game for dialogue actions
  dialogueStore.setCurrentGame('plant');

  plantStore.loadUserConfiguration();
});

defineOptions({
  name: 'PlantGame',
});
</script>
