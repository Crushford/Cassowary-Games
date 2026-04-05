<template>
  <section class="space-y-6">
    <div class="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-white">Batch Run Setup</h2>
            <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
              Submit many puzzles at once, compare strategies, and time how long each run takes.
            </p>
          </div>
          <div
            class="rounded-full border border-edge-warningMuted bg-feedback-warningSubtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-semantic-warning-200"
          >
            Experimental
          </div>
        </div>

        <div class="mt-5 space-y-4">
          <label class="block text-sm text-semantic-neutral-300" for="batch-sizes">
            Puzzle sizes
          </label>
          <input
            id="batch-sizes"
            v-model="sizesInput"
            type="text"
            class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
            placeholder="4, 6, 8"
          />
          <p class="text-xs leading-5 text-semantic-neutral-400">
            Enter one or more sizes separated by commas. Each size will be run against every
            selected strategy.
          </p>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-runs">
              Runs per combination
            </label>
            <input
              id="batch-runs"
              v-model.number="runsPerCombination"
              type="number"
              min="1"
              max="100"
              class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-concurrency">
              Max concurrent jobs
            </label>
            <input
              id="batch-concurrency"
              v-model.number="maxConcurrentJobs"
              type="number"
              min="1"
              max="12"
              class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-min-group">
              Minimum region size
            </label>
            <input
              id="batch-min-group"
              v-model.number="minimumGroupSize"
              type="number"
              min="1"
              max="20"
              class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div class="text-sm text-semantic-neutral-300">Strategies</div>
          <div class="grid gap-2 md:grid-cols-2">
            <label
              v-for="strategy in strategyOptions"
              :key="strategy.value"
              class="flex items-start gap-3 rounded-2xl border border-semantic-neutral-700 bg-semantic-neutral-900 px-3 py-3 text-sm text-semantic-neutral-200"
            >
              <input
                v-model="selectedStrategies"
                type="checkbox"
                :value="strategy.value"
                class="mt-1"
              />
              <span>
                <span class="block font-semibold text-white">{{ strategy.label }}</span>
                <span class="mt-1 block text-xs text-semantic-neutral-400">
                  {{ strategy.description }}
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-white">Save successful puzzles</div>
              <div class="mt-1 text-xs text-semantic-neutral-400">
                Save successful generated puzzles into the DB. Canonical duplicates are skipped and
                do not create extra rows.
              </div>
            </div>
            <input v-model="saveSuccessfulPuzzles" type="checkbox" />
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="rounded-xl bg-semantic-success-600 px-4 py-2.5 font-semibold text-white transition hover:bg-semantic-success-500 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="
              store.batchLoading || parsedSizes.length === 0 || selectedStrategies.length === 0
            "
            @click="startBatch"
          >
            Start Batch
          </button>
          <button
            v-if="
              store.batchLoading ||
              store.batchStatus?.state === 'RUNNING' ||
              store.batchStatus?.state === 'QUEUED'
            "
            type="button"
            class="rounded-xl border border-semantic-danger-700 bg-feedback-dangerSubtle px-4 py-2.5 font-semibold text-semantic-danger-100 transition hover:bg-feedback-dangerSoft"
            @click="store.cancelCurrentOperation()"
          >
            Cancel Batch
          </button>
        </div>

        <div
          v-if="parsedSizes.length === 0"
          class="mt-4 rounded-xl border border-edge-warningMuted bg-feedback-warningSubtle p-3 text-sm text-semantic-warning-200"
        >
          Enter at least one valid size between 4 and 20.
        </div>
      </section>

      <section class="space-y-6">
        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Scheduler Status</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                The backend queue runs up to the selected concurrency limit and times each puzzle on
                the server side.
              </p>
            </div>
            <div
              class="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
              :class="batchStateBadgeClass"
            >
              {{ store.batchStatus?.state || 'IDLE' }}
            </div>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div
              v-for="metric in schedulerMetrics"
              :key="metric.label"
              class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                {{ metric.label }}
              </div>
              <div class="mt-2 text-2xl font-semibold text-white">{{ metric.value }}</div>
            </div>
          </div>

          <p v-if="store.batchStatus?.note" class="mt-4 text-sm text-semantic-warning-200">
            {{ store.batchStatus.note }}
          </p>

          <div
            v-if="store.batchStatus?.saveSuccessfulPuzzles"
            class="mt-5 grid gap-3 md:grid-cols-3"
          >
            <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3">
              <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                Unique Puzzles Saved
              </div>
              <div class="mt-2 text-2xl font-semibold text-semantic-success-200">
                {{ store.batchStatus?.savedUniquePuzzles ?? 0 }}
              </div>
            </div>
            <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3">
              <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                Duplicate Saves Skipped
              </div>
              <div class="mt-2 text-2xl font-semibold text-semantic-warning-200">
                {{ store.batchStatus?.duplicatePuzzles ?? 0 }}
              </div>
            </div>
            <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3">
              <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                Persistence Errors
              </div>
              <div class="mt-2 text-2xl font-semibold text-semantic-danger-200">
                {{ store.batchStatus?.persistenceErrors ?? 0 }}
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Backend Load</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                Watch CPU and memory pressure while you increase concurrency. This helps find the
                point where extra parallelism stops helping.
              </p>
            </div>
            <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
              {{ formatTimestamp(systemLoad?.sampledAt ?? null) }}
            </div>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div
              v-for="metric in loadMetrics"
              :key="metric.label"
              class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                {{ metric.label }}
              </div>
              <div class="mt-2 text-2xl font-semibold text-white">{{ metric.value }}</div>
            </div>
          </div>

          <p class="mt-4 text-xs leading-5 text-semantic-neutral-400">
            High CPU mainly means the machine slows down and jobs take longer. The realistic risks
            are heavy thermal load, throttling, and instability under memory pressure, not permanent
            hardware damage from this app alone.
          </p>
        </section>

        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Discovery History</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                Stored in localStorage so you can track how many valid puzzles you generated, how
                many were unique, and how many were duplicates across sessions in this browser.
              </p>
            </div>
            <button
              type="button"
              class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
              @click="resetHistory"
            >
              Reset History
            </button>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div
              v-for="metric in historyMetrics"
              :key="metric.label"
              class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                {{ metric.label }}
              </div>
              <div class="mt-2 text-2xl font-semibold text-white">{{ metric.value }}</div>
            </div>
          </div>
        </section>

        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Saved Puzzle Catalog</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                Live counts from the database showing how many canonical puzzles are currently saved
                for each size.
              </p>
            </div>
            <div class="text-sm font-semibold text-white">
              {{ puzzleCatalogStats?.totalPuzzles ?? 0 }} total
            </div>
          </div>

          <div v-if="puzzleCatalogRows.length" class="mt-5 overflow-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-semantic-neutral-400">
                <tr>
                  <th class="px-3 py-2">Size</th>
                  <th class="px-3 py-2">Saved Puzzles</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in puzzleCatalogRows"
                  :key="row.sizeKey"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ row.sizeKey }}</td>
                  <td class="px-3 py-2">{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-4 text-sm text-semantic-neutral-400">
            No saved puzzles found in the DB yet.
          </p>
        </section>

        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Last 100 By Size</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                For each size, this shows the ratio of newly discovered puzzles to duplicates over
                the last 100 saved-or-duplicate outcomes. This is the signal to watch for
                saturation.
              </p>
            </div>
          </div>

          <div v-if="historySnapshot.ratiosBySize.length" class="mt-5 overflow-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-semantic-neutral-400">
                <tr>
                  <th class="px-3 py-2">Size</th>
                  <th class="px-3 py-2">Sample</th>
                  <th class="px-3 py-2">New</th>
                  <th class="px-3 py-2">Dupes</th>
                  <th class="px-3 py-2">New %</th>
                  <th class="px-3 py-2">Dupe %</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in historySnapshot.ratiosBySize"
                  :key="row.size"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ row.size }} x {{ row.size }}</td>
                  <td class="px-3 py-2">{{ row.sampleCount }}</td>
                  <td class="px-3 py-2 text-semantic-success-200">{{ row.newCount }}</td>
                  <td class="px-3 py-2 text-semantic-warning-200">{{ row.duplicateCount }}</td>
                  <td class="px-3 py-2">{{ row.newPercent.toFixed(1) }}%</td>
                  <td class="px-3 py-2">{{ row.duplicatePercent.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-4 text-sm text-semantic-neutral-400">
            Run some saved batches first. This table only tracks runs where persistence could tell
            whether the puzzle was new or a duplicate.
          </p>
        </section>

        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">
                All-Time Summary By Size And Strategy
              </h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                This is aggregated from all recorded generation history in this browser, not just
                the latest batch. Average and median use successful finished runs only.
              </p>
            </div>
          </div>

          <div v-if="historySnapshot.summaryRows.length" class="mt-5 overflow-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-semantic-neutral-400">
                <tr>
                  <th class="px-3 py-2">Size</th>
                  <th class="px-3 py-2">Strategy</th>
                  <th class="px-3 py-2">Min Region</th>
                  <th class="px-3 py-2">Runs</th>
                  <th class="px-3 py-2">Successes</th>
                  <th class="px-3 py-2">Saved</th>
                  <th class="px-3 py-2">Dupes</th>
                  <th class="px-3 py-2">Avg</th>
                  <th class="px-3 py-2">Median</th>
                  <th class="px-3 py-2">Min</th>
                  <th class="px-3 py-2">Max</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in historySnapshot.summaryRows"
                  :key="`${row.size}-${row.strategy}-${row.minimumGroupSize}-${row.minimumGroupSizeSource}`"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ row.size }} x {{ row.size }}</td>
                  <td class="px-3 py-2 text-white">
                    <div class="flex flex-wrap items-center gap-2">
                      <span>{{ strategyLabel(row.strategy) }}</span>
                      <span
                        v-if="row.isFastestForSize"
                        class="rounded-full bg-feedback-infoSoft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-info-200"
                      >
                        Fastest
                      </span>
                      <span
                        v-if="row.isMostUniqueForSize"
                        class="rounded-full bg-feedback-successSoft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-success-200"
                      >
                        Most Unique
                      </span>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <span>{{ row.minimumGroupSize }}</span>
                      <span
                        v-if="row.minimumGroupSizeSource === 'legacy-assumed'"
                        class="rounded-full border border-semantic-neutral-700 bg-surface-darkSoft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
                      >
                        Legacy default
                      </span>
                    </div>
                  </td>
                  <td class="px-3 py-2">{{ row.runCount }}</td>
                  <td class="px-3 py-2">{{ row.successCount }}</td>
                  <td class="px-3 py-2">{{ row.savedCount }}</td>
                  <td class="px-3 py-2">{{ row.duplicateCount }}</td>
                  <td class="px-3 py-2">{{ formatDuration(row.averageMs) }}</td>
                  <td class="px-3 py-2">{{ formatDuration(row.medianMs) }}</td>
                  <td class="px-3 py-2">{{ formatDuration(row.minMs) }}</td>
                  <td class="px-3 py-2">{{ formatDuration(row.maxMs) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-4 text-sm text-semantic-neutral-400">
            Run some batches first to build historical comparison data.
          </p>
        </section>

        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Individual Runs</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                Raw per-puzzle durations are listed here so you can inspect the spread, not just the
                averages.
              </p>
            </div>
          </div>

          <div v-if="sortedRuns.length" class="mt-5 max-h-[520px] overflow-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-semantic-neutral-400">
                <tr>
                  <th class="px-3 py-2">Size</th>
                  <th class="px-3 py-2">Strategy</th>
                  <th class="px-3 py-2">State</th>
                  <th class="px-3 py-2">Fill</th>
                  <th class="px-3 py-2">Duration</th>
                  <th class="px-3 py-2">Persistence</th>
                  <th class="px-3 py-2">Started</th>
                  <th class="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="run in sortedRuns"
                  :key="run.runId"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ run.size }} x {{ run.size }}</td>
                  <td class="px-3 py-2">{{ strategyLabel(run.strategy) }}</td>
                  <td class="px-3 py-2">{{ run.state }}</td>
                  <td class="min-w-[180px] px-3 py-2">
                    <div v-if="showRunFillProgress(run)">
                      <div class="text-xs font-semibold text-semantic-neutral-100">
                        {{ batchRunFillPercent(run) }}% colored
                      </div>
                      <div class="mt-2 h-2 overflow-hidden rounded-full bg-semantic-neutral-900">
                        <div
                          class="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8_0%,#22c55e_100%)] transition-[width] duration-300"
                          :style="{ width: `${batchRunFillPercent(run)}%` }"
                        />
                      </div>
                      <div class="mt-1 text-xs text-semantic-neutral-400">
                        {{ run.coloredCellCount }} / {{ run.totalCellCount }}
                      </div>
                    </div>
                    <span v-else>—</span>
                  </td>
                  <td class="px-3 py-2">
                    {{ run.durationMs ? formatDuration(run.durationMs) : '—' }}
                  </td>
                  <td class="px-3 py-2">
                    <span :class="persistenceBadgeClass(run.persistenceState)">
                      {{ formatPersistence(run) }}
                    </span>
                  </td>
                  <td class="px-3 py-2">{{ formatTimestamp(run.startedAt) }}</td>
                  <td class="px-3 py-2 text-semantic-danger-200">{{ run.error || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-4 text-sm text-semantic-neutral-400">No batch runs yet.</p>
        </section>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { queensAdminApi } from '../../admin/api';
import {
  clearBatchHistory,
  getBatchHistorySnapshot,
  recordBatchRuns,
} from '../../admin/batchHistory';
import { useQueensAdminStore } from '../../stores/queensAdminStore';
import type {
  QueensAdminBatchRun,
  QueensAdminGenerationStrategy,
  QueensAdminPuzzleCatalogStats,
  QueensAdminSystemLoad,
} from '../../admin/types';

const store = useQueensAdminStore();
const sizesInput = ref('6, 8');
const runsPerCombination = ref(5);
const maxConcurrentJobs = ref(2);
const minimumGroupSize = ref(store.minimumGroupSize);
const saveSuccessfulPuzzles = ref(true);
const selectedStrategies = ref<QueensAdminGenerationStrategy[]>(['baseline', 'marker-guided']);
const systemLoad = ref<QueensAdminSystemLoad | null>(null);
const puzzleCatalogStats = ref<QueensAdminPuzzleCatalogStats | null>(null);
const historySnapshot = ref(getBatchHistorySnapshot());
let systemLoadPoller: ReturnType<typeof setInterval> | null = null;

const strategyOptions: Array<{
  value: QueensAdminGenerationStrategy;
  label: string;
  description: string;
}> = [
  {
    value: 'baseline',
    label: 'Baseline',
    description: 'Current generator order with random fallback expansion.',
  },
  {
    value: 'marker-guided',
    label: 'Marker-guided',
    description: 'Prioritize squares that look stealable by another adjacent region.',
  },
];

const parsedSizes = computed(() =>
  Array.from(
    new Set(
      sizesInput.value
        .split(',')
        .map((chunk) => Number.parseInt(chunk.trim(), 10))
        .filter((size) => Number.isInteger(size) && size >= 4 && size <= 20)
    )
  ).sort((left, right) => left - right)
);

const batchStateBadgeClass = computed(() => {
  switch (store.batchStatus?.state) {
    case 'COMPLETED':
      return 'bg-feedback-successSoft text-semantic-success-200';
    case 'CANCELLED':
      return 'bg-feedback-warningSubtle text-semantic-warning-200';
    case 'RUNNING':
      return 'bg-feedback-infoSoft text-semantic-info-200';
    case 'QUEUED':
      return 'bg-semantic-neutral-800 text-semantic-neutral-300';
    default:
      return 'bg-semantic-neutral-800 text-semantic-neutral-300';
  }
});

const schedulerMetrics = computed(() => [
  { label: 'Total', value: store.batchStatus?.totalJobs ?? 0 },
  { label: 'Queued', value: store.batchStatus?.queuedJobs ?? 0 },
  { label: 'Active', value: store.batchStatus?.activeJobs ?? 0 },
  { label: 'Done', value: store.batchStatus?.completedJobs ?? 0 },
  { label: 'Failed', value: store.batchStatus?.failedJobs ?? 0 },
  { label: 'Concurrency', value: store.batchStatus?.maxConcurrentJobs ?? maxConcurrentJobs.value },
]);

const loadMetrics = computed(() => [
  { label: 'Process CPU', value: formatPercent(systemLoad.value?.processCpuPercent) },
  { label: 'System CPU', value: formatPercent(systemLoad.value?.systemCpuPercent) },
  {
    label: 'Heap',
    value: systemLoad.value
      ? `${systemLoad.value.heapUsedMb} / ${systemLoad.value.heapMaxMb} MB`
      : '—',
  },
  { label: 'Load Avg', value: systemLoad.value?.systemLoadAverage?.toFixed(2) ?? '—' },
  {
    label: 'Single Jobs',
    value: systemLoad.value
      ? `${systemLoad.value.singleJobsRunning}/${systemLoad.value.singleJobsQueued}`
      : '—',
  },
  {
    label: 'Batch Runs',
    value: systemLoad.value
      ? `${systemLoad.value.batchRunsActive}/${systemLoad.value.batchRunsQueued}`
      : '—',
  },
]);

const historyMetrics = computed(() => [
  { label: 'Today Valid', value: historySnapshot.value.totals.todayValidPuzzles },
  { label: 'Today Unique', value: historySnapshot.value.totals.todayUniquePuzzles },
  { label: 'Today Duplicates', value: historySnapshot.value.totals.todayDuplicates },
  { label: 'Total Valid', value: historySnapshot.value.totals.totalValidPuzzles },
  { label: 'Total Unique', value: historySnapshot.value.totals.totalUniquePuzzles },
  { label: 'Total Duplicates', value: historySnapshot.value.totals.totalDuplicates },
]);

const puzzleCatalogRows = computed(() =>
  Object.entries(puzzleCatalogStats.value?.countsBySize ?? {})
    .sort((left, right) => Number.parseInt(left[0], 10) - Number.parseInt(right[0], 10))
    .map(([sizeKey, count]) => ({ sizeKey, count }))
);

const sortedRuns = computed(() =>
  [...(store.batchStatus?.runs ?? [])].sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
    return rightTime - leftTime;
  })
);

