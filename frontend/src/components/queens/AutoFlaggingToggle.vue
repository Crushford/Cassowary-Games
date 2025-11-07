<template>
  <div
    id="auto-flagging-toggle"
    class="flex items-center justify-center bg-slate-800 p-2 rounded-lg relative z-50"
  >
    <!-- Toggle selector -->
    <div class="flex items-center bg-slate-700 rounded-lg p-1 gap-1">
      <button
        v-for="option in options"
        :key="option.value"
        :id="`auto-flagging-${option.value}`"
        class="px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-2 focus:outline-none min-w-[80px] text-sm font-semibold"
        :class="[
          queensStore.uiState.autoFlagging === option.value
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-transparent text-slate-300 hover:bg-slate-600',
        ]"
        @click="selectOption(option.value)"
        :aria-pressed="queensStore.uiState.autoFlagging === option.value"
        :aria-label="`${option.label}: ${option.description}`"
      >
        <span class="text-lg" :aria-hidden="true">{{ option.icon }}</span>
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQueensStore } from '../../stores/queensStore';

const queensStore = useQueensStore();

const options = [
  {
    value: true,
    label: 'On',
    icon: '✅',
    description: 'Automatically flag squares where queens cannot be placed',
  },
  {
    value: false,
    label: 'Off',
    icon: '❌',
    description: 'Do not automatically flag squares',
  },
];

function selectOption(value: boolean) {
  queensStore.setAutoFlagging(value);
}
</script>

<script lang="ts">
export default {
  name: 'AutoFlaggingToggle',
};
</script>
