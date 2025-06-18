<template>
  <div class="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg">
    <button
      v-for="mode in modes"
      :key="mode.value"
      class="px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-1"
      :class="[
        gameStore.uiState.diggingMode === mode.value
          ? 'bg-blue-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
      ]"
      @click="gameStore.uiState.diggingMode = mode.value"
    >
      <span class="text-lg">{{ mode.icon }}</span>
      <span class="text-sm">{{ mode.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore';

const gameStore = useGameStore();

const modes = [
  { value: 'auto' as const, label: 'Auto', icon: '🔄' },
  { value: 'dig' as const, label: 'Dig', icon: '⛏️' },
  { value: 'flag' as const, label: 'Flag', icon: '🚧' },
];
</script>

<script lang="ts">
export default {
  name: 'DiggingModeToggle',
};
</script>
