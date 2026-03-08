<template>
  <div class="h-svh w-full max-w-[980px] mx-auto bg-gray-900 text-white p-4 overflow-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-emerald-400">Pattern Card Designer</h1>
      <router-link to="/queens" class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm">
        Back
      </router-link>
    </div>

    <p class="text-sm text-gray-300 mb-4">
      Build pattern cards by painting <span class="text-emerald-400 font-semibold">active (green)</span>,
      <span class="text-gray-300 font-semibold">other (grey)</span>, and
      <span class="text-yellow-300 font-semibold">flag outputs</span>. Default size is 5x5.
    </p>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="bg-gray-800 rounded-lg p-4 space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <label class="text-sm">
            <div class="text-gray-300 mb-1">ID</div>
            <input v-model="id" class="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600" />
          </label>
          <label class="text-sm">
            <div class="text-gray-300 mb-1">Cost</div>
            <input
              v-model.number="cost"
              type="number"
              min="0"
              class="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600"
            />
          </label>
          <label class="text-sm">
            <div class="text-gray-300 mb-1">Size</div>
            <input
              v-model.number="size"
              type="number"
              min="3"
              max="9"
              class="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600"
            />
          </label>
        </div>

        <div>
          <div class="text-sm text-gray-300 mb-2">Tool</div>
          <div class="flex gap-2">
            <button
              v-for="tool in tools"
              :key="tool.id"
              class="px-3 py-1 rounded text-sm font-semibold"
              :class="selectedTool === tool.id ? tool.activeClass : 'bg-gray-700 hover:bg-gray-600'"
              @click="selectedTool = tool.id"
            >
              {{ tool.label }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-sm text-gray-300">Grid</div>
          <div class="inline-grid gap-1" :style="gridStyle">
            <button
              v-for="cell in gridCells"
              :key="cell.key"
              class="w-8 h-8 rounded border border-gray-500 flex items-center justify-center text-xs"
              :class="cell.cellClass"
              @click="applyTool(cell.row, cell.col)"
            >
              <span v-if="cell.hasFlag">🚧</span>
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <button class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm" @click="clearFlags">
            Clear Flags
          </button>
          <button class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm" @click="clearActive">
            Clear Active
          </button>
          <button class="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-sm" @click="resetAll">
            Reset
          </button>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-gray-300">Generated Code</div>
          <button class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-sm" @click="copyCode">
            Copy
          </button>
        </div>
        <pre class="text-xs bg-gray-900 p-3 rounded overflow-auto max-h-[70svh]">{{ generatedCode }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type DesignerTool = 'active' | 'other' | 'flag';

const id = ref('pattern-new-card');
const cost = ref(60);
const size = ref(5);
const selectedTool = ref<DesignerTool>('active');

const activeCells = ref(new Set<string>());
const flagCells = ref(new Set<string>());

const tools: Array<{ id: DesignerTool; label: string; activeClass: string }> = [
  { id: 'active', label: 'Active (Green)', activeClass: 'bg-emerald-700' },
  { id: 'other', label: 'Other (Grey)', activeClass: 'bg-gray-500' },
  { id: 'flag', label: 'Flag Output', activeClass: 'bg-yellow-700' },
];

function toKey(row: number, col: number): string {
  return `${row},${col}`;
}

function fromKey(key: string): { row: number; col: number } {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

watch(size, (nextSize) => {
  if (nextSize < 3) size.value = 3;
  if (nextSize > 9) size.value = 9;

  const max = size.value - 1;
  for (const key of Array.from(activeCells.value)) {
    const pos = fromKey(key);
    if (pos.row > max || pos.col > max) {
      activeCells.value.delete(key);
    }
  }
  for (const key of Array.from(flagCells.value)) {
    const pos = fromKey(key);
    if (pos.row > max || pos.col > max) {
      flagCells.value.delete(key);
    }
  }
});

function applyTool(row: number, col: number) {
  const key = toKey(row, col);

  if (selectedTool.value === 'active') {
    activeCells.value.add(key);
    flagCells.value.delete(key);
    return;
  }

  if (selectedTool.value === 'other') {
    activeCells.value.delete(key);
    flagCells.value.delete(key);
    return;
  }

  if (selectedTool.value === 'flag') {
    flagCells.value.add(key);
    activeCells.value.delete(key);
  }
}

function clearFlags() {
  flagCells.value.clear();
}

function clearActive() {
  activeCells.value.clear();
}

function resetAll() {
  activeCells.value.clear();
  flagCells.value.clear();
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${size.value}, minmax(0, 1fr))`,
}));

const gridCells = computed(() => {
  const cells: Array<{ key: string; row: number; col: number; hasFlag: boolean; cellClass: string }> = [];

  for (let row = 0; row < size.value; row++) {
    for (let col = 0; col < size.value; col++) {
      const key = toKey(row, col);
      const isActive = activeCells.value.has(key);
      const hasFlag = flagCells.value.has(key);
      const cellClass = isActive ? 'bg-emerald-600' : 'bg-gray-600';

      cells.push({ key, row, col, hasFlag, cellClass });
    }
  }

  return cells;
});

function sortedPositions(keys: Set<string>): Array<{ row: number; col: number }> {
  return Array.from(keys)
    .map(fromKey)
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
}

const generatedCode = computed(() => {
  const cellLines = sortedPositions(activeCells.value)
    .map((pos) => `      { row: ${pos.row}, col: ${pos.col}, activeSquare: true },`)
    .join('\n');

  const flagLines = sortedPositions(flagCells.value)
    .map((pos) => `      { row: ${pos.row}, col: ${pos.col} },`)
    .join('\n');

  return `  {\n    id: '${id.value}',\n    cost: ${cost.value},\n    size: ${size.value},\n    cells: [\n${cellLines}\n    ],\n    outputFlags: [\n${flagLines}\n    ],\n  },`;
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value);
  } catch {
    // no-op fallback for unsupported clipboard environments
  }
}

defineOptions({
  name: 'PatternCardDesigner',
});
</script>