async function startBatch(): Promise<void> {
  if (parsedSizes.value.length === 0 || selectedStrategies.value.length === 0) return;

  await store.startBatchGeneration({
    sizes: parsedSizes.value,
    strategies: selectedStrategies.value,
    runsPerCombination: Math.max(1, runsPerCombination.value),
    minimumGroupSize: Math.max(1, minimumGroupSize.value),
    maxConcurrentJobs: Math.max(1, maxConcurrentJobs.value),
    saveSuccessfulPuzzles: saveSuccessfulPuzzles.value,
  });
}

async function refreshSystemLoad(): Promise<void> {
  try {
    systemLoad.value = await queensAdminApi.getSystemLoad();
  } catch {
    // Leave the last successful sample on screen.
  }
}

async function refreshPuzzleCatalogStats(): Promise<void> {
  try {
    puzzleCatalogStats.value = await queensAdminApi.getPuzzleCatalogStats();
  } catch {
    // Leave the last successful sample on screen.
  }
}

function resetHistory(): void {
  if (!window.confirm('Clear all local batch benchmark history for this browser?')) {
    return;
  }
  historySnapshot.value = clearBatchHistory();
}

function strategyLabel(strategy: QueensAdminGenerationStrategy): string {
  return strategy === 'marker-guided' ? 'Marker-guided' : 'Baseline';
}

