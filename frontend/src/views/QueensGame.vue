<template>
  <!-- QueensGame -->
  <div
    class="w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden h-dvh"
  >
    <!-- Puzzle Completion Modal -->
    <QueensCompletionModal v-if="!queensStore.isSpeedMode" :is-visible="queensStore.isComplete" />

    <!-- Speed Mode Completion Modal -->
    <SpeedModeCompletionModal :is-visible="showSpeedModeCompletionModal" />

    <!-- Tutorial Toast -->
    <Toast
      v-if="
        queensStore.isTutorialMode && queensStore.tutorialInstruction && !queensStore.errorMessage
      "
      :message="queensStore.tutorialInstruction"
      :should-shake="queensStore.shouldShakeToast"
      id="tutorial-instruction"
      role="alert"
      aria-live="polite"
    />

    <!-- Error Toast -->
    <Toast
      v-if="queensStore.errorMessage"
      :message="queensStore.errorMessage"
      :should-shake="shouldShakeErrorToast"
      id="error-message"
      role="alert"
      aria-live="assertive"
      variant="error"
    />

    <!-- Tutorial Overlay -->
    <TutorialOverlay
      :is-visible="queensStore.isTutorialMode && queensStore.highlightToolSelector"
      :highlight-tool-selector="queensStore.highlightToolSelector"
    />

    <!-- Game Info Display -->
    <div class="flex-none p-2">
      <div class="max-w-full">
        <component :is="headerComponents[queensStore.currentMode]" />
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
      </div>
    </div>

    <!-- PlayGrid - Flex to fill available space with max-width constraint -->
    <div class="flex-1 flex items-center justify-center">
      <PlayGrid
        class="w-full max-w-full aspect-square"
        :style="boardAnimationStyle"
        :store="queensStore"
        :enable-touch="true"
        @swipe-start="queensStore.onSwipeStart"
        @swipe-end="queensStore.onSwipeEnd"
      >
        <template #default="{ rowIndex, colIndex, store }">
          <QueensSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
        </template>
      </PlayGrid>
    </div>

    <!-- Controls at the bottom -->
    <div class="flex-none p-4 space-y-3">
      <!-- Tool Selector -->
      <QueensToolSelector :is-disabled="isModalOpen" />

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
          Main Menu
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  watch,
  defineAsyncComponent,
  ref,
  computed,
  nextTick,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueensStore, type TutorialStep } from '../stores/queensStore';
import { useSpeedModeStore } from '../stores/speedModeStore';
import type { Pos } from '../types/types';
import { trackGameStart } from '../utils/analyticsEvents';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../components/queens/QueensSquare.vue'));
const QueensHeader = defineAsyncComponent(() => import('../components/queens/QueensHeader.vue'));
const SpeedModeHeader = defineAsyncComponent(
  () => import('../components/queens/SpeedModeHeader.vue')
);
const RotateModeHeader = defineAsyncComponent(
  () => import('../components/queens/RotateModeHeader.vue')
);
const QueensCompletionModal = defineAsyncComponent(
  () => import('../components/queens/QueensCompletionModal.vue')
);
const SpeedModeCompletionModal = defineAsyncComponent(
  () => import('../components/queens/SpeedModeCompletionModal.vue')
);
const Toast = defineAsyncComponent(() => import('../components/shared/Toast.vue'));
const QueensToolSelector = defineAsyncComponent(
  () => import('../components/queens/QueensToolSelector.vue')
);
const TutorialOverlay = defineAsyncComponent(
  () => import('../components/queens/TutorialOverlay.vue')
);

const route = useRoute();
const router = useRouter();
const queensStore = useQueensStore();
const speedModeStore = useSpeedModeStore();

const shouldShakeErrorToast = ref(false);

// Header component map
const headerComponents = {
  standard: QueensHeader,
  speed: SpeedModeHeader,
  rotate: RotateModeHeader,
} as const;

// Board rotation animation
const boardRotationDeg = ref(0);
const boardAnimating = ref(false);

const boardAnimationStyle = computed(() => {
  if (!queensStore.isRotateMode) return {};
  return {
    transform: `rotate(${boardRotationDeg.value}deg)`,
    transition: boardAnimating.value ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
  };
});

