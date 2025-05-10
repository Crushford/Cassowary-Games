<template>
  <div class="relative flex flex-col items-center">
    <!-- Grid Size Controls -->
    <div class="mb-4 flex gap-2 items-center">
      <input
        v-model="localGridSize"
        type="range"
        min="4"
        max="8"
        step="1"
        class="w-32 accent-blue-500"
        @change="updateGridSize"
      />
      <span class="text-sm font-semibold text-white">{{ localGridSize }}x{{ localGridSize }}</span>
    </div>

    <!-- Game Grid -->
    <div
      class="grid bg-slate-800 border-2 border-slate-700 p-1 rounded-lg shadow-lg"
      :style="{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gap: '2px',
      }"
    >
      <template v-for="(row, rowIndex) in grid" :key="rowIndex">
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="w-12 h-12 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
          :class="[
            cell.groupColor
              ? colorClassMap[cell.groupColor] || 'bg-slate-700 hover:bg-slate-600'
              : 'bg-slate-700 hover:bg-slate-600',
            { 'ring-2 ring-white ring-opacity-70': cell.state === 'queen' },
            { 'ring-2 ring-red-500 ring-opacity-70': cell.state === 'invalid' },
          ]"
          @click="handleCellClick(rowIndex, colIndex)"
          @contextmenu.prevent="handleRightClick(rowIndex, colIndex)"
        >
          <span v-if="cell.state === 'queen'" class="text-xl text-white">♛</span>
          <span v-else-if="cell.state === 'flag'" class="text-sm text-yellow-400">🚩</span>
          <span v-else-if="cell.state === 'invalid'" class="text-xl text-red-500">⚠️</span>
          <span v-else class="text-transparent">.</span>
        </div>
      </template>
    </div>

    <!-- Control Buttons -->
    <div class="mt-4 flex gap-4">
      <button
        @click="$emit('undo')"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Undo
      </button>
      <button
        @click="$emit('restart')"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        Restart
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface GridCell {
  position: { row: number; col: number };
  state: 'empty' | 'queen' | 'flag' | 'invalid';
  groupColor?: string;
  playerMark?: 'queen' | 'flag';
}

const props = defineProps({
  grid: {
    type: Array as () => GridCell[][],
    required: true,
  },
  gridSize: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['undo', 'restart']);

const localGridSize = ref(props.gridSize);

// Tailwind color class map
const colorClassMap: Record<string, string> = {
  red: 'bg-red-500/50 hover:bg-red-500/70',
  blue: 'bg-blue-500/50 hover:bg-blue-500/70',
  green: 'bg-green-500/50 hover:bg-green-500/70',
  yellow: 'bg-yellow-500/50 hover:bg-yellow-500/70',
  purple: 'bg-purple-500/50 hover:bg-purple-500/70',
  pink: 'bg-pink-500/50 hover:bg-pink-500/70',
  orange: 'bg-orange-500/50 hover:bg-orange-500/70',
  teal: 'bg-teal-500/50 hover:bg-teal-500/70',
  // Add more as needed
};

// Watch for grid size changes from parent
watch(
  () => props.gridSize,
  (newSize) => {
    localGridSize.value = newSize;
  }
);

// Handle cell clicks (place or remove a queen)
function handleCellClick(row: number, col: number) {
  // This is handled by the game store via the parent component
}

// Handle right-clicks (place a flag)
function handleRightClick(row: number, col: number) {
  // This is handled by the game store via the parent component
}

// Update grid size
function updateGridSize() {
  // This is handled by the game store via the parent component
}
</script>
