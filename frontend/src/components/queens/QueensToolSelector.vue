<template>
  <div
    id="queens-tool-selector"
    class="flex items-center justify-center bg-slate-800 p-2 rounded-lg relative z-50 gap-3"
  >
    <!-- Mode selector - all buttons visible -->
    <div class="flex items-center bg-slate-700 rounded-lg p-1 gap-1">
      <button
        v-for="mode in modes"
        :key="mode.value"
        :id="`queens-tool-${mode.value}`"
        class="px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-2 focus:outline-none min-w-[80px] text-sm font-semibold"
        :class="[
          queensStore.uiState.placementMode === mode.value
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-transparent text-slate-300 hover:bg-slate-600',
          {
            'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-800 animate-pulse':
              isTutorialTarget(mode.value),
          },
        ]"
        @click="selectMode(mode.value)"
        :aria-pressed="queensStore.uiState.placementMode === mode.value"
        :aria-label="`${mode.label} mode: ${mode.description}`"
        :aria-describedby="
          queensStore.isTutorialMode &&
          mode.value === 'queen' &&
          queensStore.uiState.placementMode !== 'queen'
            ? 'tutorial-instruction'
            : undefined
        "
      >
        <span class="text-lg" :aria-hidden="true">{{ mode.icon }}</span>
        <span>{{ mode.label }}</span>
      </button>
    </div>

    <!-- Divider -->
    <div class="h-10 border-l border-slate-500"></div>

    <!-- Auto-flag toggle -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-slate-300">auto-flag</span>
      <button
        id="auto-flagging-toggle"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :class="queensStore.uiState.autoFlagging ? 'bg-blue-600' : 'bg-slate-600'"
        @click="toggleAutoFlagging"
        :aria-pressed="queensStore.uiState.autoFlagging"
        aria-label="Toggle auto-flagging"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="queensStore.uiState.autoFlagging ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQueensStore } from '../../stores/queensStore';

const queensStore = useQueensStore();

const modes = [
  {
    value: 'auto' as const,
    label: 'Auto',
    icon: '🔄',
    description: 'First click flags, second click places queen',
  },
  {
    value: 'flag' as const,
    label: 'Flag',
    icon: '🚧',
    description: 'Place or remove flag',
  },
  {
    value: 'queen' as const,
    label: 'Queen',
    icon: '👑',
    description: 'Place or remove queen directly',
  },
];

function isTutorialTarget(modeValue: string): boolean {
  if (!queensStore.isTutorialMode) return false;
  if (!queensStore.highlightToolSelector) return false;
  return modeValue === 'queen';
}

function selectMode(modeValue: 'auto' | 'flag' | 'queen') {
  queensStore.setPlacementMode(modeValue);
}

function toggleAutoFlagging() {
  queensStore.setAutoFlagging(!queensStore.uiState.autoFlagging);
}
</script>

<script lang="ts">
export default {
  name: 'QueensToolSelector',
};
</script>
