<template>
  <section class="space-y-6">
    <div class="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <AdminPanel
        title="Batch Run Setup"
        description="Submit many puzzles at once, compare strategies, and time how long each run takes."
      >
        <template #badge>
          <Tag severity="warn" value="Experimental" rounded />
        </template>

        <div class="space-y-4">
          <label class="block text-sm text-semantic-neutral-300" for="batch-sizes">
            Puzzle sizes
          </label>
          <InputText id="batch-sizes" v-model="sizesInput" class="w-full" placeholder="4, 6, 8" />
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
            <InputNumber
              id="batch-runs"
              v-model="runsPerCombination"
              :min="1"
              :max="100"
              input-class="w-full"
              fluid
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-concurrency">
              Max concurrent jobs
            </label>
            <InputNumber
              id="batch-concurrency"
              v-model="maxConcurrentJobs"
              :min="1"
              :max="12"
              input-class="w-full"
              fluid
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-queen-count-mode">
              Queen count mode
            </label>
            <Select
              id="batch-queen-count-mode"
              v-model="queenCountMode"
              :options="queenCountModeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-target-queens">
              Target queens
            </label>
            <InputNumber
              id="batch-target-queens"
              v-model="targetQueenCount"
              :min="1"
              :max="400"
              :disabled="queenCountMode === 'max'"
              input-class="w-full"
              fluid
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-orthogonal-distance">
              Orthogonal min distance
            </label>
            <InputNumber
              id="batch-orthogonal-distance"
              v-model="orthogonalMinDistance"
              :min="1"
              :max="400"
              input-class="w-full"
              fluid
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-semantic-neutral-300" for="batch-min-group">
              Minimum region size
            </label>
            <InputNumber
              id="batch-min-group"
              v-model="minimumGroupSize"
              :min="1"
              :max="20"
              input-class="w-full"
              fluid
            />
          </div>
        </div>
        <p class="mt-3 text-xs leading-5 text-semantic-neutral-400">
          These values are applied to every size in the batch. If an exported puzzle does not carry
          an orthogonal distance, the frontend should assume it matches the board size.
        </p>

        <div class="mt-4 space-y-2">
          <div class="text-sm text-semantic-neutral-300">Strategies</div>
          <MultiSelect
            v-model="selectedStrategies"
            :options="strategyOptions"
            option-label="label"
            option-value="value"
            display="chip"
            class="w-full"
            placeholder="Select one or more strategies"
          />
          <div class="grid gap-2 md:grid-cols-3">
            <div
              v-for="strategy in strategyOptions"
              :key="strategy.value"
              class="rounded-2xl border border-semantic-neutral-700 bg-semantic-neutral-900 px-3 py-3 text-sm text-semantic-neutral-200"
            >
              <div class="font-semibold text-white">{{ strategy.label }}</div>
              <div class="mt-1 text-xs text-semantic-neutral-400">{{ strategy.description }}</div>
            </div>
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
            <ToggleSwitch
              :model-value="saveSuccessfulPuzzles"
              @update:model-value="saveSuccessfulPuzzles = Boolean($event)"
            />
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <Button
            label="Start Batch"
            severity="success"
            :disabled="
              store.batchLoading ||
              parsedSizes.length === 0 ||
              selectedStrategies.length === 0 ||
              !maxBatchConfigValid
            "
            @click="startBatch"
          />
          <Button
            v-if="
              store.batchLoading ||
              store.batchStatus?.state === 'RUNNING' ||
              store.batchStatus?.state === 'QUEUED'
            "
            type="button"
            label="Cancel Batch"
            severity="danger"
            outlined
            @click="store.cancelCurrentOperation()"
          />
        </div>

        <AdminMessage v-if="parsedSizes.length === 0" severity="warn" class="mt-4">
          Enter at least one valid size between 4 and 20.
        </AdminMessage>
        <AdminMessage
          v-else-if="queenCountMode === 'max' && !maxBatchConfigValid"
          severity="warn"
          class="mt-4"
        >
          Max mode is only available for precomputed size and distance pairs. Unsupported sizes:
          {{ unsupportedBatchSizesLabel }}.
        </AdminMessage>
      </AdminPanel>

      <section class="space-y-6">
        <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Tracked Batches</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                Active and recently completed batches are restored when this page loads, so you can
                leave and come back without losing the current queue.
              </p>
            </div>
            <button
              type="button"
              class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
              @click="store.refreshTrackedBatches()"
            >
              Refresh
            </button>
          </div>

          <div v-if="store.trackedBatches.length" class="mt-5 space-y-3">
            <div
              v-for="trackedBatch in store.trackedBatches"
              :key="trackedBatch.batchId"
              class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <div class="text-sm font-semibold text-white">
                      {{ trackedBatch.totalJobs }} runs
                    </div>
                    <span
                      class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      :class="trackedBatchStateBadgeClass(trackedBatch.state)"
                    >
                      {{ trackedBatch.state }}
                    </span>
                  </div>
                  <div class="mt-2 text-xs leading-5 text-semantic-neutral-400">
                    Updated {{ formatTimestamp(trackedBatch.updatedAt) }} · Completed
                    {{ trackedBatch.completedJobs }} · Saved {{ trackedBatch.savedUniquePuzzles }}
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-info-700 bg-feedback-infoFaint px-3 py-2 text-sm font-semibold text-semantic-info-100 transition hover:bg-feedback-infoSoft"
                    @click="selectTrackedBatch(trackedBatch.batchId)"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-neutral-700 bg-surface-darkFirm px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
                    @click="store.removeTrackedBatch(trackedBatch.batchId)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="mt-5 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4 text-sm text-semantic-neutral-400"
          >
            No tracked batches yet. Start a batch and it will stay listed here until you remove it.
          </div>
        </section>

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
                for each size and minimum queen distance.
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
                  <th class="px-3 py-2">Min Distance</th>
                  <th class="px-3 py-2">Saved Puzzles</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in puzzleCatalogRows"
                  :key="`${row.sizeKey}-${row.orthogonalMinDistance}`"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ row.sizeKey }}</td>
                  <td class="px-3 py-2">{{ row.orthogonalMinDistance }}</td>
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
              <h2 class="text-xl font-semibold text-white">Last 100 By Size And Distance</h2>
              <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                For each size and minimum queen distance, this shows the ratio of newly discovered
                puzzles to duplicates over the last 100 saved-or-duplicate outcomes. This is the
                signal to watch for saturation.
              </p>
            </div>
          </div>

          <div v-if="historySnapshot.ratiosBySize.length" class="mt-5 overflow-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-semantic-neutral-400">
                <tr>
                  <th class="px-3 py-2">Size</th>
                  <th class="px-3 py-2">Min Distance</th>
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
                  :key="`${row.size}-${row.orthogonalMinDistance}`"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ row.size }} x {{ row.size }}</td>
                  <td class="px-3 py-2">{{ row.orthogonalMinDistance }}</td>
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
                All-Time Summary By Size, Distance, And Strategy
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
                  <th class="px-3 py-2">Min Distance</th>
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
                  :key="`${row.size}-${row.orthogonalMinDistance}-${row.strategy}-${row.minimumGroupSize}-${row.minimumGroupSizeSource}`"
                  class="border-t border-semantic-neutral-800"
                >
                  <td class="px-3 py-2 text-white">{{ row.size }} x {{ row.size }}</td>
                  <td class="px-3 py-2">{{ row.orthogonalMinDistance }}</td>
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
                  <th class="px-3 py-2">Min Distance</th>
                  <th class="px-3 py-2">Strategy</th>
                  <th class="px-3 py-2">State</th>
                  <th class="px-3 py-2">Completed Puzzle</th>
                  <th class="px-3 py-2">Puzzle</th>
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
                  <td class="px-3 py-2">{{ run.orthogonalMinDistance }}</td>
                  <td class="px-3 py-2">{{ strategyLabel(run.strategy) }}</td>
                  <td class="px-3 py-2">{{ run.state }}</td>
                  <td class="px-3 py-2">
                    <div v-if="run.completedQueenCount != null || run.difficulty" class="space-y-1">
                      <div
                        v-if="run.completedQueenCount != null"
                        class="text-xs text-semantic-neutral-200"
                      >
                        {{ run.completedQueenCount }} queens
                      </div>
                      <div v-if="run.difficulty" class="text-xs font-semibold text-white">
                        {{ formatDifficultyLabel(run.difficulty) }}
                      </div>
                    </div>
                    <span v-else>—</span>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex flex-wrap gap-2">
                      <a
                        v-if="batchRunPlayHref(run)"
                        :href="batchRunPlayHref(run) || undefined"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="rounded-lg border border-semantic-info-700 bg-feedback-infoFaint px-2.5 py-1 text-xs font-semibold text-semantic-info-100 transition hover:bg-feedback-infoSoft"
                      >
                        Play
                      </a>
                      <button
                        v-if="batchRunShareUrl(run)"
                        type="button"
                        class="rounded-lg border border-semantic-neutral-700 bg-surface-darkSoft px-2.5 py-1 text-xs font-semibold text-semantic-neutral-100 transition hover:border-semantic-neutral-500 hover:text-white"
                        @click="copyBatchRunUrl(run)"
                      >
                        {{ copiedRunId === run.runId ? 'Copied' : 'Copy URL' }}
                      </button>
                      <span v-if="!batchRunPlayHref(run)" class="text-xs text-semantic-neutral-500">
                        —
                      </span>
                    </div>
                  </td>
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
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';
import { queensAdminApi } from '../../admin/api';
import {
  clearBatchHistory,
  getBatchHistorySnapshot,
  recordBatchRuns,
} from '../../admin/batchHistory';
import {
  loadQueensAdminBatchInputs,
  saveQueensAdminBatchInputs,
} from '../../admin/inputPersistence';
import {
  hasPrecomputedMaxQueenCount,
  supportedPrecomputedDistances,
} from '../../admin/maxQueenCounts';
import AdminMessage from './AdminMessage.vue';
import AdminPanel from './AdminPanel.vue';
import { useQueensAdminStore } from '../../stores/queensAdminStore';
import { QUEENS_PUZZLE_SHARE_BASE_URL } from '../../utils/urlPuzzleEncoding';
import type {
  QueensAdminBatchStatus,
  QueensAdminBatchRun,
  QueensAdminGenerationStrategy,
  QueensAdminPuzzleCatalogStats,
  QueensAdminSystemLoad,
} from '../../admin/types';

