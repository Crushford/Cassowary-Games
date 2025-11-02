<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Game Info Display -->
    <div class="flex-none p-4 text-center space-y-2">
      <div class="flex justify-center items-center gap-6">
        <div class="text-2xl font-bold">
          <span class="text-gray-300">Turns: </span>
          <span :class="turnsRemaining === 0 ? 'text-red-500' : 'text-green-400'">
            {{ kenoStore.turnsRemaining }}
          </span>
          <span class="text-gray-500"> / {{ kenoStore.maxTurns }}</span>
        </div>
        <div class="text-2xl font-bold">
          <span class="text-gray-300">Honeypots: </span>
          <span class="text-yellow-400">{{ kenoStore.honeypotsFound }}</span>
        </div>
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
    <div class="flex-none p-4">
      <KenoControls />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, defineAsyncComponent } from 'vue';
import { useKenoStore } from '../stores/kenoStore';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const KenoSquare = defineAsyncComponent(() => import('../components/keno/KenoSquare.vue'));
const KenoControls = defineAsyncComponent(() => import('../components/keno/KenoControls.vue'));

const kenoStore = useKenoStore();

const turnsRemaining = computed(() => kenoStore.turnsRemaining);

onMounted(async () => {
  await kenoStore.loadRandomPuzzle();
});

defineOptions({
  name: 'KenoGame',
});
</script>