function formatPersistence(run: QueensAdminBatchRun): string {
  switch (run.persistenceState) {
    case 'SAVED':
      return run.savedPuzzleId ? `Saved (${run.savedPuzzleId.slice(0, 8)})` : 'Saved';
    case 'DUPLICATE':
      return 'Duplicate';
    case 'ERROR':
      return 'Save Error';
    case 'SKIPPED':
      return 'Not Saved';
    default:
      return '—';
  }
}

function batchRunFillPercent(run: QueensAdminBatchRun): number {
  if (run.totalCellCount <= 0) return 0;
  return Math.round((run.coloredCellCount / run.totalCellCount) * 100);
}

function showRunFillProgress(run: QueensAdminBatchRun): boolean {
  if (run.state === 'QUEUED') return false;
  return run.totalCellCount > 0;
}

function persistenceBadgeClass(state: QueensAdminBatchRun['persistenceState']): string {
  switch (state) {
    case 'SAVED':
      return 'text-semantic-success-200';
    case 'DUPLICATE':
      return 'text-semantic-warning-200';
    case 'ERROR':
      return 'text-semantic-danger-200';
    default:
      return 'text-semantic-neutral-300';
  }
}

function formatDuration(durationMs: number | null): string {
  if (durationMs == null) return '—';
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatTimestamp(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString();
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

onMounted(() => {
  historySnapshot.value = getBatchHistorySnapshot();
  void refreshSystemLoad();
  void refreshPuzzleCatalogStats();
  systemLoadPoller = setInterval(() => {
    void refreshSystemLoad();
  }, 1500);
});

onUnmounted(() => {
  if (systemLoadPoller) {
    clearInterval(systemLoadPoller);
    systemLoadPoller = null;
  }
});

watch(
  () => store.batchStatus?.runs,
  (runs) => {
    if (!runs?.length) return;
    historySnapshot.value = recordBatchRuns(runs);
    void refreshPuzzleCatalogStats();
  },
  { deep: true }
);
</script>
