<template>
  <div
    class="h-dvh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Dialogue -->
    <Story class="h-[35%] flex-none" />

    <!-- HUD -->
    <GameHUD class="h-[10%] flex-none" />

    <!-- Grid -->
    <PlayGrid class="max-w-full aspect-square max-h-[45vh] overflow-hidden" />
    <!-- Tool Selector -->
    <ToolSelector class="h-[10%] flex-none border-t border-gray-700" />

    <!-- Completion Modal -->
    <GameCompletionModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useDialogueStore } from '../stores/dialogueStore';

const Story = defineAsyncComponent(() => import('../components/gameplay/Story.vue'));
const GameHUD = defineAsyncComponent(() => import('../components/gameplay/GameHUD.vue'));
const PlayGrid = defineAsyncComponent(() => import('../components/gameplay/PlayGrid.vue'));
const ToolSelector = defineAsyncComponent(() => import('../components/gameplay/ToolSelector.vue'));
const GameCompletionModal = defineAsyncComponent(
  () => import('../components/gameplay/GameCompletionModal.vue')
);

const gameStore = useGameStore();

onMounted(() => {
  gameStore.findValidPuzzleWithSteps();
  gameStore.loadHighScore();
  gameStore.loadCurrentDay();

  // If we're at day 0, ensure we're in training mode
  if (gameStore.currentDay === 0) {
    gameStore.isTrainingDay = true;
  }
});

defineOptions({
  name: 'GameMode',
});
</script>
