<template>
  <div class="w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden h-dvh">
    <div class="flex-none p-3 border-b border-gray-700 space-y-2">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-emerald-400">Incremental Queens</h1>
        <button
          class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 text-sm font-semibold"
          @click="handleExit"
        >
          Back
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="bg-gray-700 rounded p-2">
          <div class="text-gray-300">Score</div>
          <div class="font-bold text-yellow-300">{{ incrementalStore.runScore }}</div>
        </div>
        <div class="bg-gray-700 rounded p-2">
          <div class="text-gray-300">Bank</div>
          <div class="font-bold text-emerald-300">{{ incrementalStore.runBank }}</div>
        </div>
        <div class="bg-gray-700 rounded p-2">
          <div class="text-gray-300">Solved</div>
          <div class="font-bold">{{ incrementalStore.puzzlesSolved }}</div>
        </div>
        <div class="bg-gray-700 rounded p-2">
          <div class="text-gray-300">Timer</div>
          <div class="font-bold text-red-300">{{ incrementalStore.formattedTimeRemaining }}</div>
        </div>
      </div>

      <div class="bg-gray-700 rounded p-2 min-h-[52px]">
        <div class="text-xs text-gray-300 mb-1">Active Upgrades</div>
        <div v-if="incrementalStore.activeUpgradeDetails.length === 0" class="text-xs text-gray-400">
          None
        </div>
        <div v-else class="flex flex-wrap gap-1">
          <span
            v-for="upgrade in incrementalStore.activeUpgradeDetails"
            :key="upgrade.id"
            class="text-xs px-2 py-1 rounded bg-emerald-700"
          >
            {{ upgrade.name }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-if="incrementalStore.runStatus === 'idle'"
      class="flex-1 flex items-center justify-center p-6"
    >
      <div class="max-w-sm w-full bg-gray-700 rounded-lg p-4 space-y-3">
        <p class="text-sm text-gray-200">
          Solve timed 5x5 Queens puzzles. Score scales with remaining time. Timeout ends the run.
        </p>
        <button
          class="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold"
          @click="handleStartRun"
        >
          Start Run
        </button>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center p-2">
      <div v-if="incrementalStore.isLoadingPuzzle" class="text-yellow-300">Loading puzzle...</div>
      <PlayGrid
        v-else
        class="w-full max-w-full aspect-square"
        :store="queensStore"
        :enable-touch="true"
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
          class="px-4 py-2 text-sm font-semibold rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
          :disabled="!isBoardInteractive || queensStore.moveHistory.length === 0"
          @click="queensStore.handleUndo"
        >
          Undo
        </button>
        <button
          class="px-4 py-2 text-sm font-semibold rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
          :disabled="!isBoardInteractive"
          @click="queensStore.clearAll"
        >
          Clear
        </button>
      </div>
    </div>

    <Modal :is-visible="incrementalStore.runStatus === 'upgrade-select'">
      <div>
        <h2 class="text-xl font-bold text-green-400 mb-3">Puzzle Solved</h2>
        <div v-if="incrementalStore.lastScoreBreakdown" class="bg-gray-700 rounded p-3 mb-4 text-sm">
          <div class="flex justify-between"><span>Time Remaining</span><span>{{ incrementalStore.lastScoreBreakdown.timeRemaining }}s / {{ incrementalStore.lastScoreBreakdown.totalTime }}s</span></div>
          <div class="flex justify-between"><span>Base Points</span><span>{{ incrementalStore.lastScoreBreakdown.basePoints }}</span></div>
          <div class="flex justify-between"><span>Time Score</span><span>{{ Math.max(10, incrementalStore.lastScoreBreakdown.rawScore) }}</span></div>
          <div class="flex justify-between"><span>Multiplier</span><span>x{{ incrementalStore.lastScoreBreakdown.multiplier }}</span></div>
          <div class="flex justify-between font-bold text-yellow-300 mt-2"><span>Awarded</span><span>{{ incrementalStore.lastScoreBreakdown.scoreAwarded }}</span></div>
          <div class="flex justify-between font-bold text-yellow-300"><span>Total Score</span><span>{{ incrementalStore.runScore }}</span></div>
          <div class="flex justify-between font-bold text-emerald-300"><span>Bank</span><span>{{ incrementalStore.runBank }}</span></div>
        </div>

        <h3 class="text-sm font-semibold text-gray-300 mb-2">Choose an Upgrade</h3>
        <div class="space-y-2">
          <button
            v-for="upgrade in incrementalStore.availableUpgrades"
            :key="upgrade.id"
            class="w-full text-left p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              incrementalStore.canAffordUpgrade(upgrade.id)
                ? 'bg-emerald-700 hover:bg-emerald-600'
                : 'bg-gray-700'
            "
            :disabled="!incrementalStore.canAffordUpgrade(upgrade.id)"
            @click="incrementalStore.selectUpgrade(upgrade.id)"
          >
            <div class="font-semibold flex items-center justify-between">
              <span>{{ upgrade.name }}</span>
              <span class="text-xs text-yellow-300">Cost: {{ upgrade.cost }}</span>
            </div>
            <div class="text-xs text-emerald-100">{{ upgrade.description }}</div>
          </button>
        </div>
        <button
          class="w-full mt-3 py-2 rounded bg-gray-600 hover:bg-gray-500 font-semibold"
          @click="incrementalStore.skipUpgradeSelection"
        >
          Skip
        </button>
      </div>
    </Modal>

    <Modal :is-visible="incrementalStore.runStatus === 'game-over'">
      <div>
        <h2 class="text-xl font-bold text-red-400 mb-3">Run Over</h2>
        <div class="bg-gray-700 rounded p-3 mb-4 text-sm space-y-1">
          <div class="flex justify-between"><span>Total Score</span><span class="font-bold text-yellow-300">{{ incrementalStore.runScore }}</span></div>
          <div class="flex justify-between"><span>Remaining Bank</span><span class="font-bold text-emerald-300">{{ incrementalStore.runBank }}</span></div>
          <div class="flex justify-between"><span>Puzzles Solved</span><span class="font-bold">{{ incrementalStore.puzzlesSolved }}</span></div>
          <div>
            <div class="text-gray-300 mb-1">Upgrades</div>
            <div v-if="incrementalStore.activeUpgradeDetails.length === 0" class="text-gray-400">None</div>
            <div v-else class="flex flex-wrap gap-1">
              <span
                v-for="upgrade in incrementalStore.activeUpgradeDetails"
                :key="upgrade.id"
                class="text-xs px-2 py-1 rounded bg-emerald-700"
              >
                {{ upgrade.name }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold"
            @click="handleStartRun"
          >
            New Run
          </button>
          <button
            class="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-500 font-semibold"
            @click="handleExit"
          >
            Exit
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../stores/queensStore';
import { useIncrementalQueensStore } from '../stores/incrementalQueensStore';

const PlayGrid = defineAsyncComponent(() => import('../components/shared/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('../components/queens/QueensSquare.vue'));
const QueensToolSelector = defineAsyncComponent(
  () => import('../components/queens/QueensToolSelector.vue')
);
const Modal = defineAsyncComponent(() => import('../components/shared/Modal.vue'));

const queensStore = useQueensStore();
const incrementalStore = useIncrementalQueensStore();
const router = useRouter();

const isBoardInteractive = computed(() => {
  return incrementalStore.runStatus === 'playing' && !incrementalStore.isLoadingPuzzle;
});

watch(
  () => queensStore.isComplete,
  (isComplete) => {
    if (isComplete && incrementalStore.runStatus === 'playing') {
      incrementalStore.handlePuzzleSolved();
    }
  }
);

async function handleStartRun() {
  await incrementalStore.startRun();
}

function handleExit() {
  incrementalStore.cleanupSessionState();
  incrementalStore.resetRunState();
  router.push('/queens');
}

onBeforeUnmount(() => {
  incrementalStore.cleanupSessionState();
  incrementalStore.resetRunState();
});

defineOptions({
  name: 'IncrementalQueensGame',
});
</script>
