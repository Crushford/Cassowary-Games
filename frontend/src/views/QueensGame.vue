<template>
  <!-- QueensGame -->
  <div class="h-svh w-full flex bg-gray-900 overflow-hidden">
    <div class="flex-shrink-0">
      <div
        class="h-svh w-full w-[480px] bg-gray-800 text-white flex flex-col overflow-hidden relative"
      >
        <!-- Puzzle Completion Modal -->
        <QueensCompletionModal :is-visible="queensStore.isComplete" />

        <!-- Game Info Display -->
        <div class="flex-none p-4">
          <div class="max-w-full">
            <QueensHeader />
            <div v-if="queensStore.isComplete" class="text-sm text-green-400 text-center mt-2">
              Puzzle Complete!
            </div>
            <div
              v-else-if="
                queensStore.queenPositions.length === queensStore.gridSize &&
                !queensStore.isValidPuzzleState.isValid
              "
              class="text-sm text-red-400 text-center mt-2"
            >
              {{ queensStore.isValidPuzzleState.errorMessage }}
            </div>
            <div v-else class="text-sm text-gray-400 text-center mt-2">
              Queens: {{ queensStore.queenPositions.length }}/{{ queensStore.gridSize }}
            </div>
          </div>
        </div>

        <!-- PlayGrid - Flex to fill available space with max-width constraint -->
        <div class="flex-1 flex items-center justify-center">
          <PlayGrid class="w-full max-w-full aspect-square" :store="queensStore">
            <template #default="{ rowIndex, colIndex, store }">
              <QueensSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
            </template>
          </PlayGrid>
        </div>

        <!-- Controls at the bottom -->
        <div class="flex-none p-4 space-y-3">
          <!-- Instructions -->
          <div class="text-center text-sm text-gray-400 mb-2">
            Click to place flag, click again to place queen
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 justify-center">
            <!-- Undo Button -->
            <button
              class="px-4 py-2 text-white font-semibold text-sm rounded-lg transition-colors duration-200 bg-gray-600 hover:bg-gray-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="queensStore.moveHistory.length === 0"
              @click="handleUndo"
            >
              Undo
            </button>

            <!-- Clear Button -->
            <button
              class="px-4 py-2 text-white font-semibold text-sm rounded-lg transition-colors duration-200 bg-red-600 hover:bg-red-500 cursor-pointer"
              @click="handleClear"
            >
              Clear
            </button>

            <!-- New Puzzle Button -->
            <button
              class="px-4 py-2 text-white font-semibold text-sm rounded-lg transition-colors duration-200 bg-blue-600 hover:bg-blue-700 cursor-pointer"
              @click="handleNewPuzzle"
            >
              New Puzzle
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { useQueensStore } from '../stores/queensStore';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../components/queens/QueensSquare.vue'));
const QueensHeader = defineAsyncComponent(() => import('../components/queens/QueensHeader.vue'));
const QueensCompletionModal = defineAsyncComponent(
  () => import('../components/queens/QueensCompletionModal.vue')
);

const queensStore = useQueensStore();

async function handleNewPuzzle() {
  // Reset game state
  queensStore.isComplete = false;
  queensStore.clearMarkers();

  // Load a new random puzzle
  await queensStore.loadRandomPuzzle();
}

function handleUndo() {
  queensStore.handleUndo();
}

function handleClear() {
  queensStore.clearAll();
}

onMounted(async () => {
  // Load a random puzzle
  await queensStore.loadRandomPuzzle();
});

defineOptions({
  name: 'QueensGame',
});
</script>
