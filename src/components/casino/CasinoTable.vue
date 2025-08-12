<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <CasinoHUD class="basis-[15%]" />

    <!-- Grid area -->

    <PlayGrid class="w-full aspect-square max-h-[45%]" :store="roundStore" :enable-touch="true">
      <template #default="{ rowIndex, colIndex, store }">
        <CasinoSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
      </template>
    </PlayGrid>

    <!-- End banners -->
    <div
      v-if="roundStore.status === 'won'"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
    >
      <div class="bg-green-800 text-white p-8 rounded-lg text-center">
        <h2 class="text-2xl font-bold mb-4">Solved! Final gold: {{ roundStore.tableStack }}.</h2>
        <button
          @click="roundStore.restart()"
          class="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
        >
          Restart
        </button>
      </div>
    </div>

    <div
      v-if="roundStore.status === 'busted'"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
    >
      <div class="bg-red-800 text-white p-8 rounded-lg text-center">
        <h2 class="text-2xl font-bold mb-4">Out of gold.</h2>
        <button
          @click="roundStore.restart()"
          class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
        >
          Restart
        </button>
      </div>
    </div>

    <!-- Rules modal -->
    <CasinoRulesModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { useGlobalStore } from '../../stores/global';
import { useRoundStore } from '../../stores/round';

const CasinoHUD = defineAsyncComponent(() => import('./CasinoHUD.vue'));
const CasinoRulesModal = defineAsyncComponent(() => import('./CasinoRulesModal.vue'));
const PlayGrid = defineAsyncComponent(() => import('../shared/PlayGrid.vue'));
const CasinoSquare = defineAsyncComponent(() => import('./CasinoSquare.vue'));

const globalStore = useGlobalStore();
const roundStore = useRoundStore();

onMounted(() => {
  // Rehydrate global store
  globalStore.rehydrate();

  // Start round if not active
  if (roundStore.status !== 'playing' || roundStore.grid.length === 0) {
    roundStore.startRound();
  }
});

defineOptions({
  name: 'CasinoTable',
});
</script>
