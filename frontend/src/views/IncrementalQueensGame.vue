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

      <div v-if="incrementalStore.runStatus === 'playing'" class="flex items-center justify-between">
        <button
          type="button"
          class="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-sm font-semibold"
          @click="showGiveUpConfirm = true"
          aria-label="Give up current run and return to Queens menu"
        >
          Give Up
        </button>
        <div class="text-sm text-emerald-300 font-semibold">Bank {{ incrementalStore.runBank }}</div>
        <div class="text-2xl font-bold tabular-nums leading-none" :class="timerClass" aria-live="off">
          {{ incrementalStore.formattedTimeRemaining }}
        </div>
      </div>
      <div
        v-if="incrementalStore.runStatus === 'playing' && queensStore.autoFlagComboCount > 0"
        :key="queensStore.autoFlagComboTick"
        class="mt-2 flex justify-end pointer-events-none"
      >
        <div class="auto-flag-combo-chip">
          +{{ queensStore.autoFlagComboCount }} auto flags
        </div>
      </div>
      <div v-if="incrementalStore.runStatus !== 'playing'" class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-emerald-400">Incremental Queens</h1>
        <button
          type="button"
          class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 text-sm font-semibold"
          @click="handleExit"
          aria-label="Back to Queens menu"
        >
          Back
        </button>
      </div>
      <div v-if="incrementalStore.runStatus === 'upgrade-select'" class="mt-2 flex items-center justify-end">
        <div class="text-sm text-emerald-300 font-semibold">Bank {{ incrementalStore.runBank }}</div>
      </div>
      <div v-if="incrementalStore.runStatus === 'game-over'" class="mt-2 flex items-center justify-end">
        <div class="text-sm text-emerald-300 font-semibold">Bank {{ incrementalStore.runBank }}</div>
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
      <QueensToolSelector
        :is-disabled="!isBoardInteractive"
        :hide-auto-mode="false"
        :show-auto-flag-toggle="false"
      />
      <div class="flex gap-2 justify-center">
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
          :disabled="!isBoardInteractive || queensStore.moveHistory.length === 0"
          @click="queensStore.handleUndo"
          aria-label="Undo last move"
        >
          Undo
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
          :disabled="!isBoardInteractive"
          @click="queensStore.clearAll"
          aria-label="Clear all marks from the board"
        >
          Clear
        </button>
      </div>
    </div>

    <Modal
      :is-visible="incrementalStore.runStatus === 'upgrade-select'"
      aria-labelledby="incremental-upgrade-title"
      aria-describedby="incremental-upgrade-description"
    >
      <div>
        <h2 id="incremental-upgrade-title" class="text-xl font-bold text-green-400 mb-3">Puzzle Solved</h2>
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
              Timer: {{ incrementalStore.riskShopPreview.currentTimeLimit }}s → {{ incrementalStore.riskShopPreview.nextTimeLimit }}s
            </div>
            <div class="text-xs text-red-100">
              Score: x{{ formatMultiplier(incrementalStore.riskShopPreview.currentMultiplier) }} → x{{ formatMultiplier(incrementalStore.riskShopPreview.nextMultiplier) }}
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
              Timer: {{ incrementalStore.timeShopPreview.currentTimeLimit }}s → {{ incrementalStore.timeShopPreview.nextTimeLimit }}s
            </div>
            <div class="text-xs text-blue-100">Adds +30s per level. No score bonus.</div>
          </button>

          <button
            v-if="!incrementalStore.autoFlagPurchased"
            type="button"
            class="w-full text-left p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              incrementalStore.canAffordAutoFlag ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-gray-700'
            "
            :disabled="!incrementalStore.canAffordAutoFlag"
            @click="incrementalStore.buyAutoFlagUpgrade"
            :aria-label="autoFlagUpgradeAriaLabel"
          >
            <div class="font-semibold flex items-center justify-between">
              <span>Auto Flag</span>
              <span class="text-xs text-yellow-300">Cost: {{ incrementalStore.autoFlagCost }}</span>
            </div>
            <div class="text-xs text-emerald-100">
              Automatically flags blocked squares after placing a queen.
            </div>
          </button>
          <div class="text-[11px] text-gray-400 px-1">
            Pattern card costs scale: +20 per purchased pattern card this run.
          </div>
          <button
            v-for="card in incrementalStore.availablePatternCards"
            :key="card.id"
            type="button"
            class="w-full text-left p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              incrementalStore.canAffordPatternCard(card.id)
                ? 'bg-purple-700 hover:bg-purple-600'
                : 'bg-gray-700'
            "
            :disabled="!incrementalStore.canAffordPatternCard(card.id)"
            @click="incrementalStore.buyPatternCard(card.id)"
            :aria-label="patternCardAriaLabel(card)"
          >
            <div class="flex items-start gap-3">
              <PatternCardPreview :card="card" />
              <div class="flex-1 min-w-0">
                <div class="font-semibold flex items-center justify-between gap-2">
                  <span>Pattern Card: {{ card.id }}</span>
                  <span class="text-xs text-yellow-300 shrink-0">
                    Cost: {{ incrementalStore.patternCardCost(card.id) }}
                  </span>
                </div>
                <div class="text-xs text-purple-100">
                  Base {{ card.cost }} + scaling.
                </div>
              </div>
            </div>
          </button>
        </div>

        <button
          v-if="incrementalStore.canCreateCustomPatternCard"
          type="button"
          class="w-full mt-2 py-2 rounded bg-purple-700 hover:bg-purple-600 font-semibold"
          @click="showPatternDesigner = true"
          aria-label="Create a custom pattern card"
        >
          Create Your Own Pattern Card
        </button>

        <button
          type="button"
          class="w-full mt-3 py-2 rounded bg-green-600 hover:bg-green-500 font-semibold"
          @click="incrementalStore.skipUpgradeSelection"
          aria-label="Skip shop and load the next puzzle"
        >
          Next Puzzle
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
            <span>Pattern Cards</span>
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
const PatternCardPreview = defineAsyncComponent(
  () => import('../components/queens/PatternCardPreview.vue')
);
const MobilePatternCardDesigner = defineAsyncComponent(
  () => import('../components/queens/MobilePatternCardDesigner.vue')
);

