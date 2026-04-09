<template>
  <!-- QueensGame -->
  <div
    class="relative w-full max-w-[480px] mx-auto bg-semantic-neutral-950 text-semantic-neutral-100 bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-queens-gradientStart to-queens-gradientEnd flex flex-col overflow-hidden h-dvh"
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
      id="tutorial-instruction"
      :message="queensStore.tutorialInstruction"
      :should-shake="queensStore.shouldShakeToast"
      role="alert"
      aria-live="polite"
    />

    <!-- Error Toast -->
    <Toast
      v-if="queensStore.errorMessage"
      id="error-message"
      :message="queensStore.errorMessage"
      :should-shake="shouldShakeErrorToast"
      role="alert"
      aria-live="assertive"
      variant="error"
    />

    <!-- Tutorial Overlay -->
    <TutorialOverlay
      :is-visible="queensStore.isTutorialMode && queensStore.highlightToolSelector"
      :highlight-tool-selector="queensStore.highlightToolSelector"
    />

    <div
      v-if="isRouteLoading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-surface-overlay backdrop-blur-sm"
    >
      <div
        class="flex flex-col items-center gap-3 rounded-2xl border border-semantic-neutral-700 bg-surface-darkSoft px-6 py-5 text-center shadow-xl"
      >
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-semantic-neutral-700 border-t-semantic-info-400"
          aria-hidden="true"
        ></div>
        <div class="text-sm font-semibold text-semantic-neutral-100">Loading puzzle...</div>
      </div>
    </div>

    <!-- Game Info Display -->
    <div class="flex-none p-2">
      <div class="max-w-full">
        <QueensGameHeader />
        <div
          v-if="queensStore.isComplete"
          class="text-sm text-semantic-success-400 text-center mt-2"
        >
          Puzzle Complete!
        </div>
        <div
          v-else-if="
            queensStore.queenPositions.length === queensStore.targetQueenCount &&
            !queensStore.isValidPuzzleState.isValid
          "
          class="text-sm text-semantic-danger-400 text-center mt-2"
        >
          {{ queensStore.isValidPuzzleState.errorMessage }}
        </div>
      </div>
    </div>

    <!-- Board stack -->
    <div class="flex-1 flex flex-col justify-center px-4 pb-2">
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

      <div class="mt-3 flex items-center justify-center gap-2">
        <Button
          label="Undo"
          unstyled
          class="h-9 rounded-xl border !min-w-0 px-2.5 !py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-warning-700 bg-semantic-warning-800 text-semantic-warning-100 enabled:hover:bg-semantic-warning-700 enabled:hover:border-semantic-warning-600"
          :disabled="queensStore.moveHistory.length === 0"
          aria-label="Undo last move"
          @click="handleUndo"
        />
        <Button
          label="Clear"
          unstyled
          class="h-9 rounded-xl border !min-w-0 px-2.5 !py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px border-semantic-danger-800 bg-semantic-danger-900 text-semantic-danger-100 enabled:hover:bg-semantic-danger-800 enabled:hover:border-semantic-danger-700"
          aria-label="Clear all marks from the board"
          @click="handleClear"
        />
      </div>
    </div>

    <!-- Controls at the bottom -->
    <div class="flex-none p-4 space-y-3">
      <QueensActionMenu compact />
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
import Button from 'primevue/button';
import { useRoute, useRouter } from 'vue-router';
import { useQueensStore, type TutorialStep } from '../stores/queensStore';
import { useSpeedModeStore } from '../stores/speedModeStore';
import type { Pos } from '../types/types';
import { trackGameStart } from '@/shared/utils/analyticsEvents';
import {
  buildQueensSelectionRoute,
  isQueensSelectionDifficulty,
} from '../utils/puzzleSelectionRoute';

const PlayGrid = defineAsyncComponent(() => import('@/shared/components/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../components/queens/QueensSquare.vue'));
const QueensGameHeader = defineAsyncComponent(
  () => import('../components/queens/QueensGameHeader.vue')
);
const QueensCompletionModal = defineAsyncComponent(
  () => import('../components/queens/QueensCompletionModal.vue')
);
const SpeedModeCompletionModal = defineAsyncComponent(
  () => import('../components/queens/SpeedModeCompletionModal.vue')
);
const Toast = defineAsyncComponent(() => import('@/shared/components/Toast.vue'));
const QueensActionMenu = defineAsyncComponent(
  () => import('../components/queens/QueensActionMenu.vue')
);
const TutorialOverlay = defineAsyncComponent(
  () => import('../components/queens/TutorialOverlay.vue')
);

const route = useRoute();
const router = useRouter();
const queensStore = useQueensStore();
const speedModeStore = useSpeedModeStore();

