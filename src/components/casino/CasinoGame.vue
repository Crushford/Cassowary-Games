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

    <!-- End game modals -->
    <CasinoWinModal
      v-if="roundStore.status === 'won'"
      :final-gold="roundStore.tableStack"
      @restart="roundStore.restart()"
    />

    <CasinoBustModal v-if="roundStore.status === 'busted'" @restart="roundStore.restart()" />

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
const CasinoWinModal = defineAsyncComponent(() => import('./CasinoWinModal.vue'));
const CasinoBustModal = defineAsyncComponent(() => import('./CasinoBustModal.vue'));
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
  name: 'CasinoGame',
});
</script>