const store = useQueensAdminStore();
const persistedBatchInputs = loadQueensAdminBatchInputs();
const sizesInput = ref(persistedBatchInputs?.sizesInput ?? '6, 8');
const runsPerCombination = ref(persistedBatchInputs?.runsPerCombination ?? 5);
const maxConcurrentJobs = ref(persistedBatchInputs?.maxConcurrentJobs ?? 2);
const queenCountMode = ref(persistedBatchInputs?.queenCountMode ?? store.queenCountMode);
const targetQueenCount = ref(persistedBatchInputs?.targetQueenCount ?? store.targetQueenCount);
const orthogonalMinDistance = ref(
  persistedBatchInputs?.orthogonalMinDistance ?? store.orthogonalMinDistance
);
const minimumGroupSize = ref(persistedBatchInputs?.minimumGroupSize ?? store.minimumGroupSize);
const saveSuccessfulPuzzles = ref(persistedBatchInputs?.saveSuccessfulPuzzles ?? true);
const selectedStrategies = ref<QueensAdminGenerationStrategy[]>(
  persistedBatchInputs?.selectedStrategies ?? ['baseline', 'marker-guided', 'template-seeded']
);
const systemLoad = ref<QueensAdminSystemLoad | null>(null);
const puzzleCatalogStats = ref<QueensAdminPuzzleCatalogStats | null>(null);
const historySnapshot = ref(getBatchHistorySnapshot());
let systemLoadPoller: ReturnType<typeof setInterval> | null = null;
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;
const copiedRunId = ref<string | null>(null);