const shouldShakeErrorToast = ref(false);
const isRouteLoading = ref(false);

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
  isRouteLoading.value = true;
  const puzzleId = route.params.puzzleId as string;
  const levelName = route.params.levelName as string;
  const encodedLayout = route.params.encodedLayout as string;
  const sizeKey = route.params.sizeKey as string | undefined;
  const routeOrthogonalMinDistance = route.params.orthogonalMinDistance as string | undefined;
  const routeDifficultyParam = route.params.difficulty as string | undefined;
  const selectedPuzzleId = route.params.selectedPuzzleId as string | undefined;
  const routeTargetQueenCount =
    typeof route.query.targetQueenCount === 'string' ? route.query.targetQueenCount : undefined;
  const routeMinimumGroupSize =
    typeof route.query.minimumGroupSize === 'string' ? route.query.minimumGroupSize : undefined;

  try {
    // Check if this is a tutorial puzzle
    if (levelName) {
      await queensStore.loadTutorialPuzzle(levelName);
      initializeTutorialSteps(levelName);
      trackGameStart({
        game_name: 'queens',
        game_mode: 'tutorial',
        grid_size: queensStore.gridSize,
        puzzle_id: levelName,
      });
      return;
    }

    if (encodedLayout) {
      if (queensStore.isTutorialMode) {
        queensStore.exitTutorialMode();
      }
      await queensStore.loadPuzzleFromEncodedLayout(encodedLayout, {
        persistProgress: false,
      });
      trackGameStart({
        game_name: 'queens',
        game_mode: 'standard',
        grid_size: queensStore.gridSize,
        puzzle_id: 'url-preview',
      });
      return;
    }

    if (sizeKey && routeOrthogonalMinDistance) {
      if (queensStore.isTutorialMode) {
        queensStore.exitTutorialMode();
      }

      const orthogonalMinDistance = Number.parseInt(routeOrthogonalMinDistance, 10);
      if (!Number.isFinite(orthogonalMinDistance)) {
        router.push('/queens');
        return;
      }

      if (!queensStore.puzzleDatabase) {
        const success = await queensStore.loadPuzzleDatabase();
        if (!success) {
          router.push('/queens');
          return;
        }
      }

      const difficulty = isQueensSelectionDifficulty(routeDifficultyParam)
        ? routeDifficultyParam
        : undefined;
      const targetQueenCount =
        routeTargetQueenCount != null ? Number.parseInt(routeTargetQueenCount, 10) : undefined;
      const minimumGroupSize =
        routeMinimumGroupSize != null ? Number.parseInt(routeMinimumGroupSize, 10) : undefined;

      if (targetQueenCount != null && !Number.isFinite(targetQueenCount)) {
        router.push('/queens');
        return;
      }

      if (minimumGroupSize != null && !Number.isFinite(minimumGroupSize)) {
        router.push('/queens');
        return;
      }

      let selectedPuzzle =
        selectedPuzzleId != null
          ? (queensStore
              .getPuzzlesForSelection(
                sizeKey,
                orthogonalMinDistance,
                difficulty,
                targetQueenCount,
                minimumGroupSize
              )
              .find((puzzle) => String(puzzle.id) === selectedPuzzleId) ?? null)
          : null;

      if (!selectedPuzzle) {
        selectedPuzzle = queensStore.getRandomPuzzleForSelection(
          sizeKey,
          orthogonalMinDistance,
          difficulty,
          targetQueenCount,
          minimumGroupSize
        );
      }

      if (!selectedPuzzle) {
        router.push({
          path: '/queens',
          query: {
            mode: 'single',
            size: sizeKey,
            distance: String(orthogonalMinDistance),
            ...(targetQueenCount != null ? { targetQueenCount: String(targetQueenCount) } : {}),
            ...(minimumGroupSize != null ? { minimumGroupSize: String(minimumGroupSize) } : {}),
            ...(difficulty ? { difficulty } : {}),
          },
        });
        return;
      }

      if (selectedPuzzleId == null || String(selectedPuzzle.id) !== selectedPuzzleId) {
        router.replace(
          buildQueensSelectionRoute({
            sizeKey,
            orthogonalMinDistance,
            difficulty,
            puzzleId: selectedPuzzle.id,
            targetQueenCount,
            minimumGroupSize,
          })
        );
      }

      await queensStore.loadPuzzleById(selectedPuzzle.id);
      trackGameStart({
        game_name: 'queens',
        game_mode: queensStore.isSpeedMode ? 'speed' : 'standard',
        grid_size: queensStore.gridSize,
        puzzle_id:
          queensStore.currentPuzzleId === null ? undefined : String(queensStore.currentPuzzleId),
      });
      return;
    }

    if (puzzleId) {
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
      return;
    }

    router.push('/queens');
  } catch (err) {
    console.error('[QueensGame] Error loading puzzle route:', err);
    router.push('/queens');
  } finally {
    isRouteLoading.value = false;
  }
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
    colorCounts.forEach((positions) => {
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
  () => [
    route.params.puzzleId,
    route.params.levelName,
    route.params.encodedLayout,
    route.params.sizeKey,
    route.params.orthogonalMinDistance,
    route.params.difficulty,
    route.params.selectedPuzzleId,
  ],
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
