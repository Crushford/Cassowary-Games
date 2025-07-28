<template>
  <div
    class="h-dvh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Dialogue -->
    <Story class="h-[35%] flex-none" />

    <!-- HUD -->
    <GameHUD class="h-[10%] flex-none" />

    <!-- Grid -->
    <PlayGrid
      class="max-w-full aspect-square max-h-[45vh] overflow-hidden"
      :store="harvestStore"
      :enable-touch="true"
    >
      <template #default="{ rowIndex, colIndex, store }">
        <FarmSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
      </template>
    </PlayGrid>
    <!-- Tool Selector -->
    <ToolSelector class="h-[10%] flex-none border-t border-gray-700" />

    <!-- Modals -->
    <HarvestRulesModal :store="harvestStore" />
    <PuzzleCompletionModal :is-visible="harvestStore.isComplete" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, defineAsyncComponent } from 'vue';
import { useHarvestStore } from '../stores/harvestStore';

const Story = defineAsyncComponent(() => import('../components/shared/Story.vue'));
const GameHUD = defineAsyncComponent(() => import('../components/harvest-game/GameHUD.vue'));
const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const FarmSquare = defineAsyncComponent(() => import('../components/harvest-game/FarmSquare.vue'));
const ToolSelector = defineAsyncComponent(
  () => import('../components/harvest-game/ToolSelector.vue')
);
const HarvestRulesModal = defineAsyncComponent(
  () => import('../components/harvest-game/HarvestRulesModal.vue')
);
const PuzzleCompletionModal = defineAsyncComponent(
  () => import('../components/shared/PuzzleCompletionModal.vue')
);

const harvestStore = useHarvestStore();

onMounted(() => {
  // Load user configuration first
  harvestStore.loadUserConfiguration();

  harvestStore.findValidPuzzleWithSteps();
  harvestStore.loadHighScore();
  harvestStore.loadCurrentDay();

  // If we're at day 0, ensure we're in training mode
  if (harvestStore.currentDay === 0) {
    harvestStore.isTrainingDay = true;
  }

  // Show rules on first visit if user hasn't seen them before
  if (!harvestStore.hasSeenRules()) {
    harvestStore.showGameRules = true;
  }
});

// Watch for configuration changes and save them
watch(
  () => harvestStore.uiState.diggingMode,
  () => {
    harvestStore.saveUserConfiguration();
  }
);

watch(
  () => harvestStore.uiState.autoFlagging,
  () => {
    harvestStore.saveUserConfiguration();
  }
);

defineOptions({
  name: 'HarvestGame',
});
</script>
