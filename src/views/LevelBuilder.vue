<template>
  <div class="flex flex-col gap-4 h-full overflow-y-auto">
    <!-- Validation Toast Message -->
    <div
      v-if="validationMessage"
      class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white font-semibold shadow-lg"
      :class="isValid ? 'bg-green-600' : 'bg-red-600'"
    >
      {{ validationMessage }}
    </div>

    <!-- Game Grid -->
    <GameGrid
      :grid="gameStore.grid"
      :grid-size="gridSize"
      @undo="gameStore.handleUndo"
      @restart="gameStore.clearQueensAndFlags"
    />

    <!-- Status Message -->
    <div
      v-if="gameStore.errorMessage"
      class="p-4 bg-red-500/20 border border-red-500 text-red-400 rounded-lg"
    >
      {{ gameStore.errorMessage }}
    </div>

    <!-- Debug Information -->
    <div class="flex flex-col gap-4">
      <!-- Logs -->
      <section
        v-if="gameStore.testLogs && gameStore.testLogs.length"
        class="bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg max-h-64 overflow-auto"
        ref="logsContainer"
      >
        <h3 class="font-semibold mb-4 text-white">Logs</h3>
        <ul class="list-disc list-inside text-sm space-y-2 text-white">
          <li v-for="(log, i) in gameStore.testLogs" :key="i">{{ log }}</li>
        </ul>
      </section>

      <!-- Debug Logs -->
      <section
        v-if="gameStore.testDebugLogs && gameStore.testDebugLogs.length"
        class="bg-slate-800 border border-slate-700 shadow-sm p-4 rounded-lg"
      >
        <h3 class="font-semibold mb-4 text-white">Debug Logs</h3>
        <div
          v-for="(debug, idx) in gameStore.testDebugLogs"
          :key="idx"
          class="mb-4 border-b border-slate-700 pb-4"
        >
          <div class="mb-2 text-sm text-white">
            <strong>Action:</strong> {{ debug.action }} at ({{ debug.position.row }},{{
              debug.position.col
            }}) in color '{{ debug.color }}'<br />
            <strong>Reason:</strong> {{ debug.reason }}
          </div>
          <div class="flex flex-col md:flex-row gap-4">
            <div class="w-full md:w-1/2">
              <div class="font-bold text-xs mb-1 text-white">Before:</div>
              <pre class="bg-slate-900 p-2 rounded text-xs overflow-x-auto text-white">{{
                debug.before
              }}</pre>
            </div>
            <div class="w-full md:w-1/2">
              <div class="font-bold text-xs mb-1 text-white">After:</div>
              <pre class="bg-slate-900 p-2 rounded text-xs overflow-x-auto text-white">{{
                debug.after
              }}</pre>
            </div>
          </div>
          <button
            class="mt-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            @click="copyDebugLog(debug)"
          >
            Copy Debug Info
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import GameGrid from '../components/GameGrid.vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const gridSize = ref(gameStore.gridSize);
const validationMessage = ref('');
const isValid = ref(false);
const logsContainer = ref<HTMLElement | null>(null);

// Scroll logs to bottom when they change
watch(
  () => gameStore.testLogs,
  () => {
    // Use nextTick to ensure the DOM has updated
    nextTick(() => {
      if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
      }
    });
  },
  { deep: true }
);

// Also scroll to bottom on mount
onMounted(() => {
  if (logsContainer.value && gameStore.testLogs.length > 0) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
  }
});

// Copy debug log to clipboard
function copyDebugLog(debug: any) {
  const text = `Action: ${debug.action} at (${debug.position.row},${debug.position.col}) in color '${debug.color}'\nReason: ${debug.reason}\n\nBefore:\n${debug.before}\n\nAfter:\n${debug.after}`;
  navigator.clipboard.writeText(text);
}
</script>