const queenCountModeOptions: Array<{ label: string; value: 'exact' | 'max' }> = [
  { label: 'Exact target', value: 'exact' },
  { label: 'Maximum that fits', value: 'max' },
];

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
  {
    value: 'template-seeded',
    label: 'Template-seeded',
    description:
      'Seed as many queen regions as possible from the template shape and require at least half to fit before continuing the validated workflow.',
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

const unsupportedBatchSizes = computed(() =>
  parsedSizes.value.filter(
    (size) =>
      queenCountMode.value === 'max' &&
      !hasPrecomputedMaxQueenCount(size, orthogonalMinDistance.value)
  )
);

const unsupportedBatchSizesLabel = computed(() =>
  unsupportedBatchSizes.value
    .map((size) => {
      const supportedDistances = supportedPrecomputedDistances(size);
      return supportedDistances.length > 0
        ? `${size}x${size} (supported d: ${supportedDistances.join(', ')})`
        : `${size}x${size} (no max presets yet)`;
    })
    .join('; ')
);

const maxBatchConfigValid = computed(
  () => queenCountMode.value !== 'max' || unsupportedBatchSizes.value.length === 0
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

function trackedBatchStateBadgeClass(state: QueensAdminBatchStatus['state']): string {
  switch (state) {
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
}

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
  Object.entries(puzzleCatalogStats.value?.countsBySizeAndDistance ?? {})
    .map(([bucketKey, count]) => {
      const [sizeKey, distancePart] = bucketKey.split('|d=');
      return {
        bucketKey,
        sizeKey,
        orthogonalMinDistance: Number.parseInt(distancePart ?? '0', 10),
        count,
      };
    })
    .sort((left, right) => {
      const leftSize = Number.parseInt(left.sizeKey, 10);
      const rightSize = Number.parseInt(right.sizeKey, 10);
      if (leftSize !== rightSize) return leftSize - rightSize;
      return left.orthogonalMinDistance - right.orthogonalMinDistance;
    })
);

const sortedRuns = computed(() =>
  [...(store.batchStatus?.runs ?? [])].sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
    return rightTime - leftTime;
  })
);