// Animate a clockwise spin when the board rotates in rotate mode.
// Strategy: after data updates (new rotated state), instantly position the board at -90°
// so it visually looks like the old state — then smoothly transition to 0° (CW spin).
watch(
  () => queensStore.boardRotationCount,
  async (newVal, oldVal) => {
    if (!queensStore.isRotateMode) return;
    // Only animate for a genuine 90° CW step, not for resets on new puzzle load
    if (newVal !== (oldVal + 1) % 4) return;

    boardAnimating.value = false;
    boardRotationDeg.value = -90;

    await nextTick();

    requestAnimationFrame(() => {
      boardAnimating.value = true;
      boardRotationDeg.value = 0;
    });
  }
);

// Reset animation state when rotate mode ends
watch(
  () => queensStore.isRotateMode,
  (active) => {
    if (!active) {
      boardAnimating.value = false;
      boardRotationDeg.value = 0;
    }
  }
);

// Watch for error message changes and trigger shake
watch(
  () => queensStore.errorMessage,
  (newMessage, oldMessage) => {
    if (newMessage && !oldMessage) {
      // Error just appeared, trigger shake
      shouldShakeErrorToast.value = true;
      setTimeout(() => {
        shouldShakeErrorToast.value = false;
      }, 500);
    }
  }
);

const showSpeedModeCompletionModal = computed(() => {
  return queensStore.isSpeedMode && speedModeStore.timeRemaining === 0;
});

const isModalOpen = computed(() => {
  return showSpeedModeCompletionModal.value || (!queensStore.isSpeedMode && queensStore.isComplete);
});

async function loadPuzzleFromRoute() {
  const puzzleId = route.params.puzzleId as string;
  const levelName = route.params.levelName as string;

  // Check if this is a tutorial puzzle
  if (levelName) {
    try {
      await queensStore.loadTutorialPuzzle(levelName);
      // Initialize tutorial steps
      initializeTutorialSteps(levelName);
      trackGameStart({
        game_name: 'queens',
        game_mode: 'tutorial',
        grid_size: queensStore.gridSize,
        puzzle_id: levelName,
      });
    } catch (err) {
      console.error('[QueensGame] Error loading tutorial puzzle:', err);
      // Redirect to levels page if puzzle not found
      router.push('/queens');
    }
  } else if (puzzleId) {
    try {
      // Exit tutorial mode if switching to regular puzzle
      if (queensStore.isTutorialMode) {
        queensStore.exitTutorialMode();
      }
      await queensStore.loadPuzzleById(puzzleId);
      trackGameStart({
        game_name: 'queens',
        game_mode: queensStore.isSpeedMode ? 'speed' : 'standard',
        grid_size: queensStore.gridSize,
        puzzle_id:
          queensStore.currentPuzzleId === null ? undefined : String(queensStore.currentPuzzleId),
      });
    } catch (err) {
      console.error('[QueensGame] Error loading puzzle:', err);
      // Redirect to levels page if puzzle not found
      router.push('/queens');
    }
  } else {
    // If no puzzleId, redirect to levels page
    router.push('/queens');
  }
}

async function handleNewPuzzle() {
  // Reset speed mode if active
  if (queensStore.isSpeedMode) {
    speedModeStore.reset();
  }
  // Exit tutorial mode if active
  if (queensStore.isTutorialMode) {
    queensStore.exitTutorialMode();
  }
  // Reset rotate mode if active
  if (queensStore.isRotateMode) {
    queensStore.resetRotateMode();
  }
  // Navigate back to levels page
  router.push('/queens');
}

function handleUndo() {
  queensStore.handleUndo();
}

function handleClear() {
  queensStore.clearAll();
}

