<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <LevelHUD class="basis-[5%]" />

    <RulesPlaque class="basis-[30%]" />

    <!-- Grid area -->
    <PlayGrid class="w-full aspect-square max-h-[45%]" :store="roundStore" :enable-touch="true">
      <template #default="{ rowIndex, colIndex, store }">
        <CasinoSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
      </template>
    </PlayGrid>

    <!-- Tool Drawer at bottom -->
    <ToolDrawer class="basis-[10%] flex-none" />

    <!-- Round complete modal -->
    <RoundCompleteModal v-if="levelStore.showRoundComplete" />

    <!-- Rules modal -->
    <CasinoRulesModal />

    <!-- Farm size selection modal -->
    <LevelsSelectionModal v-if="!roundStore.boardSize" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGlobalStore } from '../stores/global';
import { useLevelStore } from '../stores/level';
import { useRoundStore } from '../stores/round';
import { defineAsyncComponent } from 'vue';

const LevelHUD = defineAsyncComponent(() => import('../components/harvest-game/LevelHUD.vue'));
const RulesPlaque = defineAsyncComponent(
  () => import('../components/harvest-game/RulesPlaque.vue')
);
const ToolDrawer = defineAsyncComponent(() => import('../components/casino/ToolDrawer.vue'));
const CasinoRulesModal = defineAsyncComponent(
  () => import('../components/casino/CasinoRulesModal.vue')
);
const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const CasinoSquare = defineAsyncComponent(() => import('../components/casino/CasinoSquare.vue'));
const RoundCompleteModal = defineAsyncComponent(
  () => import('../components/harvest-game/RoundCompleteModal.vue')
);
const LevelsSelectionModal = defineAsyncComponent(
  () => import('../components/harvest-game/LevelsSelectionModal.vue')
);

const router = useRouter();
const globalStore = useGlobalStore();
const levelStore = useLevelStore();
const roundStore = useRoundStore();

onMounted(async () => {
  // Rehydrate global store
  globalStore.rehydrate();

  // Load levels if not loaded
  if (!levelStore.loaded) {
    try {
      await levelStore.loadLevels();
    } catch (error) {
      console.error('Failed to load levels:', error);
    }
  }
});

onBeforeUnmount(async () => {
  if (roundStore.boardSize) {
    roundStore.leaveLevel();
  }
});

defineOptions({
  name: 'Levels',
});
</script>