const queensStore = useQueensStore();
const incrementalStore = useIncrementalQueensStore();
const router = useRouter();
const showPatternDesigner = ref(false);
const showGiveUpConfirm = ref(false);
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
    return 'Puzzle solved. Shop is open for upgrades and pattern cards.';
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

const autoFlagUpgradeAriaLabel = computed(() => {
  return `Buy Auto Flag upgrade. Cost ${incrementalStore.autoFlagCost}. Automatically flags blocked squares after placing a queen.`;
});

const isBoardInteractive = computed(() => {
  return incrementalStore.runStatus === 'playing' && !incrementalStore.isLoadingPuzzle;
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
    if (isComplete && incrementalStore.runStatus === 'playing') {
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

function formatMultiplier(value: number): string {
  return value.toFixed(2);
}

function patternCardAriaLabel(card: { id: string; cost: number }): string {
  const currentCost = incrementalStore.patternCardCost(card.id);
  return `Buy pattern card ${card.id}. Cost ${currentCost}. Base ${card.cost} plus scaling. Auto-flag pattern card.`;
}

async function handleStartRun() {
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
  incrementalStore.cleanupSessionState();
  incrementalStore.resetRunState();
  router.push('/queens');
}

function handleGiveUp() {
  showGiveUpConfirm.value = false;
  handleExit();
}

onBeforeUnmount(() => {
  incrementalStore.cleanupSessionState();
  incrementalStore.resetRunState();
});

defineOptions({
  name: 'IncrementalQueensGame',
});
</script>

<style scoped>
.auto-flag-combo-chip {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.4rem 0.6rem;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.16);
  color: rgb(110, 231, 183);
  border: 1px solid rgba(16, 185, 129, 0.4);
  animation: auto-flag-chip-in 900ms ease-out;
}

@keyframes auto-flag-chip-in {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.92);
  }
  18% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-2px) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auto-flag-combo-chip {
    animation: none;
  }
}
</style>