async function startBatch(): Promise<void> {
  if (
    parsedSizes.value.length === 0 ||
    selectedStrategies.value.length === 0 ||
    !maxBatchConfigValid.value
  )
    return;

  await store.startBatchGeneration({
    sizes: parsedSizes.value,
    strategies: selectedStrategies.value,
    runsPerCombination: Math.max(1, runsPerCombination.value),
    queenCountMode: queenCountMode.value,
    targetQueenCount: queenCountMode.value === 'max' ? null : Math.max(1, targetQueenCount.value),
    orthogonalMinDistance: Math.max(1, orthogonalMinDistance.value),
    minimumGroupSize: Math.max(1, minimumGroupSize.value),
    maxConcurrentJobs: Math.max(1, maxConcurrentJobs.value),
    saveSuccessfulPuzzles: saveSuccessfulPuzzles.value,
  });
}

async function selectTrackedBatch(batchId: string): Promise<void> {
  await store.refreshTrackedBatches();
  const selectedBatch = store.trackedBatches.find((batch) => batch.batchId === batchId);
  if (selectedBatch) {
    store.batchStatus = selectedBatch;
  }
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
  if (strategy === 'marker-guided') return 'Marker-guided';
  if (strategy === 'template-seeded') return 'Template-seeded';
  return 'Baseline';
}

function formatPersistence(run: QueensAdminBatchRun): string {
  switch (run.persistenceState) {
    case 'SAVED':
      return run.savedPuzzleId ? `Saved (${run.savedPuzzleId.slice(0, 8)})` : 'Saved';
    case 'DUPLICATE':
      return 'Duplicate';
    case 'UNSOLVABLE':
      return 'Unsolvable';
    case 'ERROR':
      return 'Save Error';
    case 'SKIPPED':
      return 'Not Saved';
    default:
      return '—';
  }
}

function batchRunPlayHref(run: QueensAdminBatchRun): string | null {
  return run.encodedPuzzleLayout ? `/queens/puzzle/${run.encodedPuzzleLayout}` : null;
}

function formatDifficultyLabel(difficulty: string): string {
  return difficulty
    .split('-')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function batchRunShareUrl(run: QueensAdminBatchRun): string | null {
  const href = batchRunPlayHref(run);
  return href ? `${QUEENS_PUZZLE_SHARE_BASE_URL}${href}` : null;
}

async function copyBatchRunUrl(run: QueensAdminBatchRun): Promise<void> {
  const shareUrl = batchRunShareUrl(run);
  if (!shareUrl) return;

  try {
    await navigator.clipboard.writeText(shareUrl);
    copiedRunId.value = run.runId;
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copiedRunId.value = null;
      copyResetTimer = null;
    }, 1500);
  } catch {
    copiedRunId.value = null;
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
    case 'UNSOLVABLE':
      return 'text-semantic-danger-200';
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
  void store.refreshTrackedBatches();
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
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
    copyResetTimer = null;
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

watch(
  [
    sizesInput,
    runsPerCombination,
    maxConcurrentJobs,
    queenCountMode,
    targetQueenCount,
    orthogonalMinDistance,
    minimumGroupSize,
    saveSuccessfulPuzzles,
    selectedStrategies,
  ],
  () => {
    saveQueensAdminBatchInputs({
      sizesInput: sizesInput.value,
      runsPerCombination: runsPerCombination.value,
      maxConcurrentJobs: maxConcurrentJobs.value,
      queenCountMode: queenCountMode.value,
      targetQueenCount: targetQueenCount.value,
      orthogonalMinDistance: orthogonalMinDistance.value,
      minimumGroupSize: minimumGroupSize.value,
      saveSuccessfulPuzzles: saveSuccessfulPuzzles.value,
      selectedStrategies: selectedStrategies.value,
    });
  },
  { deep: true }
);
</script>
