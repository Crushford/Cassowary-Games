<template>
  <!-- KenoGame -->
  <div
    class="h-svh w-full w-[480px] bg-gray-800 text-white flex flex-col overflow-hidden relative"
    :class="{ shake: kenoStore.shouldShake }"
  >
    <!-- Game Info Display -->
    <div class="flex-none p-4">
      <div class="max-w-full">
        <KenoHeader />
        <div v-if="kenoStore.gameOver" class="text-sm text-yellow-400 text-center mt-2">
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
              ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
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
        class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-lg max-w-sm text-center"
      >
        <p class="font-semibold">Maximum selections reached!</p>
        <p class="text-sm mt-1">Click "End Turn" when ready.</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { useKenoStore } from '../stores/kenoStore';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const KenoSquare = defineAsyncComponent(() => import('../components/keno/KenoSquare.vue'));
const KenoHeader = defineAsyncComponent(() => import('../components/keno/KenoHeader.vue'));
const ActionSelector = defineAsyncComponent(() => import('../components/keno/ActionSelector.vue'));
const EndOfRoundModal = defineAsyncComponent(
  () => import('../components/keno/EndOfRoundModal.vue')
);

const kenoStore = useKenoStore();

function handleEndTurn() {
  kenoStore.endTurn();
}

onMounted(async () => {
  await kenoStore.loadRandomPuzzle();
});

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
