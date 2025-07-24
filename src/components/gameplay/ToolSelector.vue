<template>
  <div class="flex items-center justify-center bg-slate-800 p-2 rounded-lg">
    <!-- Mode radio group -->
    <div class="flex items-center space-x-1 bg-slate-700 rounded-md px-1 py-0.5 relative">
      <div v-for="mode in modes" :key="mode.value" class="relative">
        <button
          class="px-3 py-2 rounded-md transition-colors duration-200 flex items-center justify-center focus:outline-none min-w-[44px] min-h-[44px] text-xl"
          :class="[
            gameStore.uiState.diggingMode === mode.value
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
          ]"
          @click="gameStore.uiState.diggingMode = mode.value"
          :aria-pressed="gameStore.uiState.diggingMode === mode.value"
        >
          <span>{{ mode.icon }}</span>
        </button>
      </div>
      <!-- Single question mark icon for all modes -->
      <button
        class="ml-2 bg-slate-900 text-slate-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-slate-600 hover:bg-slate-700 focus:outline-none z-10 relative"
        @click.stop="toggleTooltip('modes')"
        aria-label="Show info about tool modes"
      >
        ?
      </button>
      <!-- Tooltip for all modes -->
      <div
        v-if="tooltipOpen === 'modes'"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-20 bg-slate-900 text-slate-100 text-xs rounded shadow-lg px-4 py-3 w-64 border border-slate-700"
      >
        <div class="font-semibold text-sm mb-2">Change what each tap does in the game</div>
        <ul class="space-y-2">
          <li
            v-for="mode in modes"
            :key="mode.value"
            class="flex items-start space-x-2"
            :class="
              gameStore.uiState.diggingMode === mode.value ? 'bg-blue-700/30 rounded px-2 py-1' : ''
            "
          >
            <span class="text-lg">{{ mode.icon }}</span>
            <div>
              <span class="font-semibold text-sm">{{ mode.label }}</span>
              <div class="text-xs">{{ mode.description }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-slate-500"></div>

    <!-- Auto-flagging toggle -->
    <div class="flex items-center relative">
      <button
        class="px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-xl"
        :class="[
          gameStore.uiState.autoFlagging
            ? 'bg-green-600 text-white shadow'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
        ]"
        @click="gameStore.uiState.autoFlagging = !gameStore.uiState.autoFlagging"
        :aria-pressed="gameStore.uiState.autoFlagging"
      >
        <span>🤖</span>
        <span>🚩</span>
      </button>
      <!-- Single question mark icon for auto-flag -->
      <button
        class="ml-2 bg-slate-900 text-slate-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-slate-600 hover:bg-slate-700 focus:outline-none z-10 relative"
        @click.stop="toggleTooltip('autoFlag')"
        aria-label="Show info about auto-flag"
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

    <!-- Size selector -->
    <div class="flex items-center relative">
      <div class="relative">
        <button
          class="px-3 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
          @click="toggleSizeDropdown"
          :aria-expanded="sizeDropdownOpen"
          aria-label="Select board size"
        >
          <span>{{ gameStore.gridSize }}×{{ gameStore.gridSize }}</span>
          <span class="text-xs">▼</span>
        </button>

        <!-- Size dropdown -->
        <div
          v-if="sizeDropdownOpen"
          class="absolute bottom-full left-0 mb-1 bg-slate-900 text-slate-100 rounded shadow-lg border border-slate-700 z-20 min-w-[80px]"
        >
          <div
            v-for="size in availableSizes"
            :key="size"
            class="px-3 py-2 hover:bg-slate-700 cursor-pointer transition-colors duration-150"
            :class="size === gameStore.gridSize ? 'bg-blue-700/30' : ''"
            @click="selectSize(size)"
          >
            {{ size }}×{{ size }}
          </div>
        </div>
      </div>

      <!-- Question mark icon for size selector -->
      <button
        class="ml-2 bg-slate-900 text-slate-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-slate-600 hover:bg-slate-700 focus:outline-none z-10 relative"
        @click.stop="toggleTooltip('size')"
        aria-label="Show info about board size"
      >
        ?
      </button>

      <!-- Tooltip for size selector -->
      <div
        v-if="tooltipOpen === 'size'"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-20 bg-slate-900 text-slate-100 text-xs rounded shadow-lg px-4 py-3 w-64 border border-slate-700"
      >
        <div class="font-semibold text-sm mb-1">Board Size</div>
        <div>Change the size of the game board. Larger boards have more honeypots to find!</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useGameStore } from '../../stores/gameStore';

const gameStore = useGameStore();

const modes = [
  {
    value: 'auto' as const,
    label: 'Auto',
    icon: '🔄',
    description: 'First click flags, second click digs',
  },
  { value: 'dig' as const, label: 'Dig', icon: '⛏️', description: 'Dig for Honeypot' },
  { value: 'flag' as const, label: 'Flag', icon: '🚧', description: 'Place flag' },
];

const availableSizes = [4, 5, 6, 7, 8];

const tooltipOpen = ref<string | null>(null);
const sizeDropdownOpen = ref(false);

function toggleTooltip(modeValue: string) {
  tooltipOpen.value = tooltipOpen.value === modeValue ? null : modeValue;
}

function toggleSizeDropdown() {
  sizeDropdownOpen.value = !sizeDropdownOpen.value;
  // Close tooltip when opening dropdown
  if (sizeDropdownOpen.value) {
    tooltipOpen.value = null;
  }
}

function selectSize(size: number) {
  if (size !== gameStore.gridSize) {
    gameStore.setGridSize(size);
    // Restart the game with the new size
    if (gameStore.isTrainingDay) {
      gameStore.resetTraining();
    } else {
      gameStore.restartGame();
    }
  }
  sizeDropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const toolSelector = document.querySelector('.bg-slate-800');
  if (toolSelector && !toolSelector.contains(event.target as Node)) {
    tooltipOpen.value = null;
    sizeDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Close tooltip when mode or auto-flag changes
watch(
  () => gameStore.uiState.diggingMode,
  () => {
    if (tooltipOpen.value === 'modes') tooltipOpen.value = null;
  }
);
watch(
  () => gameStore.uiState.autoFlagging,
  () => {
    if (tooltipOpen.value === 'autoFlag') tooltipOpen.value = null;
  }
);

// Close size dropdown when grid size changes
watch(
  () => gameStore.gridSize,
  () => {
    sizeDropdownOpen.value = false;
  }
);
</script>

<script lang="ts">
export default {
  name: 'ToolSelector',
};
</script>
