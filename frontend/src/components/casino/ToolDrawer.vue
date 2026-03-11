<template>
  <div class="flex items-center justify-center bg-slate-800 p-2 rounded-lg">
    <!-- Mode dropdown -->
    <div class="flex items-center relative">
      <div class="relative">
        <button
          class="px-3 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
          :aria-expanded="modeDropdownOpen"
          aria-label="Select flipping mode"
          @click="toggleModeDropdown"
        >
          <span>{{ getCurrentModeIcon() }}</span>
          <span class="text-xs">▼</span>
        </button>

        <!-- Mode dropdown -->
        <div
          v-if="modeDropdownOpen"
          class="absolute bottom-full left-0 mb-1 bg-slate-900 text-slate-100 rounded shadow-lg border border-slate-700 z-20 min-w-[280px]"
        >
          <div class="px-4 py-3 border-b border-slate-700">
            <div class="font-semibold text-sm">Change what each tap does in the game</div>
          </div>
          <div
            v-for="mode in modes"
            :key="mode.value"
            class="px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors duration-150"
            :class="roundStore.uiState?.flippingMode === mode.value ? 'bg-blue-700/30' : ''"
            @click="selectMode(mode.value)"
          >
            <div class="flex items-start space-x-3">
              <span class="text-lg">{{ mode.icon }}</span>
              <div>
                <div class="font-semibold text-sm">{{ mode.label }}</div>
                <div class="text-xs text-slate-300">{{ mode.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-slate-500"></div>

    <!-- Auto-flagging toggle -->
    <div class="flex items-center relative">
      <button
        class="px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-xl relative"
        :class="[
          roundStore.uiState?.autoFlagging
            ? 'bg-green-600 text-white shadow'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
        ]"
        :aria-pressed="roundStore.uiState?.autoFlagging"
        @click="roundStore.toggleAutoFlagging?.()"
      >
        <span>🤖</span>
        <span>🚧</span>
      </button>
      <!-- Question mark icon positioned on top of auto-flag button -->
      <button
        class="absolute -top-1 -right-1 bg-slate-900 text-slate-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-slate-600 hover:bg-slate-700 focus:outline-none z-30"
        aria-label="Show info about auto-flag"
        @click.stop="toggleTooltip('autoFlag')"
      >
        ?
      </button>
      <!-- Tooltip for auto-flag -->
      <div
        v-if="tooltipOpen === 'autoFlag'"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-20 bg-slate-900 text-slate-100 text-xs rounded shadow-lg px-4 py-3 w-64 border border-slate-700"
      >
        <div class="font-semibold text-sm mb-1">Auto-flag blocked positions</div>
        <div>If enabled, automatically flag all blocked positions when you find a honeypot.</div>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-slate-500"></div>

    <!-- Undo last flag button -->
    <div class="flex items-center relative">
      <button
        class="px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-xl relative bg-slate-700 text-slate-300 hover:bg-slate-600"
        aria-label="Undo last flag"
        @click="undoLastFlag"
      >
        <span>↶</span>
        <span>🚧</span>
      </button>
      <!-- Question mark icon positioned on top of undo button -->
      <button
        class="absolute -top-1 -right-1 bg-slate-900 text-slate-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-slate-600 hover:bg-slate-700 focus:outline-none z-30"
        aria-label="Show info about undo flag"
        @click.stop="toggleTooltip('undo')"
      >
        ?
      </button>
      <!-- Tooltip for undo flag -->
      <div
        v-if="tooltipOpen === 'undo'"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-20 bg-slate-900 text-slate-100 text-xs rounded shadow-lg px-4 py-3 w-64 border border-slate-700"
      >
        <div class="font-semibold text-sm mb-1">Undo last flag</div>
        <div>Remove the last flag you placed on the board.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoundStore } from '../../stores/round';

const roundStore = useRoundStore();

const modes = [
  {
    value: 'auto' as const,
    label: 'Auto',
    icon: '🔄',
    description: 'First click flags, second click flips',
  },
  { value: 'flip' as const, label: 'Flip', icon: '🃏', description: 'Flip card to reveal' },
  { value: 'flag' as const, label: 'Flag', icon: '🚧', description: 'Place flag' },
];

const tooltipOpen = ref<string | null>(null);
const modeDropdownOpen = ref(false);

function getCurrentModeIcon(): string {
  const currentMode = modes.find((mode) => mode.value === roundStore.uiState?.flippingMode);
  return currentMode ? currentMode.icon : '🔄';
}

function toggleModeDropdown() {
  modeDropdownOpen.value = !modeDropdownOpen.value;
  // Close other dropdowns when opening mode dropdown
  if (modeDropdownOpen.value) {
    tooltipOpen.value = null;
  }
}

function selectMode(modeValue: 'auto' | 'flip' | 'flag') {
  roundStore.setFlippingMode(modeValue);
  modeDropdownOpen.value = false;
}

function toggleTooltip(modeValue: string) {
  tooltipOpen.value = tooltipOpen.value === modeValue ? null : modeValue;
}

function undoLastFlag() {
  roundStore.undoLastFlag?.();
  tooltipOpen.value = null;
}

function handleClickOutside(event: MouseEvent) {
  const toolSelector = document.querySelector('.bg-slate-800');
  if (toolSelector && !toolSelector.contains(event.target as Node)) {
    tooltipOpen.value = null;
    modeDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Close dropdowns when mode or auto-flag changes
watch(
  () => roundStore.uiState?.flippingMode,
  () => {
    modeDropdownOpen.value = false;
  }
);
watch(
  () => roundStore.uiState?.autoFlagging,
  () => {
    if (tooltipOpen.value === 'autoFlag') tooltipOpen.value = null;
  }
);
</script>

<script lang="ts">
export default {
  name: 'ToolDrawer',
};
</script>
