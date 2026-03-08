<template>
  <div class="space-y-3">
    <h3 class="text-lg font-bold text-purple-300">Create Pattern Card</h3>

    <div class="grid grid-cols-2 gap-2">
      <label class="text-sm">
        <div class="text-gray-300 mb-1">ID (optional)</div>
        <input
          v-model="idInput"
          class="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600"
          placeholder="pc-custom-1"
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
          type="button"
          class="px-3 py-1 rounded text-xs font-semibold"
          :class="selectedTool === tool.id ? tool.activeClass : 'bg-gray-700 hover:bg-gray-600'"
          @click="selectedTool = tool.id"
          :aria-label="`Select ${tool.label} tool`"
          :aria-pressed="selectedTool === tool.id"
        >
          {{ tool.label }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-sm text-gray-300">Pattern Grid</div>
      <div class="inline-grid gap-1" :style="gridStyle">
        <button
          v-for="cell in gridCells"
          :key="cell.key"
          type="button"
          class="w-8 h-8 rounded border border-gray-500 flex items-center justify-center text-xs"
          :class="cell.cellClass"
          @click="applyTool(cell.row, cell.col)"
          :aria-label="cell.ariaLabel"
        >
          <span v-if="cell.hasFlag">🚧</span>
        </button>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
        @click="clearFlags"
        aria-label="Clear all flagged output cells"
      >
        Clear Flags
      </button>
      <button
        type="button"
        class="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
        @click="clearActive"
        aria-label="Clear all active pattern cells"
      >
        Clear Active
      </button>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 px-3 py-2 rounded bg-gray-600 hover:bg-gray-500 text-sm font-semibold"
        @click="$emit('cancel')"
        aria-label="Cancel custom pattern card creation"
      >
        Cancel
      </button>
      <button
        type="button"
        class="flex-1 px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="activeCells.size === 0 || flagCells.size === 0"
        @click="handleSave"
        aria-label="Save custom pattern card"
      >
        Save Card
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type DesignerTool = 'active' | 'other' | 'flag';

const emit = defineEmits<{
  save: [
    {
      id?: string;
      size: number;
      cells: Array<{ row: number; col: number; activeSquare?: boolean }>;
      outputFlags: Array<{ row: number; col: number }>;
    },
  ];
  cancel: [];
}>();

const idInput = ref('');
const size = ref(5);
const selectedTool = ref<DesignerTool>('active');

const activeCells = ref(new Set<string>());
const flagCells = ref(new Set<string>());

const tools: Array<{ id: DesignerTool; label: string; activeClass: string }> = [
  { id: 'active', label: 'Active', activeClass: 'bg-emerald-700' },
  { id: 'other', label: 'Other', activeClass: 'bg-gray-500' },
  { id: 'flag', label: 'Flag', activeClass: 'bg-yellow-700' },
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

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${size.value}, minmax(0, 1fr))`,
}));

const gridCells = computed(() => {
  const cells: Array<{
    key: string;
    row: number;
    col: number;
    hasFlag: boolean;
    cellClass: string;
    ariaLabel: string;
  }> = [];

  for (let row = 0; row < size.value; row++) {
    for (let col = 0; col < size.value; col++) {
      const key = toKey(row, col);
      const isActive = activeCells.value.has(key);
      const hasFlag = flagCells.value.has(key);
      const cellClass = isActive ? 'bg-emerald-600' : 'bg-gray-600';
      const stateLabel = hasFlag ? 'flagged output' : isActive ? 'active pattern' : 'other';
      const ariaLabel = `Pattern cell row ${row + 1}, column ${col + 1}, currently ${stateLabel}`;

      cells.push({ key, row, col, hasFlag, cellClass, ariaLabel });
    }
  }

  return cells;
});

function sortedPositions(keys: Set<string>): Array<{ row: number; col: number }> {
  return Array.from(keys)
    .map(fromKey)
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
}

function handleSave() {
  emit('save', {
    id: idInput.value.trim() || undefined,
    size: size.value,
    cells: sortedPositions(activeCells.value).map((pos) => ({ ...pos, activeSquare: true })),
    outputFlags: sortedPositions(flagCells.value),
  });
}

defineOptions({
  name: 'MobilePatternCardDesigner',
});
</script>
