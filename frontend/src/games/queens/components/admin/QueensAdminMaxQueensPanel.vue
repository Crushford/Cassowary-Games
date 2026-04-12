<template>
  <section class="space-y-6">
    <AdminPanel
      title="Max Queens"
      description="Compute the maximum queen count for size and min-distance combinations, then copy the finished matrix into code constants."
    >
      <template #badge>
        <span
          class="rounded-full border border-semantic-warning-700 bg-feedback-warningSubtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-warning-200"
        >
          One-Time Tool
        </span>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm text-semantic-neutral-300" for="max-queen-sizes">
            Sizes
          </label>
          <InputText
            id="max-queen-sizes"
            v-model="sizesInput"
            class="w-full"
            placeholder="4, 5, 6, 7, 8, 9, 10, 11, 12"
          />
          <p class="text-xs leading-5 text-semantic-neutral-400">
            Comma-separated board sizes. Each size will be crossed with every valid min distance.
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm text-semantic-neutral-300" for="max-queen-distances">
            Min distances
          </label>
          <InputText
            id="max-queen-distances"
            v-model="distancesInput"
            class="w-full"
            placeholder="3, 4, 5, 6, 7, 8, 9, 10, 11, 12"
          />
          <p class="text-xs leading-5 text-semantic-neutral-400">
            Comma-separated orthogonal distances. Distances larger than a given size are skipped.
          </p>
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm text-semantic-neutral-300" for="max-queen-concurrency">
            Max concurrent jobs
          </label>
          <InputNumber
            id="max-queen-concurrency"
            v-model="maxConcurrentJobs"
            :min="1"
            :max="32"
            input-class="w-full"
            fluid
          />
          <p class="text-xs leading-5 text-semantic-neutral-400">
            Runs the easiest unresolved combinations first, with bounded parallelism.
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm text-semantic-neutral-300">Run order</label>
          <div
            class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2 text-sm text-semantic-neutral-300"
          >
            Highest min distance first, then smaller sizes first.
          </div>
          <p class="text-xs leading-5 text-semantic-neutral-400">
            This prioritizes the combinations that are most likely to finish quickly.
          </p>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-3">
        <Button
          label="Run Missing"
          severity="success"
          :disabled="isRunning || combinations.length === 0"
          @click="runMatrix"
        />
        <Button
          label="Cancel"
          severity="danger"
          outlined
          :disabled="!isRunning"
          @click="cancelRun"
        />
        <Button
          label="Copy Constants"
          outlined
          :disabled="completedRows.length === 0"
          @click="copyConstants"
        />
        <Button
          label="Clear Results"
          outlined
          :disabled="rows.length === 0 || isRunning"
          @click="clearResults"
        />
      </div>

      <div class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
        <div class="flex flex-wrap items-center gap-4 text-sm text-semantic-neutral-300">
          <span>Total combinations: {{ combinations.length }}</span>
          <span>Completed: {{ completedRows.length }}</span>
          <span>Failed: {{ failedRows.length }}</span>
          <span>Pending: {{ pendingCount }}</span>
        </div>
        <div v-if="statusMessage" class="mt-3 text-sm text-semantic-info-100">
          {{ statusMessage }}
        </div>
      </div>
    </AdminPanel>

    <AdminPanel
      title="Results"
      description="These are the exact maximums returned by the backend for the selected size/distance combinations."
    >
      <div v-if="rows.length" class="max-h-[620px] overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="text-semantic-neutral-400">
            <tr>
              <th class="px-3 py-2">Size</th>
              <th class="px-3 py-2">Min Distance</th>
              <th class="px-3 py-2">State</th>
              <th class="px-3 py-2">Max Queens</th>
              <th class="px-3 py-2">Elapsed</th>
              <th class="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="`${row.size}-${row.orthogonalMinDistance}`"
              class="border-t border-semantic-neutral-800"
            >
              <td class="px-3 py-2 text-white">{{ row.size }} x {{ row.size }}</td>
              <td class="px-3 py-2">{{ row.orthogonalMinDistance }}</td>
              <td class="px-3 py-2">
                <span :class="stateBadgeClass(row.state)">
                  {{ row.state }}
                </span>
              </td>
              <td class="px-3 py-2">{{ row.maxQueenCount ?? '—' }}</td>
              <td class="px-3 py-2">
                {{ row.elapsedMs != null ? formatDuration(row.elapsedMs) : '—' }}
              </td>
              <td class="px-3 py-2 text-semantic-danger-200">{{ row.error ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-semantic-neutral-400">
        No results yet. Run a matrix to start collecting maxima.
      </p>
    </AdminPanel>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import { queensAdminApi } from '../../admin/api';
import {
  loadQueensAdminMaxQueensInputs,
  saveQueensAdminMaxQueensInputs,
} from '../../admin/inputPersistence';
import { QUEENS_MAX_QUEEN_COUNTS } from '../../admin/maxQueenCounts';
import AdminPanel from './AdminPanel.vue';

type MaxQueenRowState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

type MaxQueenRow = {
  size: number;
  orthogonalMinDistance: number;
  state: MaxQueenRowState;
  maxQueenCount: number | null;
  elapsedMs: number | null;
  error: string | null;
};

const persistedInputs = loadQueensAdminMaxQueensInputs();
const sizesInput = ref(persistedInputs?.sizesInput ?? '4, 5, 6, 7, 8, 9, 10, 11, 12');
const distancesInput = ref(persistedInputs?.distancesInput ?? '3, 4, 5, 6, 7, 8, 9, 10, 11, 12');
const maxConcurrentJobs = ref(persistedInputs?.maxConcurrentJobs ?? 20);
const rows = ref<MaxQueenRow[]>(seedRowsFromConstants());
const isRunning = ref(false);
const statusMessage = ref('');
let abortController: AbortController | null = null;

const parsedSizes = computed(() => parseIntegerList(sizesInput.value, { min: 4, max: 20 }));
const parsedDistances = computed(() =>
  parseIntegerList(distancesInput.value, { min: 1, max: 400 })
);

const combinations = computed(() =>
  parsedSizes.value.flatMap((size) =>
    parsedDistances.value
      .filter((distance) => distance <= size)
      .map((orthogonalMinDistance) => ({ size, orthogonalMinDistance }))
  )
);

const sortedCombinations = computed(() =>
  [...combinations.value].sort((left, right) => {
    if (left.orthogonalMinDistance !== right.orthogonalMinDistance) {
      return right.orthogonalMinDistance - left.orthogonalMinDistance;
    }
    if (left.size !== right.size) {
      return left.size - right.size;
    }
    return left.orthogonalMinDistance - right.orthogonalMinDistance;
  })
);

const completedRows = computed(() => rows.value.filter((row) => row.state === 'COMPLETED'));
const failedRows = computed(() => rows.value.filter((row) => row.state === 'FAILED'));
const pendingCount = computed(
  () => rows.value.filter((row) => row.state === 'QUEUED' || row.state === 'RUNNING').length
);

watch(
  [sizesInput, distancesInput, maxConcurrentJobs],
  () => {
    saveQueensAdminMaxQueensInputs({
      sizesInput: sizesInput.value,
      distancesInput: distancesInput.value,
      maxConcurrentJobs: Math.max(1, maxConcurrentJobs.value),
    });
  },
  { immediate: true }
);

function parseIntegerList(raw: string, bounds: { min: number; max: number }): number[] {
  const values = raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(bounds.min, Math.min(bounds.max, value)));
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function formatDuration(elapsedMs: number): string {
  if (elapsedMs < 1000) return `${elapsedMs}ms`;
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

function stateBadgeClass(state: MaxQueenRowState): string {
  if (state === 'COMPLETED') return 'text-semantic-success-200';
  if (state === 'FAILED') return 'text-semantic-danger-200';
  if (state === 'RUNNING') return 'text-semantic-info-200';
  if (state === 'CANCELLED') return 'text-semantic-warning-200';
  return 'text-semantic-neutral-300';
}

function seedRowsFromConstants(): MaxQueenRow[] {
  return Object.entries(QUEENS_MAX_QUEEN_COUNTS)
    .flatMap(([size, distances]) =>
      Object.entries(distances).map(([orthogonalMinDistance, maxQueenCount]) => ({
        size: Number.parseInt(size, 10),
        orthogonalMinDistance: Number.parseInt(orthogonalMinDistance, 10),
        state: 'COMPLETED' as const,
        maxQueenCount,
        elapsedMs: null,
        error: null,
      }))
    )
    .sort((left, right) => {
      if (left.orthogonalMinDistance !== right.orthogonalMinDistance) {
        return right.orthogonalMinDistance - left.orthogonalMinDistance;
      }
      return left.size - right.size;
    });
}

async function runMatrix(): Promise<void> {
  const existingRows = new Map(
    rows.value.map((row) => [`${row.size}-${row.orthogonalMinDistance}`, row] as const)
  );
  const nextRows = sortedCombinations.value.map<MaxQueenRow>(({ size, orthogonalMinDistance }) => {
    const existing = existingRows.get(`${size}-${orthogonalMinDistance}`);
    if (existing?.state === 'COMPLETED') {
      return existing;
    }
    return {
      size,
      orthogonalMinDistance,
      state: 'QUEUED',
      maxQueenCount: existing?.maxQueenCount ?? null,
      elapsedMs: existing?.elapsedMs ?? null,
      error: null,
    };
  });
  rows.value = nextRows;
  isRunning.value = true;
  abortController = new AbortController();

  try {
    const queuedIndexes = nextRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.state !== 'COMPLETED')
      .map(({ index }) => index);

    let nextQueueIndex = 0;
    let activeJobs = 0;
    let finishedJobs = 0;
    const totalJobs = queuedIndexes.length;

    if (totalJobs === 0) {
      statusMessage.value = 'Everything in this matrix is already completed.';
      return;
    }

    await new Promise<void>((resolve) => {
      const launchNext = () => {
        if (abortController?.signal.aborted) {
          rows.value = rows.value.map((row) =>
            row.state === 'QUEUED' || row.state === 'RUNNING' ? { ...row, state: 'CANCELLED' } : row
          );
          statusMessage.value = 'Cancelled.';
          resolve();
          return;
        }

        while (activeJobs < maxConcurrentJobs.value && nextQueueIndex < queuedIndexes.length) {
          const rowIndex = queuedIndexes[nextQueueIndex];
          nextQueueIndex += 1;
          activeJobs += 1;
          const current = nextRows[rowIndex];
          updateRow(rowIndex, { state: 'RUNNING', error: null });
          updateRunStatus(totalJobs, finishedJobs, activeJobs, current);

          void queensAdminApi
            .resolveMaxQueenCount(
              {
                size: current.size,
                orthogonalMinDistance: current.orthogonalMinDistance,
              },
              abortController?.signal
            )
            .then((result) => {
              updateRow(rowIndex, {
                state: 'COMPLETED',
                maxQueenCount: result.maxQueenCount,
                elapsedMs: result.elapsedMs,
                error: null,
              });
            })
            .catch((error: unknown) => {
              const isAbort = error instanceof DOMException && error.name === 'AbortError';
              updateRow(rowIndex, {
                state: isAbort ? 'CANCELLED' : 'FAILED',
                error:
                  error instanceof Error ? error.message : 'Failed to resolve max queen count.',
              });
            })
            .finally(() => {
              activeJobs -= 1;
              finishedJobs += 1;

              if (finishedJobs >= totalJobs) {
                statusMessage.value = abortController?.signal.aborted
                  ? 'Cancelled.'
                  : `Completed ${totalJobs} max-queen computations.`;
                resolve();
                return;
              }

              const nextCurrent =
                nextQueueIndex < queuedIndexes.length
                  ? nextRows[queuedIndexes[nextQueueIndex]]
                  : null;
              updateRunStatus(totalJobs, finishedJobs, activeJobs, nextCurrent ?? undefined);
              launchNext();
            });
        }
      };

      launchNext();
    });
  } finally {
    isRunning.value = false;
    abortController = null;
  }
}

function updateRow(index: number, patch: Partial<MaxQueenRow>): void {
  rows.value = rows.value.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
}

function updateRunStatus(
  totalJobs: number,
  finishedJobs: number,
  activeJobs: number,
  current?: Pick<MaxQueenRow, 'size' | 'orthogonalMinDistance'>
): void {
  const base = `Completed ${finishedJobs} of ${totalJobs}. Active jobs: ${activeJobs}.`;
  if (current == null) {
    statusMessage.value = base;
    return;
  }
  statusMessage.value = `${base} Launching ${current.size}x${current.size} with d${current.orthogonalMinDistance}.`;
}

function cancelRun(): void {
  abortController?.abort();
}

function clearResults(): void {
  rows.value = seedRowsFromConstants();
  statusMessage.value = '';
}

async function copyConstants(): Promise<void> {
  const grouped = completedRows.value.reduce<Record<number, Record<number, number>>>((acc, row) => {
    if (row.maxQueenCount == null) return acc;
    acc[row.size] ??= {};
    acc[row.size][row.orthogonalMinDistance] = row.maxQueenCount;
    return acc;
  }, {});

  const text = [
    'export const QUEENS_MAX_QUEEN_COUNTS: Record<number, Record<number, number>> = {',
    ...Object.entries(grouped).map(([size, distances]) => {
      const distanceEntries = Object.entries(distances)
        .sort((left, right) => Number(left[0]) - Number(right[0]))
        .map(([distance, maxQueens]) => `    ${distance}: ${maxQueens},`)
        .join('\n');
      return `  ${size}: {\n${distanceEntries}\n  },`;
    }),
    '};',
  ].join('\n');

  await navigator.clipboard.writeText(text);
  statusMessage.value = 'Copied constants to clipboard.';
}

onUnmounted(() => {
  abortController?.abort();
});
</script>
