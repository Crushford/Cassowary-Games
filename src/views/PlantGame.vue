<template>
  <div
    class="h-dvh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Dialogue -->
    <Story class="h-[35%] flex-none" />

    <!-- Modals -->
    <RulesModal :is-visible="plantStore.showGameRules" @close="plantStore.showGameRules = false" />
    <PuzzleCompletionModal :is-visible="plantStore.isComplete" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { usePlantStore } from '../stores/plantStore';

const Story = defineAsyncComponent(() => import('../components/gameplay/Story.vue'));

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
