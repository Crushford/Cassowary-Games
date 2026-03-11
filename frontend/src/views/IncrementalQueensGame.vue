<template>
  <div
    class="w-full max-w-[480px] mx-auto bg-slate-950 text-slate-100 [background-image:radial-gradient(120%_120%_at_50%_-15%,#1a2740_0%,#0d1117_55%)] flex flex-col overflow-hidden h-dvh"
    role="main"
    :aria-labelledby="
      incrementalStore.runStatus === 'idle' ? 'incremental-queens-title' : undefined
    "
    :aria-describedby="rootAriaDescribedBy"
    data-game="queens-incremental"
  >
    <div class="flex-none p-3 border-b border-slate-700/70">
      <template v-if="incrementalStore.runStatus === 'idle'">
        <h1 id="incremental-queens-title" class="sr-only">Incremental Queens</h1>
        <p id="incremental-queens-instructions" class="sr-only">
          Solve timed 5 by 5 Queens puzzles. Use tool selector to switch between auto, flag, and
          queen modes. Place one queen per row, column, and color group. Spend bank between puzzles
          to buy upgrades.
        </p>
        <p id="incremental-queens-status" class="sr-only" aria-live="polite">
          {{ runStatusAnnouncement }}
        </p>
        <p id="incremental-board-summary" class="sr-only">{{ boardSummary }}</p>
      </template>

      <div
        v-if="incrementalStore.runStatus !== 'idle'"
        class="rounded-xl border border-slate-700 bg-slate-900/90 p-3 grid grid-cols-[1fr_auto] gap-3 items-center"
      >
        <div>
          <h1 class="text-base font-bold text-cyan-300 leading-none">Incremental Queens</h1>
        </div>
        <div class="flex items-center gap-2 justify-self-end">
          <Tag
            class="rounded-full border border-sky-500/70 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold leading-none text-sky-300"
            :value="`Bank ${incrementalStore.runBank}`"
          />
          <div
            v-if="incrementalStore.runStatus === 'playing'"
            class="rounded-full border border-slate-500 bg-slate-900/95 px-3.5 py-1.5 text-slate-100 tabular-nums text-lg font-extrabold leading-none tracking-wide"
            :class="timerClass"
            aria-live="off"
          >
            {{ incrementalStore.formattedTimeRemaining }}
          </div>
          <Button
            type="button"
            label="Give Up"
            class="rounded-lg border !p-1 text-[11px] font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-red-800 !bg-red-900 !text-red-100 enabled:hover:!bg-red-800 enabled:hover:!border-red-700"
            aria-label="Give up current run and return to Queens menu"
            @click="showGiveUpConfirm = true"
          />
        </div>
      </div>
      <div
        v-if="incrementalStore.runStatus === 'playing' && queensStore.autoFlagComboCount > 0"
        :key="queensStore.autoFlagComboTick"
        class="absolute top-16 right-3 z-50 pointer-events-none"
      >
        <div
          class="text-xs font-bold leading-none px-[0.6rem] py-[0.4rem] rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 animate-pulse"
        >
          +{{ queensStore.autoFlagComboCount }} auto flags
        </div>
      </div>
      <div v-if="incrementalStore.runStatus === 'idle'" class="mt-2">
        <div class="text-sm text-slate-300">
          Solve timed 5x5 Queens puzzles. Spend bank in the shop after each solve to upgrade Risk.
        </div>
      </div>
    </div>

    <div
      v-if="incrementalStore.runStatus !== 'idle'"
      class="px-3 pt-2 flex flex-wrap gap-2 items-center"
    >
      <div
        v-if="incrementalStore.autoNextPuzzlePurchased"
        class="rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 inline-flex items-center gap-2 text-xs font-semibold"
      >
        <span>Auto Next Level</span>
        <ToggleSwitch
          :model-value="incrementalStore.autoNextPuzzleEnabled"
          class="[--p-toggleswitch-width:2.55rem] [--p-toggleswitch-height:1.45rem]"
          @update:model-value="incrementalStore.setAutoNextPuzzleEnabled(Boolean($event))"
        />
      </div>

      <div
        v-if="hasAnyIncrementalAutomation"
        class="rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 inline-flex items-center gap-2 text-xs font-semibold select-none"
      >
        <span>Automation</span>
        <ToggleSwitch
          :model-value="incrementalStore.automationEnabled"
          class="[--p-toggleswitch-width:2.55rem] [--p-toggleswitch-height:1.45rem]"
          aria-label="Toggle incremental automation"
          @update:model-value="incrementalStore.setAutomationEnabled(Boolean($event))"
        />
      </div>
    </div>

    <div
      v-if="incrementalStore.runStatus === 'idle'"
      class="flex-1 flex items-center justify-center p-6"
    >
      <div class="max-w-sm w-full rounded-xl border border-slate-700 bg-slate-900/90 p-4 space-y-3">
        <Button
          type="button"
          label="Start Run"
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-teal-700 !bg-teal-700 !text-cyan-50 enabled:hover:!bg-teal-600 enabled:hover:!border-teal-600 w-full"
          aria-label="Start a new incremental queens run"
          @click="handleStartRun"
        />
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center p-2">
      <div
        v-if="incrementalStore.isLoadingPuzzle"
        class="text-yellow-300"
        role="status"
        aria-live="polite"
      >
        Loading puzzle...
      </div>
      <div v-else class="relative w-full max-w-full aspect-square">
        <PlayGrid
          class="w-full h-full"
          :store="queensStore"
          :enable-touch="true"
          role="grid"
          aria-label="Incremental Queens puzzle grid"
          :aria-rowcount="queensStore.gridSize"
          :aria-colcount="queensStore.gridSize"
          data-game-board="queens-incremental"
        >
          <template #default="{ rowIndex, colIndex, store }">
            <QueensSquare
              :row-index="rowIndex as number"
              :col-index="colIndex as number"
              :store="store"
            />
          </template>
        </PlayGrid>
        <div
          v-if="
            incrementalStore.runStatus === 'upgrade-select' && incrementalStore.lastScoreBreakdown
          "
          class="absolute top-2 left-2 right-2 z-20 pointer-events-none"
        >
          <div class="rounded bg-gray-900/90 border border-emerald-500/30 p-2 text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-semibold text-emerald-300">Time Remaining</span>
              <span>{{ solvedTimeRemainingLabel }}</span>
            </div>
            <div class="h-2 rounded-full bg-slate-700 overflow-hidden mb-2">
              <div
                class="h-full rounded-full bg-emerald-400 transition-[width] duration-700 ease-out"
                :style="{ width: `${animatedTimeRemainingPercent}%` }"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Earned</span>
              <span class="font-bold text-emerald-300">+{{ animatedScoreAward }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="incrementalStore.runStatus !== 'idle'" class="flex-none p-3 space-y-2">
      <div
        class="justify-around rounded-2xl border border-slate-700 bg-slate-900/90 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-2 flex items-center gap-2"
      >
        <QueensToolSelector
          :is-disabled="!isBoardInteractive"
          :hide-auto-mode="false"
          :show-auto-flag-toggle="false"
          :embedded="true"
        />

        <Button
          type="button"
          label="Undo"
          unstyled
          class="h-9 rounded-xl border text-xs font-semibold leading-none !min-w-0 px-2.5 !py-2 shadow-none transition-colors duration-150 active:translate-y-px !border-amber-700 !bg-amber-800 !text-amber-100 enabled:hover:!bg-amber-700 enabled:hover:!border-amber-600 shrink-0"
          :disabled="!isBoardInteractive || queensStore.moveHistory.length === 0"
          aria-label="Undo last move"
          @click="queensStore.handleUndo"
        />
        <Button
          type="button"
          label="Clear"
          unstyled
          class="h-9 rounded-xl border text-xs font-semibold leading-none !min-w-0 px-2.5 !py-2 shadow-none transition-colors duration-150 active:translate-y-px !border-red-800 !bg-red-900 !text-red-100 enabled:hover:!bg-red-800 enabled:hover:!border-red-700 shrink-0"
          :disabled="!isBoardInteractive"
          aria-label="Clear all marks from the board"
          @click="queensStore.clearAll"
        />
      </div>
      <div
        class="rounded-2xl border border-slate-700 bg-slate-900/90 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-2 flex items-center gap-2"
      >
        <Button
          type="button"
          label="Shop"
          class="flex-1 min-w-0 rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-blue-800 !bg-blue-700 !text-blue-100 enabled:hover:!bg-blue-600 enabled:hover:!border-blue-700"
          :disabled="incrementalStore.runStatus === 'game-over'"
          @click="showShopModal = true"
        />
        <Button
          v-if="incrementalStore.currentPuzzleSize < 9"
          type="button"
          :label="`Next Level (${incrementalStore.sizeUpGoalCost})`"
          class="flex-1 min-w-0 rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px"
          :class="
            incrementalStore.canBuySizeUpGoal
              ? '!border-amber-700 !bg-amber-800 !text-amber-100 enabled:hover:!bg-amber-700 enabled:hover:!border-amber-600'
              : '!border-slate-700 !bg-slate-800 !text-slate-300 enabled:hover:!bg-slate-700 enabled:hover:!border-slate-600'
          "
          :disabled="!incrementalStore.canBuySizeUpGoal"
          aria-label="Advance to next board size and fully reset progression"
          @click="showNextLevelConfirm = true"
        />
        <Button
          v-if="showNextPuzzleButton"
          type="button"
          label="Next Puzzle"
          class="flex-1 min-w-0 rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-teal-700 !bg-teal-700 !text-cyan-50 enabled:hover:!bg-teal-600 enabled:hover:!border-teal-600"
          :disabled="!canUseNextPuzzleButton"
          aria-label="Load the next puzzle"
          @click="handleNextPuzzle"
        />
      </div>
    </div>

    <Dialog
      v-model:visible="showShopModal"
      modal
      class="w-[min(92vw,32rem)]"
      header="Shop"
      aria-labelledby="incremental-upgrade-title"
      aria-describedby="incremental-upgrade-description"
    >
      <div>
        <h2 id="incremental-upgrade-title" class="sr-only">Shop</h2>
        <p id="incremental-upgrade-description" class="sr-only">
          Buy upgrades or pattern cards, then continue to the next puzzle.
        </p>

        <div class="space-y-2">
          <div class="text-xs text-slate-300 px-1">
            Time Limit Per Puzzle:
            <span class="font-semibold text-white">{{ puzzleTimeLimitLabel }}</span>
          </div>
          <Card class="rounded-lg border border-slate-700/80 bg-slate-900 bg-red-700/40">
            <template #content>
              <button
                type="button"
                class="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!incrementalStore.canAffordRisk"
                :aria-label="riskUpgradeAriaLabel"
                @click="incrementalStore.buyRiskUpgrade"
              >
                <div class="font-semibold flex items-center justify-between">
                  <span
                    >Risk {{ incrementalStore.riskShopPreview.currentLevel }} →
                    {{ incrementalStore.riskShopPreview.nextLevel }}</span
                  >
                  <span class="text-xs text-yellow-300"
                    >Cost: {{ incrementalStore.riskShopPreview.cost }}</span
                  >
                </div>
                <div class="text-xs text-red-100">
                  Current timer: {{ incrementalStore.riskShopPreview.currentTimeLimit }}s
                </div>
                <div class="text-xs text-red-100">
                  After purchase: {{ incrementalStore.riskShopPreview.nextTimeLimit }}s
                </div>
                <div class="text-xs text-red-100">
                  Score: x{{
                    formatMultiplier(incrementalStore.riskShopPreview.currentMultiplier)
                  }}
                  → x{{ formatMultiplier(incrementalStore.riskShopPreview.nextMultiplier) }}
                </div>
                <div
                  v-if="incrementalStore.currentPuzzleTimeLimit <= 15"
                  class="text-xs text-amber-200 mt-1"
                >
                  Timer is at minimum. Risk cannot increase further.
                </div>
              </button>
            </template>
          </Card>

          <Card
            v-if="incrementalStore.selectedOneOffUpgrade"
            class="rounded-lg border border-slate-700/80 bg-slate-900"
            :class="
              incrementalStore.selectedOneOffUpgrade.canBuy ? 'bg-emerald-700/40' : 'bg-gray-700'
            "
          >
            <template #content>
              <button
                type="button"
                class="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!incrementalStore.selectedOneOffUpgrade.canBuy"
                @click="incrementalStore.buySelectedOneOffUpgrade"
              >
                <div class="font-semibold flex items-center justify-between">
                  <span>{{ incrementalStore.selectedOneOffUpgrade.title }}</span>
                  <span class="text-xs text-yellow-300"
                    >Cost: {{ incrementalStore.selectedOneOffUpgrade.cost }}</span
                  >
                </div>
                <div class="text-xs text-emerald-100">
                  {{ incrementalStore.selectedOneOffUpgrade.description }}
                </div>
              </button>
            </template>
          </Card>

          <Button
            type="button"
            label="Manage Automations"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-blue-800 !bg-blue-700 !text-blue-100 enabled:hover:!bg-blue-600 enabled:hover:!border-blue-700 w-full"
            @click="showPatternManager = true"
          />
          <div class="text-xs text-slate-300 px-1">
            Active pattern automations: {{ incrementalStore.ownedPatternCardIds.length }}
          </div>
        </div>
        <Button
          type="button"
          label="Start Next Puzzle"
          class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-teal-700 !bg-teal-700 !text-cyan-50 enabled:hover:!bg-teal-600 enabled:hover:!border-teal-600 w-full mt-3"
          :disabled="!incrementalStore.canStartNextPuzzle"
          aria-label="Start next puzzle"
          @click="
            incrementalStore.skipUpgradeSelection();
            showShopModal = false;
          "
        />
      </div>
    </Dialog>

    <Dialog
      v-model:visible="showPatternDesigner"
      modal
      class="w-[min(96vw,36rem)]"
      header="Create Custom Automation"
      aria-label="Create custom pattern card"
    >
      <MobilePatternCardDesigner
        @save="handleSaveCustomPatternCard"
        @cancel="showPatternDesigner = false"
      />
    </Dialog>

    <PatternCardManagerModal
      :is-visible="showPatternManager"
      @close="showPatternManager = false"
      @create-custom="
        showPatternManager = false;
        showPatternDesigner = true;
      "
    />

    <Dialog
      v-model:visible="showGiveUpConfirm"
      modal
      class="w-[min(92vw,28rem)]"
      header="Give Up Run?"
      role="alertdialog"
      aria-labelledby="incremental-giveup-title"
      aria-describedby="incremental-giveup-description"
    >
      <div>
        <h2 id="incremental-giveup-title" class="sr-only">Give Up Run?</h2>
        <p id="incremental-giveup-description" class="text-sm text-gray-200 mb-4">
          This will end the current run and return to the Queens menu.
        </p>
        <div class="flex gap-2">
          <Button
            type="button"
            label="Cancel"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-slate-700 !bg-slate-800 !text-slate-200 enabled:hover:!bg-slate-700 enabled:hover:!border-slate-600 flex-1"
            aria-label="Cancel and continue current run"
            @click="showGiveUpConfirm = false"
          />
          <Button
            type="button"
            label="Give Up"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-red-800 !bg-red-900 !text-red-100 enabled:hover:!bg-red-800 enabled:hover:!border-red-700 flex-1"
            aria-label="Confirm give up and exit run"
            @click="handleGiveUp"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="showNextLevelConfirm"
      modal
      class="w-[min(92vw,30rem)]"
      :header="`Advance to ${incrementalStore.sizeUpGoalLabel}?`"
      role="alertdialog"
      aria-labelledby="incremental-nextlevel-title"
      aria-describedby="incremental-nextlevel-description"
    >
      <div>
        <h2 id="incremental-nextlevel-title" class="sr-only">
          Advance to {{ incrementalStore.sizeUpGoalLabel }}?
        </h2>
        <p id="incremental-nextlevel-description" class="text-sm text-gray-200 mb-4">
          This will fully reset your run progress: bank, score, upgrades, and pattern automations.
        </p>
        <div class="flex gap-2">
          <Button
            type="button"
            label="Cancel"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-slate-700 !bg-slate-800 !text-slate-200 enabled:hover:!bg-slate-700 enabled:hover:!border-slate-600 flex-1"
            aria-label="Cancel next level purchase"
            @click="showNextLevelConfirm = false"
          />
          <Button
            type="button"
            :label="`Confirm (${incrementalStore.sizeUpGoalCost})`"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-amber-700 !bg-amber-800 !text-amber-100 enabled:hover:!bg-amber-700 enabled:hover:!border-amber-600 flex-1"
            :disabled="!incrementalStore.canBuySizeUpGoal"
            aria-label="Confirm next level purchase and reset run"
            @click="handleConfirmNextLevel"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      :visible="incrementalStore.runStatus === 'game-over'"
      modal
      :closable="false"
      :draggable="false"
      class="w-[min(92vw,30rem)]"
      header="Run Over"
      role="alertdialog"
      aria-labelledby="incremental-gameover-title"
      aria-describedby="incremental-gameover-description"
    >
      <div>
        <h2 id="incremental-gameover-title" class="sr-only">Run Over</h2>
        <p id="incremental-gameover-description" class="sr-only">
          Run finished. Review score summary, then choose New Run or Exit.
        </p>
        <div
          class="rounded-lg border border-slate-700/80 bg-slate-900 rounded p-3 mb-4 text-sm space-y-1"
        >
          <div class="flex justify-between">
            <span>Total Score</span>
            <span class="font-bold text-yellow-300">{{ incrementalStore.runScore }}</span>
          </div>
          <div class="flex justify-between">
            <span>Remaining Bank</span>
            <span class="font-bold text-emerald-300">{{ incrementalStore.runBank }}</span>
          </div>
          <div class="flex justify-between">
            <span>Puzzles Solved</span
            ><span class="font-bold">{{ incrementalStore.puzzlesSolved }}</span>
          </div>
          <div class="flex justify-between">
            <span>Risk Level</span><span class="font-bold">{{ incrementalStore.riskLevel }}</span>
          </div>
          <div class="flex justify-between">
            <span>Auto Flag</span>
            <span class="font-bold">{{
              incrementalStore.autoFlagPurchased ? 'Owned' : 'Not Owned'
            }}</span>
          </div>
          <div class="flex justify-between">
            <span>Pattern Automations</span>
            <span class="font-bold">{{ incrementalStore.ownedPatternCardIds.length }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <Button
            type="button"
            label="New Run"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-teal-700 !bg-teal-700 !text-cyan-50 enabled:hover:!bg-teal-600 enabled:hover:!border-teal-600 flex-1"
            aria-label="Start a new incremental queens run"
            @click="handleStartRun"
          />
          <Button
            type="button"
            label="Exit"
            class="rounded-xl border px-3 py-2 text-xs font-semibold leading-none shadow-none transition-colors duration-150 active:translate-y-px !border-slate-700 !bg-slate-800 !text-slate-200 enabled:hover:!bg-slate-700 enabled:hover:!border-slate-600 flex-1"
            aria-label="Exit incremental queens and return to menu"
            @click="handleExit"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch, defineAsyncComponent, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';
import { useQueensStore } from '../stores/queensStore';
import { useIncrementalQueensStore } from '../stores/incrementalQueensStore';
import { TIMER_URGENT_SECONDS, TIMER_WARNING_SECONDS } from '../utils/incrementalUpgrades';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../components/queens/QueensSquare.vue'));
const QueensToolSelector = defineAsyncComponent(
  () => import('../components/queens/QueensToolSelector.vue')
);
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
const animatedScoreAward = ref(0);

const hasAnyIncrementalAutomation = computed(() => {
  return (
    incrementalStore.autoFlagPurchased ||
    incrementalStore.autoQueenByColorPurchased ||
    incrementalStore.autoQueenByRowPurchased ||
    incrementalStore.autoQueenByColumnPurchased ||
    incrementalStore.ownedPatternCardIds.length > 0
  );
});

const canSkipPuzzleEarly = computed(() => {
  return (
    incrementalStore.runStatus === 'playing' &&
    !incrementalStore.isLoadingPuzzle &&
    !incrementalStore.isAutomationInProgress &&
    incrementalStore.runBank >= incrementalStore.sizeUpGoalCost
  );
});

const showNextPuzzleButton = computed(() => {
  return incrementalStore.runStatus === 'upgrade-select' || canSkipPuzzleEarly.value;
});

const canUseNextPuzzleButton = computed(() => {
  return incrementalStore.canStartNextPuzzle || canSkipPuzzleEarly.value;
});

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

const puzzleTimeLimitLabel = computed(() => {
  return formatSeconds(incrementalStore.currentPuzzleTimeLimit);
});

const solvedTimeRemainingLabel = computed(() => {
  const breakdown = incrementalStore.lastScoreBreakdown;
  if (!breakdown) return '';
  return `${formatSeconds(breakdown.timeRemaining)} / ${formatSeconds(breakdown.totalTime)}`;
});

const riskUpgradeAriaLabel = computed(() => {
  const preview = incrementalStore.riskShopPreview;
  return `Buy Risk upgrade from level ${preview.currentLevel} to ${preview.nextLevel}. Cost ${preview.cost}. Timer ${preview.currentTimeLimit} to ${preview.nextTimeLimit} seconds. Score multiplier ${formatMultiplier(preview.currentMultiplier)} to ${formatMultiplier(preview.nextMultiplier)}.`;
});

const isBoardInteractive = computed(() => {
  return (
    incrementalStore.runStatus === 'playing' &&
    !incrementalStore.isLoadingPuzzle &&
    !incrementalStore.isAutomationInProgress
  );
});

const timerClass = computed(() => {
  if (incrementalStore.timeRemaining < TIMER_URGENT_SECONDS) {
    return 'text-red-300 animate-pulse';
  }
  if (incrementalStore.timeRemaining < TIMER_WARNING_SECONDS) {
    return 'text-amber-300';
  }
  return '';
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
    score: incrementalStore.lastScoreBreakdown?.scoreAwarded ?? 0,
  }),
  async ({ status, percent, score }) => {
    if (status !== 'upgrade-select') {
      animatedTimeRemainingPercent.value = 0;
      animatedScoreAward.value = 0;
      return;
    }

    animatedTimeRemainingPercent.value = 0;
    animatedScoreAward.value = 0;
    await nextTick();
    requestAnimationFrame(() => {
      animatedTimeRemainingPercent.value = percent;
    });
    const durationMs = 650;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      animatedScoreAward.value = Math.round(score * progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
);

watch(
  () => showShopModal.value,
  (isOpen) => {
    if (incrementalStore.runStatus !== 'playing') {
      return;
    }
    if (isOpen) {
      incrementalStore.stopTimer();
      return;
    }
    incrementalStore.startTimer();
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

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

async function handleNextPuzzle() {
  if (incrementalStore.runStatus === 'upgrade-select') {
    await incrementalStore.skipUpgradeSelection();
    return;
  }
  if (!canSkipPuzzleEarly.value) {
    return;
  }
  await incrementalStore.startNextPuzzle();
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
