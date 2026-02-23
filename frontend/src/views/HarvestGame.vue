<template>
  <div
    :class="[
      'w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden',
      isGameOnly ? 'h-auto' : 'h-dvh',
    ]"
  >
    <!-- Dialogue -->
    <Story v-if="!isGameOnly" class="basis-[35%] flex-none" />

    <!-- HUD -->
    <GameHUD v-if="!isGameOnly" class="basis-[10%] flex-none" />

    <!-- Grid -->
    <PlayGrid
      :class="isGameOnly ? 'aspect-square' : 'aspect-square max-h-[45%] max-w-full'"
      :store="harvestStore"
      :enable-touch="true"
    >
      <template #default="{ rowIndex, colIndex, store }">
        <FarmSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
      </template>
    </PlayGrid>

    <!-- Tool Selector -->
    <ToolSelector
      :is-game-only="isGameOnly"
      class="basis-[10%] flex-none border-t border-gray-700"
    />

    <!-- Modals -->
    <HarvestRulesModal v-if="!isGameOnly" :store="harvestStore" />
    <PuzzleCompletionModal v-if="!isGameOnly" :is-visible="harvestStore.isComplete" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, defineAsyncComponent } from 'vue';
import { useHarvestStore } from '../stores/harvestStore';
import { useDialogueStore } from '../stores/dialogueStore';
import { trackGameComplete, trackGameStart } from '../utils/analyticsEvents';

interface Props {
  isGameOnly?: boolean;
  puzzleData?: any;
}

const props = withDefaults(defineProps<Props>(), {
  isGameOnly: false,
  puzzleData: undefined,
});

const Story = defineAsyncComponent(() => import('../components/shared/Story.vue'));
const GameHUD = defineAsyncComponent(() => import('../components/harvest-game/GameHUD.vue'));
const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const FarmSquare = defineAsyncComponent(() => import('../components/harvest-game/FarmSquare.vue'));
const ToolSelector = defineAsyncComponent(
  () => import('../components/harvest-game/ToolSelector.vue')
);
const HarvestRulesModal = defineAsyncComponent(
  () => import('../components/harvest-game/HarvestRulesModal.vue')
);
const PuzzleCompletionModal = defineAsyncComponent(
  () => import('../components/shared/PuzzleCompletionModal.vue')
);

const harvestStore = useHarvestStore();
const dialogueStore = useDialogueStore();

onMounted(() => {
  // Set the current game for dialogue actions
  dialogueStore.setCurrentGame('harvest');

  // Load user configuration first
  harvestStore.loadUserConfiguration();

  // In game-only mode, enable auto-flagging by default
  if (props.isGameOnly) {
    harvestStore.uiState.autoFlagging = true;
  }

  // If puzzle data is provided, load it instead of finding a random puzzle
  if (props.puzzleData) {
    harvestStore.parsePuzzleData(props.puzzleData);
  } else {
    harvestStore.findValidPuzzleWithSteps();
  }

  // Only load high score and current day if not in game-only mode
  if (!props.isGameOnly) {
    harvestStore.loadHighScore();
    harvestStore.loadCurrentDay();

    // If we're at day 0, ensure we're in training mode
    if (harvestStore.currentDay === 0) {
      harvestStore.isTrainingDay = true;
    }

    // Show rules on first visit if user hasn't seen them before
    if (!harvestStore.hasSeenRules()) {
      harvestStore.showGameRules = true;
    }
  }

  trackGameStart({
    game_name: 'harvest',
    game_mode: props.isGameOnly ? 'puzzle_only' : 'campaign',
    grid_size: harvestStore.gridSize,
    day_number: props.isGameOnly ? undefined : harvestStore.currentDay,
    is_training_day: props.isGameOnly ? undefined : harvestStore.isTrainingDay,
  });
});

// Watch for configuration changes and save them
watch(
  () => harvestStore.uiState.diggingMode,
  () => {
    harvestStore.saveUserConfiguration();
  }
);

watch(
  () => harvestStore.uiState.autoFlagging,
  () => {
    harvestStore.saveUserConfiguration();
  }
);

watch(
  () => harvestStore.isComplete,
  (isComplete) => {
    if (!isComplete) {
      return;
    }

    trackGameComplete({
      game_name: 'harvest',
      game_mode: props.isGameOnly ? 'puzzle_only' : 'campaign',
      grid_size: harvestStore.gridSize,
      day_number: harvestStore.currentDay,
      is_training_day: harvestStore.isTrainingDay,
      honey_pots: harvestStore.honeyPots,
      bites: harvestStore.bites,
    });
  }
);

defineOptions({
  name: 'HarvestGame',
});
</script>
