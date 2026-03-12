<template>
  <Dialog :visible="isVisible" modal :closable="false" class="w-[min(92vw,28rem)]">
    <div>
      <h2 class="text-2xl font-bold text-semantic-success-400 mb-4">Puzzle Complete! 🎉</h2>
      <p class="text-white mb-4">Queens found: {{ queensStore.queenPositions.length }}</p>

      <!-- Completion Time -->
      <div v-if="queensStore.puzzleCompletionTime !== null" class="mb-4">
        <div class="p-3 bg-semantic-neutral-700 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-semantic-neutral-300 font-semibold">Your Time:</span>
            <span class="text-semantic-success-400 font-bold text-lg">{{
              queensStore.getFormattedPuzzleTime
            }}</span>
          </div>
          <div v-if="queensStore.puzzleBestTime !== null" class="text-xs text-semantic-neutral-400">
            <span
              v-if="queensStore.puzzleIsNewRecord"
              class="text-semantic-warning-400 font-semibold"
            >
              🏆 New Best Time!
            </span>
            <span v-else>
              Best Time: {{ queensStore.formatTime(queensStore.puzzleBestTime) }}
            </span>
          </div>
          <div v-else class="text-xs text-semantic-neutral-400">First time for this size!</div>
        </div>
      </div>

      <Button
        label="New Puzzle"
        class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-success-700 bg-semantic-success-700 text-semantic-info-50 enabled:hover:bg-semantic-success-600 enabled:hover:border-semantic-success-600 w-full"
        @click="handleNextPuzzle"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useQueensStore } from '../../stores/queensStore';
import { trackGameComplete } from '../../utils/analyticsEvents';

const queensStore = useQueensStore();

const props = defineProps<{
  isVisible: boolean;
}>();

watch(
  () => props.isVisible,
  (isVisible) => {
    if (!isVisible) {
      return;
    }

    trackGameComplete({
      game_name: 'queens',
      game_mode: queensStore.isTutorialMode
        ? 'tutorial'
        : queensStore.isSpeedMode
          ? 'speed'
          : 'standard',
      grid_size: queensStore.gridSize,
      puzzle_id:
        queensStore.currentPuzzleId === null ? undefined : String(queensStore.currentPuzzleId),
      completion_time_s: queensStore.puzzleCompletionTime ?? undefined,
      queens_found: queensStore.queenPositions.length,
      move_count: queensStore.moveHistory.length,
    });
  }
);

const handleNextPuzzle = async () => {
  try {
    await queensStore.startNextPuzzle();
  } catch (error) {
    console.error('Error loading next puzzle:', error);
  }
};
</script>

<script lang="ts">
export default {
  name: 'QueensCompletionModal',
};
</script>
