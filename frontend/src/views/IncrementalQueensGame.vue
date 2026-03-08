<template>
  <div
    class="w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden h-dvh"
    role="main"
    :aria-labelledby="incrementalStore.runStatus === 'idle' ? 'incremental-queens-title' : undefined"
    :aria-describedby="rootAriaDescribedBy"
    data-game="queens-incremental"
  >
    <div class="flex-none p-3 border-b border-gray-700">
      <template v-if="incrementalStore.runStatus === 'idle'">
        <h1 id="incremental-queens-title" class="sr-only">Incremental Queens</h1>
        <p id="incremental-queens-instructions" class="sr-only">
          Solve timed 5 by 5 Queens puzzles. Use tool selector to switch between auto, flag, and queen
          modes. Place one queen per row, column, and color group. Spend bank between puzzles to buy
          upgrades.
        </p>
        <p id="incremental-queens-status" class="sr-only" aria-live="polite">{{ runStatusAnnouncement }}</p>
        <p id="incremental-board-summary" class="sr-only">{{ boardSummary }}</p>
      </template>

      <div
        v-if="incrementalStore.runStatus !== 'idle'"
        class="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
      >
        <h1 class="text-lg font-bold text-emerald-400 whitespace-nowrap">Incremental Queens</h1>
        <div class="text-sm font-semibold text-cyan-300 text-center">Bank {{ incrementalStore.runBank }}</div>
        <div
          v-if="incrementalStore.runStatus === 'playing'"
          class="text-xl font-bold tabular-nums leading-none text-center"
          :class="timerClass"
          aria-live="off"
        >
          {{ incrementalStore.formattedTimeRemaining }}
        </div>
        <div v-else />
        <button
          type="button"
          class="justify-self-center px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-sm font-semibold"
          @click="showGiveUpConfirm = true"
          aria-label="Give up current run and return to Queens menu"
        >
          Give Up
        </button>
      </div>
      <div
        v-if="incrementalStore.runStatus === 'playing' && queensStore.autoFlagComboCount > 0"
        :key="queensStore.autoFlagComboTick"
        class="mt-2 flex justify-end pointer-events-none"
      >
        <div
          class="text-xs font-bold leading-none px-[0.6rem] py-[0.4rem] rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 animate-pulse"
        >
          +{{ queensStore.autoFlagComboCount }} auto flags
        </div>
      </div>
      <div v-if="incrementalStore.runStatus === 'idle'" class="mt-2">
        <div class="text-sm text-gray-300">
          Solve timed 5x5 Queens puzzles. Spend bank in the shop after each solve to upgrade Risk
          or Time.
        </div>
      </div>
    </div>

    <div
      v-if="incrementalStore.runStatus === 'idle'"
      class="flex-1 flex items-center justify-center p-6"
    >
      <div class="max-w-sm w-full bg-gray-700 rounded-lg p-4 space-y-3">
        <button
          type="button"
          class="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold"
          @click="handleStartRun"
          aria-label="Start a new incremental queens run"
        >
          Start Run
        </button>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center p-2">
      <div v-if="incrementalStore.isLoadingPuzzle" class="text-yellow-300" role="status" aria-live="polite">
        Loading puzzle...
      </div>
      <PlayGrid
        v-else
        class="w-full max-w-full aspect-square"
        :store="queensStore"
        :enable-touch="true"
        role="grid"
        aria-label="Incremental Queens puzzle grid"
        :aria-rowcount="queensStore.gridSize"
        :aria-colcount="queensStore.gridSize"
        data-game-board="queens-incremental"
      >
        <template #default="{ rowIndex, colIndex, store }">
          <QueensSquare :row-index="rowIndex" :col-index="colIndex" :store="store" />
        </template>
      </PlayGrid>
    </div>

    <div v-if="incrementalStore.runStatus !== 'idle'" class="flex-none p-3 space-y-2">
      <div class="grid grid-cols-3 items-center gap-2 px-2">
        <div class="flex justify-center">
          <QueensToolSelector
            :is-disabled="!isBoardInteractive"
            :hide-auto-mode="false"
            :show-auto-flag-toggle="false"
          />
        </div>
        <div class="flex justify-center">
          <button
            type="button"
            class="shrink-0 px-5 py-2 text-xs font-semibold rounded bg-amber-800 hover:bg-amber-700 disabled:opacity-50"
            :disabled="!isBoardInteractive || queensStore.moveHistory.length === 0"
            @click="queensStore.handleUndo"
            aria-label="Undo last move"
          >
            Undo
          </button>
        </div>
        <div class="flex justify-center">
          <button
            type="button"
            class="shrink-0 px-5 py-2 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
            :disabled="!isBoardInteractive"
            @click="queensStore.clearAll"
            aria-label="Clear all marks from the board"
          >
            Clear
          </button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="px-2 py-2 text-xs font-semibold rounded bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="incrementalStore.runStatus !== 'upgrade-select'"
          @click="showShopModal = true"
        >
          Shop
        </button>
        <button
          type="button"
          class="px-2 py-2 text-xs font-semibold rounded bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!incrementalStore.canStartNextPuzzle"
          @click="incrementalStore.skipUpgradeSelection"
          aria-label="Load the next puzzle"
        >
          Next Puzzle
        </button>
        <button
          v-if="incrementalStore.currentPuzzleSize < 9"
          type="button"
          class="px-2 py-2 text-xs font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed"
          :class="incrementalStore.canBuySizeUpGoal ? 'bg-orange-700 hover:bg-orange-600' : 'bg-gray-700'"
          :disabled="!incrementalStore.canBuySizeUpGoal"
          @click="showNextLevelConfirm = true"
          aria-label="Advance to next board size and fully reset progression"
        >
          Next Level ({{ incrementalStore.sizeUpGoalCost }})
        </button>
      </div>
    </div>

    <Modal
      :is-visible="showShopModal"
      aria-labelledby="incremental-upgrade-title"
      aria-describedby="incremental-upgrade-description"
      @close="showShopModal = false"
    >
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 id="incremental-upgrade-title" class="text-xl font-bold text-green-400">Shop</h2>
          <button
            type="button"
            class="h-8 w-8 rounded bg-gray-700 hover:bg-gray-600 text-lg leading-none font-bold"
            @click="showShopModal = false"
            aria-label="Close shop"
          >
            ×
          </button>
        </div>
        <p id="incremental-upgrade-description" class="sr-only">
          Shop phase. Buy upgrades or pattern cards, then continue to the next puzzle.
        </p>
        <div v-if="incrementalStore.lastScoreBreakdown" class="bg-gray-700 rounded p-3 mb-4 text-sm">
          <div class="flex justify-between items-end">
            <span class="font-semibold">Time Remaining</span>
            <span>{{ incrementalStore.lastScoreBreakdown.timeRemaining }}s / {{ incrementalStore.lastScoreBreakdown.totalTime }}s</span>
          </div>
          <div class="mt-2">
            <div class="flex justify-between text-xs text-gray-300 mb-1">
              <span>Timer Left</span>
              <span>{{ timeRemainingPercentLabel }} of total</span>
            </div>
            <div class="h-2 rounded-full bg-slate-600 overflow-hidden">
              <div
                class="h-full rounded-full bg-emerald-400 transition-[width] duration-700 ease-out"
                :style="{ width: `${animatedTimeRemainingPercent}%` }"
              />
            </div>
          </div>
          <div class="mt-3 space-y-1">
            <div class="flex justify-between"><span>Multiplier</span><span>x{{ formatMultiplier(incrementalStore.lastScoreBreakdown.multiplier) }}</span></div>
            <div class="flex justify-between font-bold text-emerald-300"><span>Bank</span><span>{{ incrementalStore.runBank }}</span></div>
          </div>
        </div>

        <h3 class="text-sm font-semibold text-gray-300 mb-2">Shop Phase</h3>

        <div class="space-y-2">
          <div class="text-xs text-gray-300 px-1">
            Current timer: <span class="font-semibold text-white">{{ incrementalStore.currentPuzzleTimeLimit }}s</span>
          </div>
          <button
            type="button"
            class="w-full text-left p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :class="incrementalStore.canAffordRisk ? 'bg-red-700 hover:bg-red-600' : 'bg-gray-700'"
            :disabled="!incrementalStore.canAffordRisk"
            @click="incrementalStore.buyRiskUpgrade"
            :aria-label="riskUpgradeAriaLabel"
          >
            <div class="font-semibold flex items-center justify-between">
              <span>Risk {{ incrementalStore.riskShopPreview.currentLevel }} → {{ incrementalStore.riskShopPreview.nextLevel }}</span>
              <span class="text-xs text-yellow-300">Cost: {{ incrementalStore.riskShopPreview.cost }}</span>
            </div>
            <div class="text-xs text-red-100">
              Current timer: {{ incrementalStore.riskShopPreview.currentTimeLimit }}s
            </div>
            <div class="text-xs text-red-100">
              After purchase: {{ incrementalStore.riskShopPreview.nextTimeLimit }}s
            </div>
            <div class="text-xs text-red-100">
              Score: x{{ formatMultiplier(incrementalStore.riskShopPreview.currentMultiplier) }} → x{{ formatMultiplier(incrementalStore.riskShopPreview.nextMultiplier) }}
            </div>
            <div
              v-if="incrementalStore.currentPuzzleTimeLimit <= 15"
              class="text-xs text-amber-200 mt-1"
            >
              Timer is at minimum. Risk cannot increase further.
            </div>
          </button>

          <button
            type="button"
            class="w-full text-left p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :class="incrementalStore.canAffordTime ? 'bg-blue-700 hover:bg-blue-600' : 'bg-gray-700'"
            :disabled="!incrementalStore.canAffordTime"
            @click="incrementalStore.buyTimeUpgrade"
            :aria-label="timeUpgradeAriaLabel"
          >
            <div class="font-semibold flex items-center justify-between">
              <span>Time {{ incrementalStore.timeShopPreview.currentLevel }} → {{ incrementalStore.timeShopPreview.nextLevel }}</span>
              <span class="text-xs text-yellow-300">Cost: {{ incrementalStore.timeShopPreview.cost }}</span>
            </div>
            <div class="text-xs text-blue-100">
              Current timer: {{ incrementalStore.timeShopPreview.currentTimeLimit }}s
            </div>
            <div class="text-xs text-blue-100">
              After purchase: {{ incrementalStore.timeShopPreview.nextTimeLimit }}s (+30s)
            </div>
          </button>

          <button
            v-if="incrementalStore.selectedOneOffUpgrade"
            type="button"
            class="w-full text-left p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :class="incrementalStore.selectedOneOffUpgrade.canBuy ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-gray-700'"
            :disabled="!incrementalStore.selectedOneOffUpgrade.canBuy"
            @click="incrementalStore.buySelectedOneOffUpgrade"
          >
            <div class="font-semibold flex items-center justify-between">
              <span>{{ incrementalStore.selectedOneOffUpgrade.title }}</span>
              <span class="text-xs text-yellow-300">Cost: {{ incrementalStore.selectedOneOffUpgrade.cost }}</span>
            </div>
            <div class="text-xs text-emerald-100">{{ incrementalStore.selectedOneOffUpgrade.description }}</div>
          </button>

          <label
            v-if="incrementalStore.autoNextPuzzlePurchased"
            class="w-full flex items-center justify-between p-3 rounded bg-gray-700 cursor-pointer"
          >
            <span class="text-sm font-semibold">Auto Start Next Puzzle</span>
            <input
              type="checkbox"
              class="h-4 w-4 accent-emerald-500"
              :checked="incrementalStore.autoNextPuzzleEnabled"
              @change="
                incrementalStore.setAutoNextPuzzleEnabled(
                  ($event.target as HTMLInputElement).checked
                )
              "
            />
          </label>
          <div v-else class="text-xs text-gray-400 px-1">
            Auto Start Next Puzzle appears as a one-off shop upgrade.
          </div>

          <div class="text-[11px] text-gray-400 px-1">
            Pattern automation costs scale: +20 per purchased pattern card this run.
          </div>
          <button
            type="button"
            class="w-full py-2 rounded bg-purple-700 hover:bg-purple-600 font-semibold"
            @click="showPatternManager = true"
          >
            Manage Automations
          </button>
          <div class="text-xs text-gray-300 px-1">
            Active pattern automations: {{ incrementalStore.ownedPatternCardIds.length }}
          </div>
        </div>
        <button
          type="button"
          class="w-full mt-3 py-2 rounded bg-green-600 hover:bg-green-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!incrementalStore.canStartNextPuzzle"
          @click="
            incrementalStore.skipUpgradeSelection();
            showShopModal = false;
          "
          aria-label="Start next puzzle"
        >
          Start Next Puzzle
        </button>
      </div>
    </Modal>

    <Modal
      :is-visible="showPatternDesigner"
      aria-label="Create custom pattern card"
      @close="showPatternDesigner = false"
    >
      <MobilePatternCardDesigner @save="handleSaveCustomPatternCard" @cancel="showPatternDesigner = false" />
    </Modal>

    <PatternCardManagerModal
      :is-visible="showPatternManager"
      @close="showPatternManager = false"
      @create-custom="
        showPatternManager = false;
        showPatternDesigner = true;
      "
    />

    <Modal
      :is-visible="showGiveUpConfirm"
      role="alertdialog"
      aria-labelledby="incremental-giveup-title"
      aria-describedby="incremental-giveup-description"
      @close="showGiveUpConfirm = false"
    >
      <div>
        <h2 id="incremental-giveup-title" class="text-xl font-bold text-red-400 mb-3">Give Up Run?</h2>
        <p id="incremental-giveup-description" class="text-sm text-gray-200 mb-4">
          This will end the current run and return to the Queens menu.
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-500 font-semibold"
            @click="showGiveUpConfirm = false"
            aria-label="Cancel and continue current run"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 py-2 rounded bg-red-700 hover:bg-red-600 font-semibold"
            @click="handleGiveUp"
            aria-label="Confirm give up and exit run"
          >
            Give Up
          </button>
        </div>
      </div>
    </Modal>

    <Modal
      :is-visible="showNextLevelConfirm"
      role="alertdialog"
      aria-labelledby="incremental-nextlevel-title"
      aria-describedby="incremental-nextlevel-description"
      @close="showNextLevelConfirm = false"
    >
      <div>
        <h2 id="incremental-nextlevel-title" class="text-xl font-bold text-orange-300 mb-3">
          Advance to {{ incrementalStore.sizeUpGoalLabel }}?
        </h2>
        <p id="incremental-nextlevel-description" class="text-sm text-gray-200 mb-4">
          This will fully reset your run progress: bank, score, upgrades, and pattern automations.
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-500 font-semibold"
            @click="showNextLevelConfirm = false"
            aria-label="Cancel next level purchase"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 py-2 rounded bg-orange-700 hover:bg-orange-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!incrementalStore.canBuySizeUpGoal"
            @click="handleConfirmNextLevel"
            aria-label="Confirm next level purchase and reset run"
          >
            Confirm ({{ incrementalStore.sizeUpGoalCost }})
          </button>
        </div>
      </div>
    </Modal>

    <Modal
      :is-visible="incrementalStore.runStatus === 'game-over'"
      role="alertdialog"
      aria-labelledby="incremental-gameover-title"
      aria-describedby="incremental-gameover-description"
    >
      <div>
        <h2 id="incremental-gameover-title" class="text-xl font-bold text-red-400 mb-3">Run Over</h2>
        <p id="incremental-gameover-description" class="sr-only">
          Run finished. Review score summary, then choose New Run or Exit.
        </p>
        <div class="bg-gray-700 rounded p-3 mb-4 text-sm space-y-1">
          <div class="flex justify-between">
            <span>Total Score</span>
            <span class="font-bold text-yellow-300">{{ incrementalStore.runScore }}</span>
          </div>
          <div class="flex justify-between">
            <span>Remaining Bank</span>
            <span class="font-bold text-emerald-300">{{ incrementalStore.runBank }}</span>
          </div>
          <div class="flex justify-between"><span>Puzzles Solved</span><span class="font-bold">{{ incrementalStore.puzzlesSolved }}</span></div>
          <div class="flex justify-between"><span>Risk Level</span><span class="font-bold">{{ incrementalStore.riskLevel }}</span></div>
          <div class="flex justify-between"><span>Time Level</span><span class="font-bold">{{ incrementalStore.timeLevel }}</span></div>
          <div class="flex justify-between">
            <span>Auto Flag</span>
            <span class="font-bold">{{ incrementalStore.autoFlagPurchased ? 'Owned' : 'Not Owned' }}</span>
          </div>
          <div class="flex justify-between">
            <span>Pattern Automations</span>
            <span class="font-bold">{{ incrementalStore.ownedPatternCardIds.length }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold"
            @click="handleStartRun"
            aria-label="Start a new incremental queens run"
          >
            New Run
          </button>
          <button
            type="button"
            class="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-500 font-semibold"
            @click="handleExit"
            aria-label="Exit incremental queens and return to menu"
          >
            Exit
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch, defineAsyncComponent, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../stores/queensStore';
import { useIncrementalQueensStore } from '../stores/incrementalQueensStore';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../components/queens/QueensSquare.vue'));
const QueensToolSelector = defineAsyncComponent(
  () => import('../components/queens/QueensToolSelector.vue')
);
const Modal = defineAsyncComponent(() => import('../components/shared/Modal.vue'));
const MobilePatternCardDesigner = defineAsyncComponent(
  () => import('../components/queens/MobilePatternCardDesigner.vue')
);
const PatternCardManagerModal = defineAsyncComponent(
  () => import('../components/queens/PatternCardManagerModal.vue')
);

const queensStore = useQueensStore();
const incrementalStore = useIncrementalQueensStore();
const router = useRouter();
const showShopModal = ref(false);
const showPatternDesigner = ref(false);
const showPatternManager = ref(false);
const showGiveUpConfirm = ref(false);
const showNextLevelConfirm = ref(false);
const animatedTimeRemainingPercent = ref(0);

const rootAriaDescribedBy = computed(() => {
  if (incrementalStore.runStatus === 'idle') {
    return 'incremental-queens-instructions incremental-queens-status incremental-board-summary';
  }
  return undefined;
});

const markedCounts = computed(() => {
  let queens = 0;
  let flags = 0;

  for (const row of queensStore.playerMarks) {
    for (const mark of row) {
      if (mark === 'queen') queens += 1;
      if (mark === 'flag') flags += 1;
    }
  }

  const total = queensStore.gridSize * queensStore.gridSize;
  const empty = Math.max(0, total - queens - flags);

  return { queens, flags, empty };
});

const boardSummary = computed(() => {
  return `Status ${incrementalStore.runStatus}. Puzzle ${queensStore.gridSize} by ${queensStore.gridSize}. Mode ${queensStore.uiState.placementMode}. Auto flagging ${queensStore.uiState.autoFlagging ? 'on' : 'off'}. Queens ${markedCounts.value.queens}. Flags ${markedCounts.value.flags}. Empty ${markedCounts.value.empty}. Bank ${incrementalStore.runBank}. Score ${incrementalStore.runScore}.`;
});

const runStatusAnnouncement = computed(() => {
  if (incrementalStore.runStatus === 'idle') {
    return 'Ready to start incremental queens run.';
  }
  if (incrementalStore.runStatus === 'playing') {
    return `Puzzle in progress. ${incrementalStore.puzzlesSolved} puzzles solved in this run.`;
  }
  if (incrementalStore.runStatus === 'upgrade-select') {
    return 'Puzzle solved. Open the shop or continue to the next puzzle.';
  }
  return `Run over. Final score ${incrementalStore.runScore}, puzzles solved ${incrementalStore.puzzlesSolved}.`;
});

const timeRemainingPercent = computed(() => {
  const breakdown = incrementalStore.lastScoreBreakdown;
  if (!breakdown || breakdown.totalTime <= 0) return 0;
  return Math.max(0, Math.min(100, (breakdown.timeRemaining / breakdown.totalTime) * 100));
});

const timeRemainingPercentLabel = computed(() => {
  return `${Math.round(timeRemainingPercent.value)}%`;
});

const riskUpgradeAriaLabel = computed(() => {
  const preview = incrementalStore.riskShopPreview;
  return `Buy Risk upgrade from level ${preview.currentLevel} to ${preview.nextLevel}. Cost ${preview.cost}. Timer ${preview.currentTimeLimit} to ${preview.nextTimeLimit} seconds. Score multiplier ${formatMultiplier(preview.currentMultiplier)} to ${formatMultiplier(preview.nextMultiplier)}.`;
});

const timeUpgradeAriaLabel = computed(() => {
  const preview = incrementalStore.timeShopPreview;
  return `Buy Time upgrade from level ${preview.currentLevel} to ${preview.nextLevel}. Cost ${preview.cost}. Timer ${preview.currentTimeLimit} to ${preview.nextTimeLimit} seconds.`;
});

const isBoardInteractive = computed(() => {
  return (
    incrementalStore.runStatus === 'playing' &&
    !incrementalStore.isLoadingPuzzle &&
    !incrementalStore.isAutomationInProgress
  );
});

const timerClass = computed(() => {
  if (incrementalStore.timeRemaining < 20) {
    return 'text-red-300 animate-pulse';
  }
  if (incrementalStore.timeRemaining < 60) {
    return 'text-amber-300';
  }
  return 'text-red-300';
});

watch(
  () => queensStore.isComplete,
  (isComplete) => {
    if (
      isComplete &&
      incrementalStore.runStatus === 'playing' &&
      !incrementalStore.isAutomationInProgress
    ) {
      incrementalStore.handlePuzzleSolved();
    }
  }
);

watch(
  () => ({
    status: incrementalStore.runStatus,
    percent: timeRemainingPercent.value,
  }),
  async ({ status, percent }) => {
    if (status !== 'upgrade-select') {
      animatedTimeRemainingPercent.value = 0;
      return;
    }

    animatedTimeRemainingPercent.value = 0;
    await nextTick();
    requestAnimationFrame(() => {
      animatedTimeRemainingPercent.value = percent;
    });
  }
);

watch(
  () => incrementalStore.runStatus,
  (status) => {
    if (status !== 'upgrade-select') {
      showShopModal.value = false;
      showPatternManager.value = false;
      showPatternDesigner.value = false;
      showNextLevelConfirm.value = false;
    }
  }
);

function formatMultiplier(value: number): string {
  return value.toFixed(2);
}

async function handleStartRun() {
  showShopModal.value = false;
  await incrementalStore.startRun();
}

async function handleSaveCustomPatternCard(payload: {
  id?: string;
  size: number;
  cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
  outputFlags: Array<{ row: number; col: number }>;
}) {
  await incrementalStore.createCustomPatternCard(payload);
  showPatternDesigner.value = false;
}

function handleExit() {
  showShopModal.value = false;
  incrementalStore.cleanupSessionState();
  incrementalStore.resetRunState();
  router.push('/queens');
}

function handleGiveUp() {
  showGiveUpConfirm.value = false;
  handleExit();
}

async function handleConfirmNextLevel() {
  await incrementalStore.buySizeUpGoal();
  showNextLevelConfirm.value = false;
  showShopModal.value = false;
}

onBeforeUnmount(() => {
  incrementalStore.cleanupSessionState();
  incrementalStore.resetRunState();
});

defineOptions({
  name: 'IncrementalQueensGame',
});
</script>
