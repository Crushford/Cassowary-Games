<template>
  <div class="space-y-4">
    <div v-if="title || description" class="space-y-1">
      <h3 v-if="title" class="text-lg font-bold text-semantic-info-300">{{ title }}</h3>
      <p v-if="description" class="text-sm text-semantic-neutral-300">{{ description }}</p>
    </div>

    <div
      v-if="showId || showCost"
      class="grid gap-2"
      :class="showId && showCost ? 'grid-cols-2' : 'grid-cols-1'"
    >
      <label v-if="showId" class="text-sm">
        <div class="mb-1 text-semantic-neutral-300">ID{{ idOptional ? ' (optional)' : '' }}</div>
        <input
          :value="draftId"
          class="w-full rounded border border-semantic-neutral-600 bg-semantic-neutral-700 px-2 py-1"
          :placeholder="idPlaceholder"
          @input="updateId(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label v-if="showCost" class="text-sm">
        <div class="mb-1 text-semantic-neutral-300">Cost</div>
        <input
          :value="draftCost"
          type="number"
          min="0"
          class="w-full rounded border border-semantic-neutral-600 bg-semantic-neutral-700 px-2 py-1"
          @input="updateCost(($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <label class="text-sm">
        <div class="mb-1 text-semantic-neutral-300">Size</div>
        <input
          :value="draftSize"
          type="number"
          min="3"
          max="9"
          class="w-full rounded border border-semantic-neutral-600 bg-semantic-neutral-700 px-2 py-1"
          @input="updateSize(($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div>
      <div class="mb-2 text-sm text-semantic-neutral-300">Tool</div>
      <div class="flex gap-2">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="rounded px-3 py-1 text-sm font-semibold"
          :class="
            selectedTool === tool.id
              ? tool.activeClass
              : 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600'
          "
          :aria-label="`Select ${tool.label} tool`"
          :aria-pressed="selectedTool === tool.id"
          @click="selectedTool = tool.id"
        >
          {{ tool.label }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-sm text-semantic-neutral-300">{{ gridLabel }}</div>
      <div class="inline-grid gap-1" :style="gridStyle">
        <button
          v-for="cell in gridCells"
          :key="cell.key"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded border border-semantic-neutral-500 text-xs"
          :class="cell.cellClass"
          :aria-label="cell.ariaLabel"
          @click="applyTool(cell.row, cell.col)"
        >
          <span v-if="cell.hasFlag">🚧</span>
        </button>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="rounded bg-semantic-neutral-700 px-3 py-2 text-sm hover:bg-semantic-neutral-600"
        @click="clearFlags"
      >
        Clear Flags
      </button>
      <button
        type="button"
        class="rounded bg-semantic-neutral-700 px-3 py-2 text-sm hover:bg-semantic-neutral-600"
        @click="clearActive"
      >
        Clear Active
      </button>
      <button
        v-if="showReset"
        type="button"
        class="rounded bg-semantic-danger-700 px-3 py-2 text-sm hover:bg-semantic-danger-600"
        @click="resetAll"
      >
        Reset
      </button>
    </div>

    <div v-if="showActions" class="flex gap-2">
      <button
        v-if="showCancel"
        type="button"
        class="flex-1 rounded bg-semantic-neutral-600 px-3 py-2 text-sm font-semibold hover:bg-semantic-neutral-500"
        @click="$emit('cancel')"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="flex-1 rounded bg-semantic-info-700 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-semantic-info-600"
        :disabled="!canSave"
        @click="$emit('save', props.modelValue)"
      >
        {{ saveLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PatternEditorDraft } from './patternEditorTypes';

type DesignerTool = 'active' | 'other' | 'flag';

const props = withDefaults(
  defineProps<{
    modelValue: PatternEditorDraft;
    title?: string;
    description?: string;
    gridLabel?: string;
    saveLabel?: string;
    cancelLabel?: string;
    idPlaceholder?: string;
    showId?: boolean;
    idOptional?: boolean;
    showCost?: boolean;
    showReset?: boolean;
    showActions?: boolean;
    showCancel?: boolean;
  }>(),
  {
    title: '',
    description: '',
    gridLabel: 'Pattern Grid',
    saveLabel: 'Save',
    cancelLabel: 'Cancel',
    idPlaceholder: '',
    showId: true,
    idOptional: false,
    showCost: false,
    showReset: false,
    showActions: true,
    showCancel: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [PatternEditorDraft];
  save: [PatternEditorDraft];
  cancel: [];
}>();

const selectedTool = ref<DesignerTool>('active');

const tools: Array<{ id: DesignerTool; label: string; activeClass: string }> = [
  { id: 'active', label: 'Active', activeClass: 'bg-semantic-success-700' },
  { id: 'other', label: 'Other', activeClass: 'bg-semantic-neutral-500' },
  { id: 'flag', label: 'Flag', activeClass: 'bg-semantic-warning-700' },
];

const draftId = computed(() => props.modelValue.id ?? '');
const draftCost = computed(() => props.modelValue.cost ?? 0);
const draftSize = computed(() => props.modelValue.size);

const activeCellKeys = computed(
  () =>
    new Set(
      props.modelValue.cells
        .filter((cell) => cell.activeSquare === true)
        .map((cell) => toKey(cell.row, cell.col))
    )
);

const flagCellKeys = computed(
  () => new Set(props.modelValue.outputFlags.map((flag) => toKey(flag.row, flag.col)))
);

const canSave = computed(() => activeCellKeys.value.size > 0 && flagCellKeys.value.size > 0);

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.modelValue.size}, minmax(0, 1fr))`,
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

  for (let row = 0; row < props.modelValue.size; row += 1) {
    for (let col = 0; col < props.modelValue.size; col += 1) {
      const key = toKey(row, col);
      const isActive = activeCellKeys.value.has(key);
      const hasFlag = flagCellKeys.value.has(key);
      const stateLabel = hasFlag ? 'flagged output' : isActive ? 'active pattern' : 'other';
      cells.push({
        key,
        row,
        col,
        hasFlag,
        cellClass: isActive ? 'bg-semantic-success-600' : 'bg-semantic-neutral-600',
        ariaLabel: `Pattern cell row ${row + 1}, column ${col + 1}, currently ${stateLabel}`,
      });
    }
  }

  return cells;
});

function toKey(row: number, col: number): string {
  return `${row},${col}`;
}

function fromKey(key: string): { row: number; col: number } {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

function sortedPositions(keys: Set<string>): Array<{ row: number; col: number }> {
  return Array.from(keys)
    .map(fromKey)
    .sort((left, right) => (left.row === right.row ? left.col - right.col : left.row - right.row));
}

function emitDraft(nextDraft: PatternEditorDraft): void {
  emit('update:modelValue', nextDraft);
}

function updateId(value: string): void {
  emitDraft({ ...props.modelValue, id: value });
}

function updateCost(value: string): void {
  const parsed = Number(value);
  emitDraft({ ...props.modelValue, cost: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 });
}

function updateSize(value: string): void {
  const parsed = Number(value);
  const nextSize = Math.min(9, Math.max(3, Number.isFinite(parsed) ? Math.floor(parsed) : 5));
  emitDraft({
    ...props.modelValue,
    size: nextSize,
    cells: props.modelValue.cells.filter(
      (cell) => cell.row >= 0 && cell.row < nextSize && cell.col >= 0 && cell.col < nextSize
    ),
    outputFlags: props.modelValue.outputFlags.filter(
      (flag) => flag.row >= 0 && flag.row < nextSize && flag.col >= 0 && flag.col < nextSize
    ),
  });
}

function applyTool(row: number, col: number): void {
  const key = toKey(row, col);
  const nextActive = new Set(activeCellKeys.value);
  const nextFlags = new Set(flagCellKeys.value);

  if (selectedTool.value === 'active') {
    nextActive.add(key);
    nextFlags.delete(key);
  } else if (selectedTool.value === 'other') {
    nextActive.delete(key);
    nextFlags.delete(key);
  } else {
    nextFlags.add(key);
    nextActive.delete(key);
  }

  emitDraft({
    ...props.modelValue,
    cells: sortedPositions(nextActive).map((pos) => ({ ...pos, activeSquare: true })),
    outputFlags: sortedPositions(nextFlags),
  });
}

function clearFlags(): void {
  emitDraft({
    ...props.modelValue,
    outputFlags: [],
  });
}

function clearActive(): void {
  emitDraft({
    ...props.modelValue,
    cells: [],
  });
}

function resetAll(): void {
  emitDraft({
    ...props.modelValue,
    cells: [],
    outputFlags: [],
  });
}

defineOptions({
  name: 'SharedPatternDesigner',
});
</script>
