<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Game Info Display -->
    <div class="flex-none p-4 text-center space-y-2">
      <div class="flex justify-center items-center gap-6">
        <div class="text-2xl font-bold">
          <span class="text-gray-300">Turn: </span>
          <span class="text-green-400">{{ kenoStore.currentTurn }}</span>
          <span class="text-gray-500"> / {{ kenoStore.maxTurns }}</span>
        </div>
        <div class="text-2xl font-bold">
          <span class="text-gray-300">Coins: </span>
          <span class="text-yellow-400">🪙 {{ kenoStore.coins }}</span>
        </div>
      </div>
      <div class="text-lg">
        <span class="text-gray-300">Turn {{ kenoStore.currentTurn }}: Must select </span>
        <span class="text-yellow-400 font-bold">{{ kenoStore.requiredSelections }}</span>
        <span class="text-gray-300"> squares</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-300">Selected: </span>
        <span class="text-green-400 font-bold"
          >{{ kenoStore.selectedCount }} / {{ kenoStore.requiredSelections }}</span
        >
      </div>
      <div v-if="kenoStore.gameOver" class="text-lg text-yellow-400">
        Game Over - All cards revealed!
      </div>
    </div>

    <!-- PlayGrid - Flex to fill available space with max-width constraint -->
    <div class="flex-1 flex items-center justify-center overflow-hidden px-4 pb-4">
      <PlayGrid class="w-full max-w-full aspect-square" :store="kenoStore">
        <template #default="{ rowIndex, colIndex, store }">
          <KenoSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
        </template>
      </PlayGrid>
    </div>

    <!-- Controls at the bottom -->
    <div class="flex-none p-4 space-y-3">
      <!-- Complete Round Button -->
      <div v-if="kenoStore.canCompleteRound" class="flex justify-center">
        <button
          class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-colors duration-200 w-full max-w-xs"
          @click="handleCompleteRound"
        >
          Complete Round
        </button>
      </div>
      <KenoControls />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { useKenoStore } from '../stores/kenoStore';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const KenoSquare = defineAsyncComponent(() => import('../components/keno/KenoSquare.vue'));
const KenoControls = defineAsyncComponent(() => import('../components/keno/KenoControls.vue'));

const kenoStore = useKenoStore();

function handleCompleteRound() {
  kenoStore.completeRound();
}

onMounted(async () => {
  await kenoStore.loadRandomPuzzle();
});

defineOptions({
  name: 'KenoGame',
});
</script>
