<template>
  <div class="bg-slate-800 p-4 rounded-lg shadow-lg">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-white">Color Palette</h3>

      <!-- Toggle Button -->
      <button
        @click="levelBuilderStore.toggleColorToolActive()"
        :class="[
          'px-4 py-2 rounded font-medium transition',
          levelBuilderStore.colorToolActive
            ? 'bg-green-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
        ]"
      >
        {{ levelBuilderStore.colorToolActive ? 'Deactivate Tool' : 'Activate Tool' }}
      </button>
    </div>

    <!-- Color Palette -->
    <div class="grid grid-cols-6 gap-2 mb-4">
      <button
        v-for="color in palette"
        :key="color"
        @click="handleColorClick(color)"
        :class="[
          'w-10 h-10 rounded-full border-2 flex items-center justify-center transition',
          levelBuilderStore.colorToolSelectedColor === color
            ? 'ring-4 ring-yellow-400 border-yellow-400'
            : 'border-slate-500',
          isColorUsed(color) ? 'opacity-100' : 'opacity-50',
        ]"
        :style="{ backgroundColor: color }"
      >
        <span v-if="isColorUsed(color)" class="text-white text-xs">✓</span>
      </button>
    </div>

    <!-- Selected Color Info -->
    <div class="flex items-center gap-2 text-sm">
      <span class="font-semibold">Selected Color:</span>
      <span
        v-if="levelBuilderStore.colorToolSelectedColor"
        :style="{ color: levelBuilderStore.colorToolSelectedColor }"
        >{{ levelBuilderStore.colorToolSelectedColor }}</span
      >
      <span v-else class="text-slate-400">None Selected</span>
    </div>

    <!-- Color Groups -->
    <div v-if="Object.keys(colorGroups).length > 0" class="mt-4">
      <h4 class="text-sm font-semibold text-white mb-2">Color Groups</h4>
      <div class="space-y-2">
        <div
          v-for="(positions, color) in colorGroups"
          :key="color"
          class="flex items-center justify-between bg-slate-700 p-2 rounded"
        >
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: color }"></div>
            <span class="text-sm text-white">{{ positions.length }} squares</span>
          </div>
          <button
            @click="handleDeleteColorGroup(color)"
            class="text-red-400 hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLevelBuilderStore } from '../../stores/levelBuilderStore';
import { Pos } from '../../types/types';

const levelBuilderStore = useLevelBuilderStore();
const selectedColor = ref<string | null>(null);

const palette = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  // Add more colors if needed
] as const;

type Color = (typeof palette)[number];

const colorGroups = computed(() => {
  const groups: { [key: string]: Pos[] } = {};
  for (let row = 0; row < levelBuilderStore.gridSize; row++) {
    for (let col = 0; col < levelBuilderStore.gridSize; col++) {
      const color = levelBuilderStore.grid[row][col].groupColor;
      if (color) {
        if (!groups[color]) {
          groups[color] = [];
        }
        groups[color].push({ row, col });
      }
    }
  }
  return groups;
});

const availableColors = computed(() => {
  const colors = new Set<string>();
  for (let row = 0; row < levelBuilderStore.gridSize; row++) {
    for (let col = 0; col < levelBuilderStore.gridSize; col++) {
      const color = levelBuilderStore.grid[row][col].groupColor;
      if (color) {
        colors.add(color);
      }
    }
  }
  return Array.from(colors);
});

function handleColorClick(color: Color) {
  selectedColor.value = color;
  levelBuilderStore.setActiveColorTool(color);
}

function handleDeleteColorGroup(color: string) {
  levelBuilderStore.deleteColorGroup(color);
  if (selectedColor.value === color) {
    selectedColor.value = null;
    levelBuilderStore.setActiveColorTool(null);
  }
}

function isColorUsed(color: Color) {
  return availableColors.value.includes(color);
}
</script>