function initializeTutorialSteps(levelName: string) {
  // Get solution queens for the current puzzle
  const solutionQueens = queensStore.solutionQueenPositions;

  if (levelName === 'level-1' && solutionQueens.length > 0) {
    // Find colors that have only one square
    const colorCounts = new Map<string, Pos[]>();

    // Count squares per color
    for (let row = 0; row < queensStore.gridSize; row++) {
      for (let col = 0; col < queensStore.gridSize; col++) {
        const square = queensStore.grid[row][col];
        if (square.groupColor) {
          if (!colorCounts.has(square.groupColor)) {
            colorCounts.set(square.groupColor, []);
          }
          colorCounts.get(square.groupColor)!.push({ row, col });
        }
      }
    }

    // Find colors with only one square
    const singleSquareColors: Pos[] = [];
    colorCounts.forEach((positions, color) => {
      if (positions.length === 1) {
        singleSquareColors.push(positions[0]);
      }
    });

    // Sort by row, then column for consistent ordering
    singleSquareColors.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    // Find the last queen (the one that's not in single-square colors)
    const singleSquareSet = new Set(singleSquareColors.map((pos) => `${pos.row},${pos.col}`));
    const lastQueen = solutionQueens.find(
      (queen) => !singleSquareSet.has(`${queen.row},${queen.col}`)
    );

    const steps: TutorialStep[] = [
      {
        id: 'select-queen-mode',
        instruction:
          'First, change your placement mode to "Queen". Click the "Queen" button in the tool selector below. This button has a crown icon 👑. For screen reader users: navigate to the Queen button in the tool selector and activate it.',
        action: 'mode-selected',
        targetSquare: null,
      },
      {
        id: 'explanation',
        instruction:
          'Each color group has exactly one queen. So if there is only one square of a color, it will always be a queen. Now you can place queens directly by clicking on squares.',
        action: undefined,
        targetSquare: null,
      },
    ];

    // Add steps for each single-square color
    for (let i = 0; i < singleSquareColors.length; i++) {
      const square = singleSquareColors[i];
      steps.push({
        id: `place-queen-${i + 1}`,
        instruction: `Place a queen on a square with a single-square color. If you click the wrong square, a red X will appear and you should click the Undo button to undo your mistake.`,
        action: 'place-queen',
        targetSquare: null, // Don't check specific square, check if it's a solution queen
      });

      // After placing the first queen, add explanation step
      if (i === 0) {
        steps.push({
          id: `explain-rules-${i + 1}`,
          instruction:
            'Great! You placed a queen. Notice the flags that appeared automatically? These show squares where queens cannot be placed. The rules are: no queens ever touch diagonally, and there is only ever one per row and per column. You can toggle automatic flagging with the control below.',
          action: undefined,
          targetSquare: null,
        });
      }
    }

    // Add step after 3 queens are placed
    steps.push({
      id: 'three-queens-placed',
      instruction:
        'Now that you have cleared the rest of the board, it should be clear where the last remaining queen should be placed.',
      action: undefined,
      targetSquare: null,
    });

    // Add step for the last queen
    if (lastQueen) {
      steps.push({
        id: 'place-last-queen',
        instruction: `Now place the last queen. Click on the square where it should go.`,
        action: 'place-queen',
        targetSquare: null, // Allow any valid square, but check if it's a solution queen
      });
    }

    steps.push({
      id: 'complete',
      instruction: "Great! You've placed all queens. The puzzle is complete!",
      action: 'complete',
      targetSquare: null,
    });

    // For the first part, only allow single-square colors
    // For the last queen, allow any valid square (will be updated when step changes)
    queensStore.initializeTutorial(steps);
  } else {
    // For other levels, create basic tutorial steps
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        instruction: `Welcome to ${levelName}! Place ${queensStore.gridSize} queens so they don't attack each other.`,
        action: undefined,
        targetSquare: null,
      },
    ];
    queensStore.initializeTutorial(steps);
  }
}

onMounted(async () => {
  await loadPuzzleFromRoute();
});

// Watch for route changes (e.g., when navigating between puzzles)
watch(
  () => [route.params.puzzleId, route.params.levelName],
  async () => {
    await loadPuzzleFromRoute();
  }
);

// Cleanup speed mode timer, rotate mode, and error checking on unmount
onBeforeUnmount(() => {
  if (queensStore.isSpeedMode) {
    speedModeStore.end();
  }
  if (queensStore.isRotateMode) {
    queensStore.resetRotateMode();
  }
  queensStore.stopErrorChecking();
  queensStore.stopProgressSaving();
});

defineOptions({
  name: 'QueensGame',
});
</script>
