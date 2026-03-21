<template>
  <!-- KenoGame -->
  <div
    class="h-svh w-full w-[480px] bg-semantic-neutral-800 text-white flex flex-col overflow-hidden"
    :class="{ shake: kenoStore.shouldShake }"
  >
    <!-- Game Info Display -->
    <div class="flex-none p-4">
      <div class="max-w-full">
        <KenoHeader />
        <div v-if="kenoStore.gameOver" class="text-sm text-semantic-warning-400 text-center mt-2">
          Game Over - All cards revealed!
        </div>
      </div>
    </div>

    <!-- PlayGrid - Flex to fill available space with max-width constraint -->
    <div class="flex-1 flex items-center justify-center">
      <PlayGrid class="w-full max-w-full aspect-square" :store="kenoStore">
        <template #default="{ rowIndex, colIndex, store }">
          <KenoSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
        </template>
      </PlayGrid>
    </div>

    <!-- Controls at the bottom -->
    <div class="flex-none p-4 space-y-3">
      <!-- Action Selector -->
      <ActionSelector :store="kenoStore" />

      <!-- End Turn Button - Always visible but disabled when no selections -->
      <div class="flex justify-center">
        <button
          class="px-6 py-3 text-white font-bold text-lg rounded-lg transition-colors duration-200 w-full max-w-xs"
          :class="
            kenoStore.canEndTurn
              ? 'bg-semantic-success-600 hover:bg-semantic-success-700 cursor-pointer'
              : 'bg-semantic-neutral-600 cursor-not-allowed opacity-50'
          "
          :disabled="!kenoStore.canEndTurn"
          @click="handleEndTurn"
        >
          End Turn
        </button>
      </div>
    </div>

    <!-- End of Round Modal -->
    <EndOfRoundModal :is-visible="kenoStore.roundComplete" />

    <!-- Toast Notification -->
    <Transition name="toast">
      <div
        v-if="kenoStore.showMaxReachedToast"
        class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-semantic-warning-600 text-white px-6 py-3 rounded-lg shadow-lg max-w-sm text-center"
      >
        <p class="font-semibold">Maximum selections reached!</p>
        <p class="text-sm mt-1">Click "End Turn" when ready.</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, defineAsyncComponent } from 'vue';
import { useKenoStore } from '../stores/kenoStore';
import { trackGameStart, trackGameComplete } from '@/shared/utils/analyticsEvents';

const PlayGrid = defineAsyncComponent(() => import('@/shared/components/PlayGrid.vue'));
const KenoSquare = defineAsyncComponent(() => import('../components/KenoSquare.vue'));
const KenoHeader = defineAsyncComponent(() => import('../components/KenoHeader.vue'));
const ActionSelector = defineAsyncComponent(() => import('../components/ActionSelector.vue'));
const EndOfRoundModal = defineAsyncComponent(() => import('../components/EndOfRoundModal.vue'));

const kenoStore = useKenoStore();

function handleEndTurn() {
  kenoStore.endTurn();
}

onMounted(async () => {
  await kenoStore.loadRandomPuzzle();
  trackGameStart({
    game_name: 'keno',
    game_mode: 'standard',
    grid_size: kenoStore.gridSize,
  });
});

watch(
  () => kenoStore.roundComplete,
  (roundComplete) => {
    if (!roundComplete) {
      return;
    }

    trackGameComplete({
      game_name: 'keno',
      game_mode: 'standard',
      grid_size: kenoStore.gridSize,
      turns_used: kenoStore.turnHistory.length,
      total_food: kenoStore.food,
      total_cassowaries: kenoStore.cassowaries,
    });
  }
);

defineOptions({
  name: 'KenoGame',
});
</script>

<style scoped>
/* Shake animation */
.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-10px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(10px);
  }
}

/* Toast transitions */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
