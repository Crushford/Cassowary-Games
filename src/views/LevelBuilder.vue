<template>
  <div class="grid grid-cols-[300px_1fr_300px] gap-4">
    <!-- Puzzle Generation Controls Sidebar on Left -->
    <div class="flex flex-col gap-4">
      <PuzzleGenerationControls />
      <ColorPaletteTool />
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-4">
      <!-- Dual Grid Layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Solution Grid -->
        <div class="flex flex-col items-center">
          <h3 class="text-lg font-semibold mb-3 text-white">Solution</h3>
          <GameGrid mode="solution" />
        </div>

        <!-- Player Grid -->
        <div class="flex flex-col items-center">
          <h3 class="text-lg font-semibold mb-3 text-white">Test Your Solution</h3>
          <GameGrid mode="player" />

          <!-- Reset Button for Player Grid -->
          <button
            @click="resetBoardForSolving"
            class="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span class="material-icons">refresh</span>
            Reset Board for Solving
          </button>
        </div>
      </div>

      <div
        v-if="gameStore.errorMessage"
        class="p-4 bg-red-500/20 border border-red-500 text-red-400 rounded-lg"
      >
        {{ gameStore.errorMessage }}
      </div>

      <section
        v-if="gameStore.debugLogs.length > 0"
        class="relative bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-white">Debug Logs</h3>
          <div class="flex gap-2">
            <button
              @click="gameStore.toggleVerboseMode()"
              class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
            >
              {{ gameStore.verboseMode ? '🔊 Verbose Mode On' : '🔇 Verbose Mode Off' }}
            </button>
            <button
              @click="copyLast20Logs"
              class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
            >
              Copy Last 20
            </button>
            <button
              @click="copyAllLogs"
              class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
            >
              Copy All
            </button>
          </div>
        </div>
        <div ref="logsContainer" class="max-h-64 overflow-auto">
          <ul class="list-disc list-inside text-sm space-y-2 text-white">
            <li v-for="(log, i) in gameStore.debugLogs" :key="i">{{ log }}</li>
          </ul>
        </div>
        <span v-if="copyStatus" class="absolute bottom-2 right-2 text-sm text-green-400">{{
          copyStatus
        }}</span>
      </section>

      <section v-else class="bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-white">Debug Logs</h3>
          <button
            @click="gameStore.toggleVerboseMode()"
            class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
          >
            {{ gameStore.verboseMode ? '🔊 Verbose Mode On' : '🔇 Verbose Mode Off' }}
          </button>
        </div>
        <p class="text-white">No logs to display yet.</p>
      </section>
    </div>

    <!-- Right Side Column -->
    <div class="flex flex-col gap-4">
      <!-- Puzzle Solving Panel Sidebar on Right -->
      <PuzzleSolvingPanel />

      <!-- Game State Export Component -->
      <section class="bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg">
        <GameStateExport />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, defineAsyncComponent } from 'vue';
import { useGameStore } from '../stores/gameStore';

// Use defineAsyncComponent to fix the "no default export" error
const GameGrid = defineAsyncComponent(() => import('../components/GameGrid.vue'));
const PuzzleGenerationControls = defineAsyncComponent(
  () => import('../components/PuzzleGenerationControls.vue')
);
const PuzzleSolvingPanel = defineAsyncComponent(
  () => import('../components/PuzzleSolvingPanel.vue')
);
const ColorPaletteTool = defineAsyncComponent(() => import('../components/ColorPaletteTool.vue'));
const GameStateExport = defineAsyncComponent(() => import('../components/GameStateExport.vue'));

const gameStore = useGameStore();
const copyStatus = ref('');

// Copy functions
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.value = 'Copied!';
    setTimeout(() => {
      copyStatus.value = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
    copyStatus.value = 'Failed to copy';
  }
}

function copyLast20Logs() {
  const last20Logs = gameStore.debugLogs.slice(-20).join('\n');
  copyToClipboard(last20Logs);
}

function copyAllLogs() {
  const allLogs = gameStore.debugLogs.join('\n');
  copyToClipboard(allLogs);
}

// Function to reset board for solving
function resetBoardForSolving() {
  gameStore.clearQueensAndFlags();
}

const logsContainer = ref<HTMLElement | null>(null);
watch(
  () => gameStore.debugLogs,
  () =>
    nextTick(() => {
      if (logsContainer.value) logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }),
  { deep: true }
);
onMounted(() => {
  if (logsContainer.value && gameStore.debugLogs.length)
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
});
</script>
