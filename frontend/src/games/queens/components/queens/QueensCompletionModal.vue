<template>
  <Dialog :visible="isVisible" modal :closable="false" class="w-[min(92vw,28rem)]">
    <div>
      <h2 class="text-2xl font-bold text-semantic-success-400 mb-4">Puzzle Complete! 🎉</h2>
      <p class="text-semantic-neutral-400 mb-1">
        {{ queensStore.gridSize }}x{{ queensStore.gridSize }}
      </p>
      <p class="mb-4 text-sm leading-6 text-semantic-neutral-200">
        {{ queensStore.targetQueenCount }} queens, minimum distance of
        {{ queensStore.orthogonalMinDistance }} between queens in each row or column
      </p>

      <div
        v-if="isCampaignResultVisible"
        class="mb-4 rounded-xl border p-3"
        :class="
          queensStore.hasPassedCurrentCampaignLevel
            ? 'border-semantic-success-700 bg-semantic-success-500/10'
            : 'border-semantic-warning-700 bg-semantic-warning-500/10'
        "
      >
        <p
          class="text-sm font-semibold"
          :class="
            queensStore.hasPassedCurrentCampaignLevel
              ? 'text-semantic-success-300'
              : 'text-semantic-warning-200'
          "
        >
          {{
            queensStore.hasPassedCurrentCampaignLevel
              ? 'Level passed'
              : 'Level solved, but not passed yet'
          }}
        </p>
        <p class="mt-2 text-sm leading-6 text-semantic-neutral-200">
          {{
            queensStore.hasPassedCurrentCampaignLevel
              ? 'Nice. You beat the story target for this level.'
              : failureReasonMessage
          }}
        </p>
      </div>

      <!-- Completion Time -->
      <div v-if="queensStore.puzzleCompletionTime !== null" class="mb-4">
        <div class="p-3 bg-semantic-neutral-700 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-semantic-neutral-300 font-semibold">Your Time:</span>
            <span class="text-semantic-success-400 font-bold text-lg">{{
              queensStore.getFormattedPuzzleTime
            }}</span>
          </div>
          <div v-if="displayBestTime !== null" class="text-xs text-semantic-neutral-400">
            <span
              v-if="isLevelRecord"
              class="text-semantic-warning-400 font-semibold"
            >
              🏆 New Best Time!
            </span>
            <span v-else>
              Best Time: {{ queensStore.formatTime(displayBestTime) }}
            </span>
          </div>
          <div v-else class="text-xs text-semantic-neutral-400">
            {{ isCampaignResultVisible ? 'First clear for this level.' : 'First time for this size!' }}
          </div>
          <div v-if="isCampaignResultVisible" class="mt-2 text-xs text-semantic-neutral-300">
            Story target: {{ targetTimeLabel }}
          </div>
        </div>
      </div>

      <QueensActionMenu />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import { useQueensStore } from '../../stores/queensStore';
import { trackGameComplete } from '@/shared/utils/analyticsEvents';
import QueensActionMenu from './QueensActionMenu.vue';

const queensStore = useQueensStore();

const props = defineProps<{
  isVisible: boolean;
}>();

const isCampaignResultVisible = computed(
  () =>
    queensStore.isCampaignMode &&
    queensStore.currentCampaignBucket !== null &&
    queensStore.puzzleCompletionTime !== null
);

const targetTimeLabel = computed(() => {
  if (!queensStore.currentCampaignBucket) {
    return '';
  }
  return queensStore.formatTime(queensStore.getCampaignTargetTime(queensStore.currentCampaignBucket));
});

const displayBestTime = computed(() =>
  queensStore.isCampaignMode ? queensStore.currentCampaignLevelBestTime : queensStore.puzzleBestTime
);

const isLevelRecord = computed(() => {
  if (queensStore.puzzleCompletionTime === null || displayBestTime.value === null) {
    return false;
  }
  return Math.abs(queensStore.puzzleCompletionTime - displayBestTime.value) < 0.0001;
});

const failureReasonMessage = computed(() => {
  if (queensStore.hasUsedCampaignHintThisAttempt && !queensStore.allowCampaignHintPassForTesting) {
    return 'Hints were used on this attempt. Clear the level without hints to unlock the next one.';
  }
  return `Try again and finish in ${targetTimeLabel.value} or faster to unlock the next level.`;
});

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
</script>

<script lang="ts">
export default {
  name: 'QueensCompletionModal',
};
</script>
