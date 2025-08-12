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

    <!-- Tool Drawer at bottom -->
    <ToolDrawer class="basis-[10%] flex-none" />

    <!-- Round complete modal -->
    <RoundCompleteModal v-if="tableStore.showRoundComplete" />

    <!-- Cap reached modal -->
    <CapReachedModal v-if="tableStore.status === 'capped'" />

    <!-- Rules modal -->
    <CasinoRulesModal />

    <!-- Cash-out summary modal -->
    <CashOutSummary v-if="tableStore.showCashOutSummary" />

    <!-- Tables selection modal -->
    <TablesSelectionModal v-if="!roundStore.tableId" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGlobalStore } from '../../stores/global';
import { useTableStore } from '../../stores/table';
import { useRoundStore } from '../../stores/round';
import { defineAsyncComponent } from 'vue';

const CasinoHUD = defineAsyncComponent(() => import('./CasinoHUD.vue'));
const ToolDrawer = defineAsyncComponent(() => import('./ToolDrawer.vue'));
const CasinoRulesModal = defineAsyncComponent(() => import('./CasinoRulesModal.vue'));
const PlayGrid = defineAsyncComponent(() => import('../shared/PlayGrid.vue'));
const CasinoSquare = defineAsyncComponent(() => import('./CasinoSquare.vue'));
const CashOutSummary = defineAsyncComponent(() => import('./CashOutSummary.vue'));
const CapReachedModal = defineAsyncComponent(() => import('./CapReachedModal.vue'));
const TablesSelectionModal = defineAsyncComponent(() => import('./TablesSelectionModal.vue'));
const RoundCompleteModal = defineAsyncComponent(() => import('./RoundCompleteModal.vue'));

const router = useRouter();
const globalStore = useGlobalStore();
const tableStore = useTableStore();
const roundStore = useRoundStore();

onMounted(async () => {
  // Rehydrate global store
  globalStore.rehydrate();

  // Load tables if not loaded
  if (!tableStore.loaded) {
    try {
      await tableStore.loadTables();
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }
});

// Watch for status changes to handle cap and cash-out
watch(
  () => tableStore.status,
  (newStatus) => {
    tableStore.handleStatusChange(newStatus);
  }
);

onBeforeUnmount(() => {
  tableStore.handleBeforeRouteLeave();
});

defineOptions({
  name: 'CasinoGame',
});
</script>
