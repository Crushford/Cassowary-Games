<template>
  <div class="flex items-center justify-center bg-semantic-neutral-800 p-2 rounded-lg">
    <!-- Mode dropdown -->
    <div class="flex items-center relative">
      <div class="relative">
        <button
          class="px-3 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-lg bg-semantic-neutral-700 text-semantic-neutral-300 hover:bg-semantic-neutral-600"
          :aria-expanded="modeDropdownOpen"
          aria-label="Select digging mode"
          @click="toggleModeDropdown"
        >
          <span>{{ getCurrentModeIcon() }}</span>
          <span class="text-xs">▼</span>
        </button>

        <!-- Mode dropdown -->
        <div
          v-if="modeDropdownOpen"
          class="absolute bottom-full left-0 mb-1 bg-semantic-neutral-900 text-semantic-neutral-100 rounded shadow-lg border border-semantic-neutral-700 z-20 min-w-[280px]"
        >
          <div class="px-4 py-3 border-b border-semantic-neutral-700">
            <div class="font-semibold text-sm">Change what each tap does in the game</div>
          </div>
          <div
            v-for="mode in modes"
            :key="mode.value"
            class="px-4 py-3 hover:bg-semantic-neutral-700 cursor-pointer transition-colors duration-150"
            :class="harvestStore.uiState.diggingMode === mode.value ? 'bg-feedback-infoMuted' : ''"
            @click="selectMode(mode.value)"
          >
            <div class="flex items-start space-x-3">
              <span class="text-lg">{{ mode.icon }}</span>
              <div>
                <div class="font-semibold text-sm">{{ mode.label }}</div>
                <div class="text-xs text-semantic-neutral-300">{{ mode.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-semantic-neutral-500"></div>

    <!-- Auto-flagging toggle -->
    <div class="flex items-center relative">
      <button
        class="px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-xl relative"
        :class="[
          harvestStore.uiState.autoFlagging
            ? 'bg-semantic-success-600 text-white shadow'
            : 'bg-semantic-neutral-700 text-semantic-neutral-300 hover:bg-semantic-neutral-600',
        ]"
        :aria-pressed="harvestStore.uiState.autoFlagging"
        @click="harvestStore.toggleAutoFlagging()"
      >
        <span>🤖</span>
        <span>🚧</span>
      </button>
      <!-- Question mark icon positioned on top of auto-flag button -->
      <button
        class="absolute -top-1 -right-1 bg-semantic-neutral-900 text-semantic-neutral-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-semantic-neutral-600 hover:bg-semantic-neutral-700 focus:outline-none z-30"
        aria-label="Show info about auto-flag"
        @click.stop="toggleTooltip('autoFlag')"
      >
        ?
      </button>
      <!-- Tooltip for auto-flag -->
      <div
        v-if="tooltipOpen === 'autoFlag'"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-20 bg-semantic-neutral-900 text-semantic-neutral-100 text-xs rounded shadow-lg px-4 py-3 w-64 border border-semantic-neutral-700"
      >
        <div class="font-semibold text-sm mb-1">Auto-flag blocked positions</div>
        <div>If enabled, automatically flag all blocked positions when you find a honeypot.</div>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-semantic-neutral-500"></div>

    <!-- Undo last flag button -->
    <div class="flex items-center relative">
      <button
        class="px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-xl relative bg-semantic-neutral-700 text-semantic-neutral-300 hover:bg-semantic-neutral-600"
        aria-label="Undo last flag"
        @click="undoLastFlag"
      >
        <span>↶</span>
        <span>🚧</span>
      </button>
      <!-- Question mark icon positioned on top of undo button -->
      <button
        class="absolute -top-1 -right-1 bg-semantic-neutral-900 text-semantic-neutral-300 rounded-full w-6 h-6 flex items-center justify-center text-base border border-semantic-neutral-600 hover:bg-semantic-neutral-700 focus:outline-none z-30"
        aria-label="Show info about undo flag"
        @click.stop="toggleTooltip('undo')"
      >
        ?
      </button>
      <!-- Tooltip for undo flag -->
      <div
        v-if="tooltipOpen === 'undo'"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-20 bg-semantic-neutral-900 text-semantic-neutral-100 text-xs rounded shadow-lg px-4 py-3 w-64 border border-semantic-neutral-700"
      >
        <div class="font-semibold text-sm mb-1">Undo last flag</div>
        <div>Remove the last flag you placed on the board.</div>
      </div>
    </div>

    <!-- Divider -->
    <div v-if="!isGameOnly" class="mx-3 h-10 border-l border-semantic-neutral-500"></div>

    <!-- Size selector -->
    <BoardSizeDropdown v-if="!isGameOnly" :store="harvestStore" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue';
import { useHarvestStore } from '../../stores/harvestStore';

interface Props {
  isGameOnly?: boolean;
}

withDefaults(defineProps<Props>(), {
  isGameOnly: false,
});

const BoardSizeDropdown = defineAsyncComponent(() => import('../shared/BoardSizeDropdown.vue'));

const harvestStore = useHarvestStore();

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

const tooltipOpen = ref<string | null>(null);
const modeDropdownOpen = ref(false);

function getCurrentModeIcon(): string {
  const currentMode = modes.find((mode) => mode.value === harvestStore.uiState.diggingMode);
  return currentMode ? currentMode.icon : '🔄';
}

function toggleModeDropdown() {
  modeDropdownOpen.value = !modeDropdownOpen.value;
  // Close other dropdowns when opening mode dropdown
  if (modeDropdownOpen.value) {
    tooltipOpen.value = null;
  }
}

function selectMode(modeValue: 'auto' | 'dig' | 'flag') {
  harvestStore.uiState.diggingMode = modeValue;
  modeDropdownOpen.value = false;
}

function toggleTooltip(modeValue: string) {
  tooltipOpen.value = tooltipOpen.value === modeValue ? null : modeValue;
}

function undoLastFlag() {
  harvestStore.undoLastFlag();
  tooltipOpen.value = null;
}

function handleClickOutside(event: MouseEvent) {
  const toolSelector = document.querySelector('.bg-semantic-neutral-800');
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
  () => harvestStore.uiState.diggingMode,
  () => {
    modeDropdownOpen.value = false;
  }
);
watch(
  () => harvestStore.uiState.autoFlagging,
  () => {
    if (tooltipOpen.value === 'autoFlag') tooltipOpen.value = null;
  }
);
</script>

<script lang="ts">
export default {
  name: 'ToolSelector',
};
</script>
