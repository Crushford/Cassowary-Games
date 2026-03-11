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
          <h3 class="text-lg font-semibold mb-3 text-white">Automatic Test</h3>
          <GameGrid mode="autoTest" />
        </div>

        <!-- Player Grid -->
        <div class="flex flex-col items-center">
          <h3 class="text-lg font-semibold mb-3 text-white">Test Your Solution</h3>
          <GameGrid mode="player" />
        </div>
      </div>

      <div
        v-if="levelBuilderStore.errorMessage"
        class="p-4 bg-red-500/20 border border-red-500 text-red-400 rounded-lg"
      >
        {{ levelBuilderStore.errorMessage }}
      </div>

      <section
        v-if="levelBuilderStore.debugLogs.length > 0"
        class="relative bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-white">Debug Logs</h3>
          <div class="flex gap-2">
            <button
              class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
              @click="levelBuilderStore.toggleVerboseMode()"
            >
              {{ levelBuilderStore.verboseMode ? '🔊 Verbose Mode On' : '🔇 Verbose Mode Off' }}
            </button>
            <button
              class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
              @click="copyLast20Logs"
            >
              Copy Last 20
            </button>
            <button
              class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
              @click="copyAllLogs"
            >
              Copy All
            </button>
          </div>
        </div>
        <div ref="logsContainer" class="max-h-64 overflow-auto">
          <ul class="list-disc list-inside text-sm space-y-2 text-white">
            <li v-for="(log, i) in levelBuilderStore.debugLogs" :key="i">{{ log }}</li>
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
            class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
            @click="levelBuilderStore.toggleVerboseMode()"
          >
            {{ levelBuilderStore.verboseMode ? '🔊 Verbose Mode On' : '🔇 Verbose Mode Off' }}
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
import { useLevelBuilderStore } from '../stores/levelBuilderStore';

const PuzzleGenerationControls = defineAsyncComponent(
  () => import('../components/level-builder/PuzzleGenerationControls.vue')
);
const ColorPaletteTool = defineAsyncComponent(
  () => import('../components/level-builder/ColorPaletteTool.vue')
);
const GameGrid = defineAsyncComponent(() => import('../components/level-builder/GameGrid.vue'));
const PuzzleSolvingPanel = defineAsyncComponent(
  () => import('../components/level-builder/PuzzleSolvingPanel.vue')
);
const GameStateExport = defineAsyncComponent(
  () => import('../components/level-builder/GameStateExport.vue')
);

const levelBuilderStore = useLevelBuilderStore();
const copyStatus = ref('');

// Watchers
watch(
  () => levelBuilderStore.debugLogs,
  () =>
    nextTick(() => {
      if (logsContainer.value) logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }),
  { deep: true }
);

watch(
  () => levelBuilderStore.grid,
  () => {
    levelBuilderStore.clearAutoTestMarks();
    levelBuilderStore.runAllSolverSteps();
  },
  { deep: true }
);

// Copy functions
function copyLast20Logs() {
  const logsToCopy = levelBuilderStore.debugLogs.slice(-20).join('\n');
  navigator.clipboard.writeText(logsToCopy).then(() => {
    copyStatus.value = 'Copied!';
    setTimeout(() => {
      copyStatus.value = '';
    }, 2000);
  });
}

function copyAllLogs() {
  const logsToCopy = levelBuilderStore.debugLogs.join('\n');
  navigator.clipboard.writeText(logsToCopy).then(() => {
    copyStatus.value = 'Copied!';
    setTimeout(() => {
      copyStatus.value = '';
    }, 2000);
  });
}

const logsContainer = ref<HTMLElement | null>(null);
onMounted(() => {
  if (logsContainer.value && levelBuilderStore.debugLogs.length)
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
});
</script>
