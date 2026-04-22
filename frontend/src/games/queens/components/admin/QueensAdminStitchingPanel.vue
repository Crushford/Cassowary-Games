<template>
  <section class="space-y-6">
    <div class="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <!-- Left: Experiment Settings + Controls -->
      <AdminPanel
        title="Experiment Settings"
        description="Generate and play-test a 2×2 stitched puzzle. Generation is live — no database lookup. Use the stitched board below to manually verify the puzzle works."
      >
        <template #badge>
          <Tag
            :severity="loading ? 'info' : 'success'"
            :value="loading ? 'Generating…' : 'Proof of Concept'"
            rounded
          />
        </template>
        <template #actions>
          <button
            type="button"
            class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white disabled:opacity-50"
            :disabled="loading"
            @click="loadPreview"
          >
            {{ loading ? 'Generating…' : 'Generate New' }}
          </button>
        </template>

        <!-- Fixed generation params -->
        <div class="grid grid-cols-2 gap-3">
          <div
            class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2.5"
          >
            <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400">
              Board size
            </div>
            <div class="mt-1 text-sm font-semibold text-white">7 × 7 per quadrant</div>
          </div>
          <div
            class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2.5"
          >
            <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400">
              Orthogonal distance
            </div>
            <div class="mt-1 text-sm font-semibold text-white">5</div>
          </div>
          <div
            class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2.5"
          >
            <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400">
              Top-Left target
            </div>
            <div class="mt-1 text-sm font-semibold text-white">10 queens</div>
          </div>
          <div
            class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2.5"
          >
            <div class="text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400">
              TR / BL / BR target
            </div>
            <div class="mt-1 text-sm font-semibold text-white">9 queens each</div>
          </div>
        </div>

        <!-- Show/Hide Queens toggle -->
        <div class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <label
            for="show-solution-queens"
            class="flex items-center justify-between gap-4 text-sm text-semantic-neutral-200"
          >
            <div>
              <div class="font-semibold text-white">Show Solution Queens</div>
              <div class="mt-1 text-xs leading-5 text-semantic-neutral-400">
                Toggle the hidden solution queens on the stitched board.
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-semantic-neutral-400">
                {{ showQueens ? 'Queens visible' : 'Queens hidden' }}
              </span>
              <input
                id="show-solution-queens"
                v-model="showQueens"
                type="checkbox"
                class="h-4 w-4 rounded border-semantic-neutral-600 bg-semantic-neutral-900 text-semantic-info-500"
              />
            </div>
          </label>
        </div>

        <!-- Play guide -->
        <div class="mt-3 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div class="text-xs font-semibold text-white">How to play-test</div>
          <div class="mt-2 space-y-1.5 text-xs leading-5 text-semantic-neutral-400">
            <div>
              Click empty → 🚧 flag. Click 🚧 flag → 👑 queen (auto-flags conflicts). Click 👑 queen
              → empty.
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="mt-4 grid gap-3 grid-cols-2">
          <AdminStat
            label="Achieved Queens"
            :value="quadrantQueenSummary"
            detail="tl / tr / bl / br"
          />
          <AdminStat
            label="Blackout Cells"
            :value="quadrantBlackoutSummary"
            detail="tr / bl / br"
          />
          <AdminStat
            label="Your Queens"
            :value="String(playerQueenCount)"
            detail="placed on board"
          />
          <AdminStat label="Your Flags" :value="String(playerFlagCount)" detail="auto + manual" />
        </div>

        <AdminMessage v-if="errorMessage" severity="error" class="mt-5">
          {{ errorMessage }}
        </AdminMessage>
      </AdminPanel>

      <!-- Right: Pipeline + Interactive Board -->
      <section class="space-y-6">
        <!-- Generation pipeline: 2×2 quadrant view -->
        <div class="grid gap-6 2xl:grid-cols-2">
          <AdminPanel
            title="Top Left — Seed"
            description="Standard 7×7 puzzle, no blackout. Its right and bottom edges drive the bleed signatures for the remaining three pieces."
          >
            <template #actions>
              <QuadrantStatusBadge :quadrant="preview?.topLeft ?? null" />
            </template>
            <QuadrantMeta :quadrant="preview?.topLeft ?? null" />
            <QuadrantBoard
              :rows="preview?.topLeft.board.cells ?? []"
              :columns="preview?.topLeft.board.width ?? 7"
            />
          </AdminPanel>

          <AdminPanel
            title="Top Right — Left-Edge Match"
            description="Generated within the blackout shape derived from the top-left's right-edge bleed. Must achieve 9 queens."
          >
            <template #actions>
              <QuadrantStatusBadge :quadrant="preview?.topRight ?? null" />
            </template>
            <QuadrantMeta :quadrant="preview?.topRight ?? null" />
            <QuadrantBoard
              :rows="preview?.topRight.board.cells ?? []"
              :columns="preview?.topRight.board.width ?? 7"
            />
          </AdminPanel>

          <AdminPanel
            title="Bottom Left — Top-Edge Match"
            description="Generated within the blackout shape derived from the top-left's bottom-edge bleed. Must achieve 9 queens."
          >
            <template #actions>
              <QuadrantStatusBadge :quadrant="preview?.bottomLeft ?? null" />
            </template>
            <QuadrantMeta :quadrant="preview?.bottomLeft ?? null" />
            <QuadrantBoard
              :rows="preview?.bottomLeft.board.cells ?? []"
              :columns="preview?.bottomLeft.board.width ?? 7"
            />
          </AdminPanel>

          <AdminPanel
            title="Bottom Right — Dual-Edge Match"
            description="Matches both the bottom-left's right-edge bleed and the top-right's bottom-edge bleed. Must achieve 9 queens."
          >
            <template #actions>
              <QuadrantStatusBadge :quadrant="preview?.bottomRight ?? null" />
            </template>
            <QuadrantMeta :quadrant="preview?.bottomRight ?? null" />
            <QuadrantBoard
              :rows="preview?.bottomRight.board.cells ?? []"
              :columns="preview?.bottomRight.board.width ?? 7"
            />
          </AdminPanel>
        </div>

        <!-- Stitched interactive play board -->
        <AdminPanel
          title="Stitched 14×14 Play Board"
          description="The four pieces assembled into one board. Blackout seam cells are filled from adjacent colors. Click to place queens — conflicting cells flag automatically."
        >
          <template #actions>
            <span
              v-if="preview"
              class="rounded-full bg-feedback-successSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-success-100"
            >
              Ready
            </span>
            <span
              v-else
              class="rounded-full bg-surface-darkSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
            >
              Pending
            </span>
          </template>
          <StitchedPlayBoard
            :rows="preview?.stitchedBoard.cells ?? []"
            :columns="preview?.stitchedBoard.width ?? 14"
            :show-queens="showQueens"
            :play-marks="playMarks"
            @cell-click="onCellClick"
          />
        </AdminPanel>

        <AdminPanel
          title="Stitching Catalog"
          description="Batch-generate stitched-piece puzzles into the dedicated stitching catalog, inspect per-fingerprint counts, and export fingerprint buckets for frontend lookup."
        >
          <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section class="space-y-4">
              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
                <div class="text-sm font-semibold text-white">Batch Setup</div>
                <div class="mt-3 space-y-3">
                  <label class="block text-sm text-semantic-neutral-300">
                    Fingerprint source
                    <select
                      v-model="selectedBatchPreset"
                      class="mt-2 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="top-right">Preview Top Right (left-only)</option>
                      <option value="bottom-left">Preview Bottom Left (top-only)</option>
                      <option value="bottom-right">Preview Bottom Right (left + top)</option>
                      <option value="all-preview">All preview stitched shapes</option>
                      <option value="all-left-only">
                        All reachable left-only fingerprints
                        {{
                          fingerprintSpace ? `(${fingerprintSpace.leftOnlyFingerprintCount})` : ''
                        }}
                      </option>
                      <option value="all-top-only">
                        All reachable top-only fingerprints
                        {{
                          fingerprintSpace ? `(${fingerprintSpace.topOnlyFingerprintCount})` : ''
                        }}
                      </option>
                      <option value="all-both">
                        All reachable both-edge fingerprints
                        {{
                          fingerprintSpace
                            ? `(${formatLargeCount(fingerprintSpace.bothFingerprintCount)})`
                            : ''
                        }}
                      </option>
                      <option value="all-reachable">
                        All reachable stitched fingerprints
                        {{
                          fingerprintSpace
                            ? `(${formatLargeCount(fingerprintSpace.totalFingerprintCount)})`
                            : ''
                        }}
                      </option>
                    </select>
                  </label>

                  <label class="block text-sm text-semantic-neutral-300">
                    Runs per fingerprint
                    <input
                      v-model.number="runsPerFingerprint"
                      type="number"
                      min="1"
                      max="100"
                      class="mt-2 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label class="block text-sm text-semantic-neutral-300">
                    Max concurrent jobs
                    <input
                      v-model.number="stitchingConcurrency"
                      type="number"
                      min="1"
                      max="8"
                      class="mt-2 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>

                <div
                  class="mt-4 rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 p-3 text-xs text-semantic-neutral-300"
                >
                  <div class="font-semibold text-white">Planned runs</div>
                  <template v-if="selectedBatchPreset.startsWith('all-')">
                    <div class="mt-2">
                      {{ selectedBatchSummary }}
                    </div>
                    <div class="mt-2 text-semantic-warning-200">
                      Large presets stream recent activity only. The batch status panel keeps
                      aggregate progress and the latest runs instead of every queued fingerprint.
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="run in selectedBatchRuns"
                      :key="`${run.pieceKind}-${run.leftBlackoutSignature.join(',')}-${run.topBlackoutSignature.join(',')}`"
                      class="mt-2"
                    >
                      {{ run.pieceKind }} · target {{ run.targetQueenCount }} · L[{{
                        run.leftBlackoutSignature.join(',')
                      }}] · T[{{ run.topBlackoutSignature.join(',') }}]
                    </div>
                  </template>
                </div>

                <div class="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-success-700 bg-feedback-successSoft px-3 py-2 text-sm font-semibold text-semantic-success-100 transition hover:opacity-90 disabled:opacity-50"
                    :disabled="selectedBatchRuns.length === 0 || stitchingBatchLoading"
                    @click="startStitchingBatch"
                  >
                    {{ stitchingBatchLoading ? 'Starting…' : 'Start Stitching Batch' }}
                  </button>
                  <button
                    v-if="
                      activeStitchingBatch?.state === 'RUNNING' ||
                      activeStitchingBatch?.state === 'QUEUED'
                    "
                    type="button"
                    class="rounded-xl border border-semantic-error-700 bg-feedback-errorSoft px-3 py-2 text-sm font-semibold text-semantic-error-100 transition hover:opacity-90"
                    @click="cancelStitchingBatch"
                  >
                    Cancel Batch
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-info-700 bg-feedback-infoFaint px-3 py-2 text-sm font-semibold text-semantic-info-100 transition hover:opacity-90 disabled:opacity-50"
                    :disabled="stitchingExportLoading"
                    @click="exportCatalog"
                  >
                    {{ stitchingExportLoading ? 'Exporting…' : 'Export JSON' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-danger-700 bg-feedback-errorSoft px-3 py-2 text-sm font-semibold text-semantic-error-100 transition hover:opacity-90 disabled:opacity-50"
                    :disabled="stitchingDeleteLoading"
                    @click="deleteBlackoutStitchingPuzzles"
                  >
                    {{ stitchingDeleteLoading ? 'Deleting…' : 'Delete Blackout Puzzles' }}
                  </button>
                </div>

                <div
                  v-if="stitchingExportResult"
                  class="mt-4 rounded-xl border border-semantic-info-800 bg-feedback-infoFaint p-3 text-xs text-semantic-info-100"
                >
                  Exported {{ stitchingExportResult.puzzleCount }} puzzles across
                  {{ stitchingExportResult.bucketCount }} buckets to
                  {{ stitchingExportResult.outputPath }}
                </div>
              </div>

              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-semibold text-white">Discovery Scheduler</div>
                    <div class="mt-1 text-xs leading-5 text-semantic-neutral-400">
                      Expand reachable stitched fingerprint buckets from real seed puzzles instead
                      of brute-forcing the full space.
                    </div>
                  </div>
                  <span
                    class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    :class="
                      discoveryStatusTone === 'info'
                        ? 'bg-feedback-infoFaint text-semantic-info-100'
                        : discoveryStatusTone === 'warn'
                          ? 'bg-feedback-warningSoft text-semantic-warning-100'
                          : discoveryStatusTone === 'danger'
                            ? 'bg-feedback-errorSoft text-semantic-error-100'
                            : discoveryStatusTone === 'success'
                              ? 'bg-feedback-successSoft text-semantic-success-100'
                              : 'bg-semantic-neutral-900 text-semantic-neutral-300'
                    "
                  >
                    {{ activeDiscoveryRun?.state ?? 'IDLE' }}
                  </span>
                </div>

                <div class="mt-4 space-y-3">
                  <label class="block text-sm text-semantic-neutral-300">
                    Generation limit
                    <input
                      v-model.number="discoveryGenerationLimit"
                      type="number"
                      min="1"
                      max="10000"
                      class="mt-2 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label class="block text-sm text-semantic-neutral-300">
                    Max concurrent jobs
                    <input
                      v-model.number="discoveryMaxConcurrentJobs"
                      type="number"
                      min="1"
                      max="8"
                      class="mt-2 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label class="block text-sm text-semantic-neutral-300">
                    Minimum region size
                    <input
                      v-model.number="discoveryMinRegionSize"
                      type="number"
                      min="1"
                      max="100"
                      class="mt-2 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label
                    class="flex items-start justify-between gap-4 rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 px-3 py-3 text-sm text-semantic-neutral-300"
                  >
                    <div>
                      <div class="font-semibold text-white">Skip satisfied buckets</div>
                      <div class="mt-1 text-xs leading-5 text-semantic-neutral-400">
                        Checked by default. If a fingerprint bucket already has a saved stitching
                        puzzle, mark it as satisfied and expand from the existing puzzle instead of
                        generating a new one.
                      </div>
                    </div>
                    <input
                      v-model="discoverySkipSatisfiedBuckets"
                      type="checkbox"
                      class="mt-1 h-4 w-4 rounded border-semantic-neutral-600 bg-semantic-neutral-900 text-semantic-info-500"
                    />
                  </label>
                </div>

                <div class="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-success-700 bg-feedback-successSoft px-3 py-2 text-sm font-semibold text-semantic-success-100 transition hover:opacity-90 disabled:opacity-50"
                    :disabled="
                      stitchingDiscoveryLoading ||
                      activeDiscoveryRun?.state === 'RUNNING' ||
                      activeDiscoveryRun?.state === 'STOPPING'
                    "
                    @click="startDiscoveryRun"
                  >
                    {{ stitchingDiscoveryLoading ? 'Starting…' : 'Start Discovery Run' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-error-700 bg-feedback-errorSoft px-3 py-2 text-sm font-semibold text-semantic-error-100 transition hover:opacity-90 disabled:opacity-50"
                    :disabled="
                      !activeDiscoveryRun ||
                      (activeDiscoveryRun.state !== 'RUNNING' &&
                        activeDiscoveryRun.state !== 'STOPPING')
                    "
                    @click="stopDiscoveryRun"
                  >
                    {{ activeDiscoveryRun?.state === 'STOPPING' ? 'Stopping…' : 'Stop Run' }}
                  </button>
                </div>

                <div
                  v-if="activeDiscoveryRun"
                  class="mt-4 rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 p-3 text-xs text-semantic-neutral-300"
                >
                  <div class="font-semibold text-white">Run Summary</div>
                  <div class="mt-2">{{ discoveryProgressSummary }}</div>
                  <div class="mt-1">
                    inferred {{ activeDiscoveryRun.inferredCount }} · validated
                    {{ activeDiscoveryRun.validatedCount }} · limit
                    {{ activeDiscoveryRun.generationLimit }}
                  </div>
                  <div class="mt-1">
                    active jobs {{ activeDiscoveryRun.activeJobs }} /
                    {{ activeDiscoveryRun.maxConcurrentJobs }}
                  </div>
                  <div v-if="activeDiscoveryRun.activeBucket" class="mt-2 text-semantic-info-100">
                    active {{ activeDiscoveryRun.activeBucket.pieceCategory }} ·
                    {{ activeDiscoveryRun.activeBucket.fingerprintKey }}
                  </div>
                  <div v-if="activeDiscoveryRun.note" class="mt-2 whitespace-pre-wrap break-words">
                    {{ activeDiscoveryRun.note }}
                  </div>
                </div>
              </div>

              <AdminMessage v-if="stitchingMessage" severity="info">
                {{ stitchingMessage }}
              </AdminMessage>
              <AdminMessage v-if="stitchingError" severity="error">
                {{ stitchingError }}
              </AdminMessage>
            </section>

            <section class="space-y-4">
              <div class="grid gap-3 md:grid-cols-3">
                <AdminStat
                  label="Buckets"
                  :value="String(stitchingStats?.bucketCount ?? 0)"
                  detail="exact fingerprint keys"
                />
                <AdminStat
                  label="Catalog Puzzles"
                  :value="String(stitchingStats?.totalPuzzles ?? 0)"
                  detail="dedicated stitching table"
                />
                <AdminStat
                  label="Active Batch"
                  :value="activeStitchingBatch?.state ?? 'IDLE'"
                  detail="queue state"
                />
              </div>

              <div class="grid gap-3 md:grid-cols-4">
                <AdminStat
                  label="Discovery State"
                  :value="activeDiscoveryRun?.state ?? 'IDLE'"
                  detail="scheduler"
                />
                <AdminStat
                  label="Generated"
                  :value="String(activeDiscoveryRun?.generatedCount ?? 0)"
                  detail="new puzzles this run"
                />
                <AdminStat
                  label="Skipped"
                  :value="String(activeDiscoveryRun?.skippedCount ?? 0)"
                  detail="already satisfied"
                />
                <AdminStat
                  label="Queued"
                  :value="String(activeDiscoveryRun?.queuedCount ?? 0)"
                  detail="pending buckets"
                />
                <AdminStat
                  label="Workers"
                  :value="
                    activeDiscoveryRun
                      ? `${activeDiscoveryRun.activeJobs}/${activeDiscoveryRun.maxConcurrentJobs}`
                      : '0/1'
                  "
                  detail="active / max"
                />
              </div>

              <div
                v-if="activeStitchingBatch"
                class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-white">
                    Batch {{ activeStitchingBatch.batchId.slice(0, 8) }}
                  </div>
                  <div class="text-xs text-semantic-neutral-400">
                    {{ activeStitchingBatch.completedJobs }} / {{ activeStitchingBatch.totalJobs }}
                    complete
                  </div>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-semantic-neutral-900">
                  <div
                    class="h-full bg-semantic-info-500 transition-all"
                    :style="{ width: `${stitchingBatchProgress}%` }"
                  />
                </div>
                <div class="mt-3 max-h-64 space-y-2 overflow-auto">
                  <div
                    v-for="run in activeStitchingBatch.runs"
                    :key="run.runId"
                    class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 px-3 py-2 text-xs text-semantic-neutral-300"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="font-semibold text-white">
                        {{ run.pieceKind }} · {{ run.pieceCategory }} ·
                        {{ run.fingerprintKey || '(standard)' }}
                      </div>
                      <div>{{ run.state }}</div>
                    </div>
                    <div class="mt-1">
                      queens {{ run.queenCount ?? '—' }} / {{ run.targetQueenCount }} ·
                      {{ run.persistenceState ?? 'pending' }}
                    </div>
                    <div v-if="run.persistenceMessage" class="mt-1 text-semantic-info-100">
                      {{ run.persistenceMessage }}
                    </div>
                    <div
                      v-if="run.canonicalSignature"
                      class="mt-1 break-all text-[11px] text-semantic-neutral-500"
                    >
                      {{ run.canonicalSignature }}
                    </div>
                    <div
                      v-if="run.error"
                      class="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-semantic-error-200"
                    >
                      {{ run.error }}
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="activeDiscoveryRun"
                class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-white">
                    Discovery {{ activeDiscoveryRun.runId.slice(0, 8) }}
                  </div>
                  <div class="text-xs text-semantic-neutral-400">
                    inferred {{ activeDiscoveryRun.inferredCount }} · validated
                    {{ activeDiscoveryRun.validatedCount }} · failed
                    {{ activeDiscoveryRun.failedCount }}
                  </div>
                </div>

                <div class="mt-4 grid gap-4 xl:grid-cols-2">
                  <div
                    class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 p-3"
                  >
                    <div
                      class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
                    >
                      Generated
                    </div>
                    <div
                      v-if="activeDiscoveryRun.generatedBuckets.length === 0"
                      class="mt-3 text-xs text-semantic-neutral-500"
                    >
                      No generated buckets in this run yet.
                    </div>
                    <div v-else class="mt-3 max-h-64 space-y-2 overflow-auto">
                      <div
                        v-for="bucket in activeDiscoveryRun.generatedBuckets"
                        :key="bucket.bucketKey"
                        class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2 text-xs text-semantic-neutral-300"
                      >
                        <div class="font-semibold text-white">
                          {{ bucket.pieceCategory }} · {{ bucket.fingerprintKey }}
                        </div>
                        <div class="mt-1">
                          {{ bucket.pieceKind }} · target {{ bucket.targetQueenCount }} · puzzle
                          {{ bucket.puzzleId ?? '—' }}
                        </div>
                        <div v-if="bucket.message" class="mt-1 text-semantic-info-100">
                          {{ bucket.message }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 p-3"
                  >
                    <div
                      class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
                    >
                      Skipped / Satisfied
                    </div>
                    <div
                      v-if="activeDiscoveryRun.skippedBuckets.length === 0"
                      class="mt-3 text-xs text-semantic-neutral-500"
                    >
                      No skipped buckets in this run yet.
                    </div>
                    <div v-else class="mt-3 max-h-64 space-y-2 overflow-auto">
                      <div
                        v-for="bucket in activeDiscoveryRun.skippedBuckets"
                        :key="bucket.bucketKey"
                        class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2 text-xs text-semantic-neutral-300"
                      >
                        <div class="font-semibold text-white">
                          {{ bucket.pieceCategory }} · {{ bucket.fingerprintKey }}
                        </div>
                        <div class="mt-1">
                          {{ bucket.pieceKind }} · puzzle {{ bucket.puzzleId ?? '—' }}
                        </div>
                        <div v-if="bucket.message" class="mt-1 text-semantic-info-100">
                          {{ bucket.message }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 p-3"
                  >
                    <div
                      class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
                    >
                      Failed
                    </div>
                    <div
                      v-if="activeDiscoveryRun.failedBuckets.length === 0"
                      class="mt-3 text-xs text-semantic-neutral-500"
                    >
                      No failed buckets in this run yet.
                    </div>
                    <div v-else class="mt-3 max-h-64 space-y-2 overflow-auto">
                      <div
                        v-for="bucket in activeDiscoveryRun.failedBuckets"
                        :key="bucket.bucketKey"
                        class="rounded-xl border border-semantic-error-900 bg-feedback-errorSoft px-3 py-2 text-xs text-semantic-error-100"
                      >
                        <div class="font-semibold text-white">
                          {{ bucket.pieceCategory }} · {{ bucket.fingerprintKey }}
                        </div>
                        <div class="mt-1">
                          target {{ bucket.targetQueenCount }} · L[{{
                            bucket.leftBlackoutSignature.join(',')
                          }}] · T[{{ bucket.topBlackoutSignature.join(',') }}]
                        </div>
                        <div
                          v-if="bucket.message"
                          class="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words"
                        >
                          {{ bucket.message }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 p-3"
                  >
                    <div
                      class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
                    >
                      Pending / Inferred
                    </div>
                    <div
                      v-if="
                        activeDiscoveryRun.queuedBuckets.length === 0 &&
                        activeDiscoveryRun.inferredBuckets.length === 0
                      "
                      class="mt-3 text-xs text-semantic-neutral-500"
                    >
                      No pending buckets in this run yet.
                    </div>
                    <div v-else class="mt-3 max-h-64 space-y-2 overflow-auto">
                      <div
                        v-for="bucket in activeDiscoveryRun.queuedBuckets"
                        :key="`queued-${bucket.bucketKey}`"
                        class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2 text-xs text-semantic-neutral-300"
                      >
                        <div class="font-semibold text-white">
                          {{ bucket.pieceCategory }} · {{ bucket.fingerprintKey }}
                        </div>
                        <div class="mt-1">{{ bucket.state }} · {{ bucket.pieceKind }}</div>
                      </div>
                      <div
                        v-for="bucket in activeDiscoveryRun.inferredBuckets"
                        :key="`inferred-${bucket.bucketKey}`"
                        class="rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2 text-xs text-semantic-neutral-300"
                      >
                        <div class="font-semibold text-white">
                          {{ bucket.pieceCategory }} · {{ bucket.fingerprintKey }}
                        </div>
                        <div class="mt-1">
                          {{ bucket.state }} · {{ bucket.provenance.join(' · ') || 'seeded' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-white">Fingerprint Buckets</div>
                  <button
                    type="button"
                    class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-1.5 text-xs font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
                    @click="loadStitchingCatalogStats"
                  >
                    Refresh
                  </button>
                </div>
                <div
                  v-if="!stitchingStats?.buckets.length"
                  class="mt-4 text-sm text-semantic-neutral-400"
                >
                  No stitched catalog rows yet.
                </div>
                <div v-else class="mt-4 max-h-80 space-y-2 overflow-auto">
                  <div
                    v-for="bucket in stitchingStats.buckets"
                    :key="bucket.fingerprintKey"
                    class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950/70 px-3 py-3 text-xs text-semantic-neutral-300"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="font-semibold text-white">
                        {{ bucket.pieceCategory }} · {{ bucket.fingerprintKey || '(standard)' }}
                      </div>
                      <div>{{ bucket.puzzleCount }} puzzles</div>
                    </div>
                    <div class="mt-2">
                      size {{ bucket.boardSize }} · distance {{ bucket.orthogonalMinDistance }} ·
                      target {{ bucket.targetQueenCount }}
                    </div>
                    <div class="mt-1">
                      kinds:
                      {{
                        Object.entries(bucket.countsByPieceKind)
                          .map(([pieceKind, count]) => `${pieceKind} ${count}`)
                          .join(' · ')
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </AdminPanel>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type PropType,
} from 'vue';
import Tag from 'primevue/tag';
import { queensAdminApi } from '../../admin/api';
import {
  loadQueensAdminStitchingInputs,
  saveQueensAdminStitchingInputs,
} from '../../admin/inputPersistence';
import type {
  QueensAdminStitchingBatchRunRequest,
  QueensAdminStitchingBatchStatus,
  QueensAdminStitchingCatalogStats,
  QueensAdminStitchingDiscoveryStatus,
  QueensAdminStitchingFingerprintSpace,
  QueensAdminStitchingCell,
  QueensAdminStitchingPreview,
  QueensAdminStitchingQuadrant,
} from '../../admin/types';
import AdminMessage from './AdminMessage.vue';
import AdminPanel from './AdminPanel.vue';
import AdminStat from './AdminStat.vue';

// ── Palette ─────────────────────────────────────────────────────────────────

const paletteByPrefix: Record<string, string[]> = {
  TL: [
    'bg-sky-950/90 border-sky-700/70',
    'bg-cyan-950/90 border-cyan-700/70',
    'bg-blue-900/80 border-blue-700/70',
    'bg-indigo-950/90 border-indigo-700/70',
    'bg-teal-950/90 border-teal-700/70',
    'bg-sky-900/80 border-sky-600/70',
    'bg-blue-950/90 border-blue-800/70',
  ],
  TR: [
    'bg-orange-950/90 border-orange-700/70',
    'bg-amber-950/90 border-amber-700/70',
    'bg-yellow-950/90 border-yellow-700/70',
    'bg-red-950/90 border-red-700/70',
    'bg-lime-950/90 border-lime-700/70',
    'bg-emerald-950/90 border-emerald-700/70',
    'bg-rose-950/90 border-rose-700/70',
  ],
  BL: [
    'bg-fuchsia-950/90 border-fuchsia-700/70',
    'bg-pink-950/90 border-pink-700/70',
    'bg-purple-950/90 border-purple-700/70',
    'bg-violet-950/90 border-violet-700/70',
    'bg-slate-800/90 border-slate-600/70',
    'bg-stone-800/90 border-stone-600/70',
    'bg-zinc-800/90 border-zinc-600/70',
  ],
  BR: [
    'bg-emerald-900/80 border-emerald-600/70',
    'bg-green-950/90 border-green-700/70',
    'bg-teal-900/80 border-teal-600/70',
    'bg-cyan-900/80 border-cyan-600/70',
    'bg-lime-900/80 border-lime-600/70',
    'bg-orange-900/80 border-orange-600/70',
    'bg-amber-900/80 border-amber-600/70',
  ],
};

// Separate palette for the per-quadrant visualization boards (keeps text colors)
const paletteWithTextByPrefix: Record<string, string[]> = {
  TL: [
    'bg-sky-950/90 text-sky-100 border-sky-700/70',
    'bg-cyan-950/90 text-cyan-100 border-cyan-700/70',
    'bg-blue-900/80 text-blue-100 border-blue-700/70',
    'bg-indigo-950/90 text-indigo-100 border-indigo-700/70',
    'bg-teal-950/90 text-teal-100 border-teal-700/70',
    'bg-sky-900/80 text-sky-100 border-sky-600/70',
    'bg-blue-950/90 text-blue-100 border-blue-800/70',
  ],
  TR: [
    'bg-orange-950/90 text-orange-100 border-orange-700/70',
    'bg-amber-950/90 text-amber-100 border-amber-700/70',
    'bg-yellow-950/90 text-yellow-100 border-yellow-700/70',
    'bg-red-950/90 text-red-100 border-red-700/70',
    'bg-lime-950/90 text-lime-100 border-lime-700/70',
    'bg-emerald-950/90 text-emerald-100 border-emerald-700/70',
    'bg-rose-950/90 text-rose-100 border-rose-700/70',
  ],
  BL: [
    'bg-fuchsia-950/90 text-fuchsia-100 border-fuchsia-700/70',
    'bg-pink-950/90 text-pink-100 border-pink-700/70',
    'bg-purple-950/90 text-purple-100 border-purple-700/70',
    'bg-violet-950/90 text-violet-100 border-violet-700/70',
    'bg-slate-800/90 text-slate-100 border-slate-600/70',
    'bg-stone-800/90 text-stone-100 border-stone-600/70',
    'bg-zinc-800/90 text-zinc-100 border-zinc-600/70',
  ],
  BR: [
    'bg-emerald-900/80 text-emerald-100 border-emerald-600/70',
    'bg-green-950/90 text-green-100 border-green-700/70',
    'bg-teal-900/80 text-teal-100 border-teal-600/70',
    'bg-cyan-900/80 text-cyan-100 border-cyan-600/70',
    'bg-lime-900/80 text-lime-100 border-lime-600/70',
    'bg-orange-900/80 text-orange-100 border-orange-600/70',
    'bg-amber-900/80 text-amber-100 border-amber-600/70',
  ],
};

function paletteCls(cell: QueensAdminStitchingCell, withText = false): string {
  if (cell.state === 'blackout') return '';
  const prefix = cell.groupId?.slice(0, 2) ?? 'TL';
  const map = withText ? paletteWithTextByPrefix : paletteByPrefix;
  const palette = map[prefix] ?? map.TL;
  const slot = cell.groupSlot ?? 0;
  return palette[slot % palette.length];
}

// ── Visualization-only board (used per quadrant) ────────────────────────────

const QuadrantBoard = defineComponent({
  name: 'QuadrantBoard',
  props: {
    rows: {
      type: Array as PropType<QueensAdminStitchingCell[][]>,
      required: true,
    },
    columns: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'rounded-[26px] border border-semantic-neutral-800 bg-surface-darkSoft p-4' },
        [
          h(
            'div',
            {
              class: 'grid gap-1.5',
              style: { gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` },
            },
            props.rows.flatMap((row, ri) =>
              row.map((cell, ci) =>
                h(
                  'div',
                  {
                    key: `${ri}-${ci}`,
                    class: [
                      'aspect-square rounded-lg border text-[11px] font-semibold flex items-center justify-center',
                      cell.state === 'blackout'
                        ? 'bg-neutral-950 text-neutral-500 border-neutral-700'
                        : paletteCls(cell, true),
                      cell.state === 'queen'
                        ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]'
                        : '',
                    ],
                    title: `row ${ri + 1}, col ${ci + 1}`,
                  },
                  cell.state === 'queen' ? 'Q' : cell.state === 'blackout' ? '■' : ''
                )
              )
            )
          ),
        ]
      );
  },
});

// ── Interactive stitched play board ──────────────────────────────────────────

const StitchedPlayBoard = defineComponent({
  name: 'StitchedPlayBoard',
  props: {
    rows: {
      type: Array as PropType<QueensAdminStitchingCell[][]>,
      required: true,
    },
    columns: {
      type: Number,
      required: true,
    },
    showQueens: {
      type: Boolean,
      default: true,
    },
    playMarks: {
      type: Object as PropType<Record<string, 'queen' | 'flag'>>,
      required: true,
    },
  },
  emits: ['cellClick'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { class: 'rounded-[26px] border border-semantic-neutral-800 bg-surface-darkSoft p-4' },
        [
          h(
            'div',
            {
              class: 'grid gap-1',
              style: { gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` },
            },
            props.rows.flatMap((row, ri) =>
              row.map((cell, ci) => {
                const isBlackout = cell.state === 'blackout';
                const key = `${ri},${ci}`;
                const playerMark = props.playMarks[key];
                const isSolution = cell.state === 'queen';
                const showSolutionHere = isSolution && props.showQueens;

                // Inner content is in a <span> so its text/emoji size doesn't inherit
                // the cell's text classes (palette text color) — emoji are self-colored
                let inner: ReturnType<typeof h> | undefined;
                if (isBlackout) {
                  inner = h('span', { class: 'text-[9px] text-neutral-500' }, '■');
                } else if (playerMark === 'queen') {
                  inner = h('span', { class: 'text-lg leading-none' }, '👑');
                } else if (playerMark === 'flag') {
                  inner = h('span', { class: 'text-lg leading-none' }, '🚧');
                } else if (showSolutionHere) {
                  inner = h('span', { class: 'text-lg leading-none opacity-30' }, '👑');
                }

                return h(
                  'div',
                  {
                    key: `${ri}-${ci}`,
                    class: [
                      'aspect-square rounded-md border flex items-center justify-center select-none transition-colors',
                      isBlackout
                        ? 'bg-neutral-950 border-neutral-700 cursor-default'
                        : `${paletteCls(cell)} cursor-pointer hover:opacity-80`,
                    ],
                    onClick: isBlackout ? undefined : () => emit('cellClick', ri, ci),
                    title: `row ${ri + 1}, col ${ci + 1}`,
                  },
                  inner ? [inner] : []
                );
              })
            )
          ),
        ]
      );
  },
});

// ── Quadrant meta ────────────────────────────────────────────────────────────

const QuadrantMeta = defineComponent({
  name: 'QuadrantMeta',
  props: {
    quadrant: {
      type: Object as PropType<QueensAdminStitchingQuadrant | null>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const q = props.quadrant;
      if (!q) {
        return h('div', { class: 'mb-4 text-xs text-semantic-neutral-500' }, 'Loading…');
      }

      const met = q.queenCount >= q.targetQueenCount;

      return h('div', { class: 'mb-4 grid gap-2 grid-cols-3' }, [
        h(
          'div',
          { class: 'rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2' },
          [
            h(
              'div',
              { class: 'text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400' },
              'Queens'
            ),
            h(
              'div',
              {
                class: [
                  'mt-1 text-sm font-semibold',
                  met ? 'text-semantic-success-300' : 'text-semantic-error-300',
                ],
              },
              `${q.queenCount} / ${q.targetQueenCount}`
            ),
          ]
        ),
        h(
          'div',
          { class: 'rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2' },
          [
            h(
              'div',
              { class: 'text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400' },
              'Left Sig'
            ),
            h(
              'div',
              {
                class:
                  'mt-1 text-xs font-medium text-semantic-neutral-200 leading-relaxed break-all',
              },
              q.leftBlackoutSignature.join(',')
            ),
          ]
        ),
        h(
          'div',
          { class: 'rounded-xl border border-semantic-neutral-800 bg-surface-darkSoft px-3 py-2' },
          [
            h(
              'div',
              { class: 'text-[10px] uppercase tracking-[0.18em] text-semantic-neutral-400' },
              'Top Sig'
            ),
            h(
              'div',
              {
                class:
                  'mt-1 text-xs font-medium text-semantic-neutral-200 leading-relaxed break-all',
              },
              q.topBlackoutSignature.join(',')
            ),
          ]
        ),
      ]);
    };
  },
});

// ── Quadrant status badge ────────────────────────────────────────────────────

const QuadrantStatusBadge = defineComponent({
  name: 'QuadrantStatusBadge',
  props: {
    quadrant: {
      type: Object as PropType<QueensAdminStitchingQuadrant | null>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const q = props.quadrant;
      if (!q) {
        return h(
          'span',
          {
            class:
              'rounded-full bg-surface-darkSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400',
          },
          'Pending'
        );
      }
      const met = q.queenCount >= q.targetQueenCount;
      return h(
        'span',
        {
          class: met
            ? 'rounded-full bg-feedback-successSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-success-100'
            : 'rounded-full bg-feedback-errorSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-error-100',
        },
        met ? `✓ ${q.queenCount} queens` : `✗ ${q.queenCount} / ${q.targetQueenCount}`
      );
    };
  },
});

// ── State ────────────────────────────────────────────────────────────────────

const preview = ref<QueensAdminStitchingPreview | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const persistedInputs = loadQueensAdminStitchingInputs();
const showQueens = ref(persistedInputs?.showQueens ?? true);
const playMarks = ref<Record<string, 'queen' | 'flag'>>({});
const stitchingStats = ref<QueensAdminStitchingCatalogStats | null>(null);
const stitchingError = ref<string | null>(null);
const stitchingMessage = ref<string | null>(null);
const stitchingBatchLoading = ref(false);
const stitchingExportLoading = ref(false);
const stitchingDeleteLoading = ref(false);
const stitchingDiscoveryLoading = ref(false);
const activeStitchingBatch = ref<QueensAdminStitchingBatchStatus | null>(null);
const activeDiscoveryRun = ref<QueensAdminStitchingDiscoveryStatus | null>(null);
const fingerprintSpace = ref<QueensAdminStitchingFingerprintSpace | null>(null);
const selectedBatchPreset = ref<
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'all-preview'
  | 'all-left-only'
  | 'all-top-only'
  | 'all-both'
  | 'all-reachable'
>(persistedInputs?.selectedBatchPreset ?? 'all-preview');
const runsPerFingerprint = ref(persistedInputs?.runsPerFingerprint ?? 5);
const stitchingConcurrency = ref(persistedInputs?.stitchingConcurrency ?? 2);
const discoveryGenerationLimit = ref(persistedInputs?.discoveryGenerationLimit ?? 50);
const discoverySkipSatisfiedBuckets = ref(persistedInputs?.discoverySkipSatisfiedBuckets ?? true);
const discoveryMaxConcurrentJobs = ref(persistedInputs?.discoveryMaxConcurrentJobs ?? 1);
const discoveryMinRegionSize = ref(persistedInputs?.discoveryMinRegionSize ?? 2);
const stitchingExportResult = ref<{
  outputPath: string;
  bucketCount: number;
  puzzleCount: number;
} | null>(null);
let stitchingBatchPollHandle: number | null = null;
let stitchingDiscoveryPollHandle: number | null = null;

// ── Computed ─────────────────────────────────────────────────────────────────

const quadrantQueenSummary = computed(() => {
  if (!preview.value) return '— / — / — / —';
  const { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br } = preview.value;
  return `${tl.queenCount} / ${tr.queenCount} / ${bl.queenCount} / ${br.queenCount}`;
});

const quadrantBlackoutSummary = computed(() => {
  if (!preview.value) return '— / — / —';
  const { topRight: tr, bottomLeft: bl, bottomRight: br } = preview.value;
  return `${tr.blackoutCellCount} / ${bl.blackoutCellCount} / ${br.blackoutCellCount}`;
});

const stitchedSizeLabel = computed(() => {
  if (!preview.value) return '14 × 14';
  return `${preview.value.stitchedBoard.width} × ${preview.value.stitchedBoard.height}`;
});

const selectedBatchRuns = computed<QueensAdminStitchingBatchRunRequest[]>(() => {
  if (!preview.value) return [];
  const runs: Record<
    'top-right' | 'bottom-left' | 'bottom-right' | 'all-preview',
    QueensAdminStitchingBatchRunRequest[]
  > = {
    'top-right': [
      {
        pieceKind: 'TOP_RIGHT',
        leftBlackoutSignature: preview.value.topRight.leftBlackoutSignature,
        topBlackoutSignature: preview.value.topRight.topBlackoutSignature,
        targetQueenCount: preview.value.topRight.targetQueenCount,
      },
    ],
    'bottom-left': [
      {
        pieceKind: 'BOTTOM_LEFT',
        leftBlackoutSignature: preview.value.bottomLeft.leftBlackoutSignature,
        topBlackoutSignature: preview.value.bottomLeft.topBlackoutSignature,
        targetQueenCount: preview.value.bottomLeft.targetQueenCount,
      },
    ],
    'bottom-right': [
      {
        pieceKind: 'BOTTOM_RIGHT',
        leftBlackoutSignature: preview.value.bottomRight.leftBlackoutSignature,
        topBlackoutSignature: preview.value.bottomRight.topBlackoutSignature,
        targetQueenCount: preview.value.bottomRight.targetQueenCount,
      },
    ],
    'all-preview': [
      {
        pieceKind: 'TOP_RIGHT',
        leftBlackoutSignature: preview.value.topRight.leftBlackoutSignature,
        topBlackoutSignature: preview.value.topRight.topBlackoutSignature,
        targetQueenCount: preview.value.topRight.targetQueenCount,
      },
      {
        pieceKind: 'BOTTOM_LEFT',
        leftBlackoutSignature: preview.value.bottomLeft.leftBlackoutSignature,
        topBlackoutSignature: preview.value.bottomLeft.topBlackoutSignature,
        targetQueenCount: preview.value.bottomLeft.targetQueenCount,
      },
      {
        pieceKind: 'BOTTOM_RIGHT',
        leftBlackoutSignature: preview.value.bottomRight.leftBlackoutSignature,
        topBlackoutSignature: preview.value.bottomRight.topBlackoutSignature,
        targetQueenCount: preview.value.bottomRight.targetQueenCount,
      },
    ],
  };
  if (!(selectedBatchPreset.value in runs)) return [];
  return runs[selectedBatchPreset.value as keyof typeof runs];
});

const selectedBatchSummary = computed(() => {
  const space = fingerprintSpace.value;
  if (!space) return 'Loading fingerprint-space counts…';
  switch (selectedBatchPreset.value) {
    case 'all-left-only':
      return `${space.leftOnlyFingerprintCount} left-only fingerprints × ${runsPerFingerprint.value} runs each`;
    case 'all-top-only':
      return `${space.topOnlyFingerprintCount} top-only fingerprints × ${runsPerFingerprint.value} runs each`;
    case 'all-both':
      return `${formatLargeCount(space.bothFingerprintCount)} both-edge fingerprints × ${runsPerFingerprint.value} runs each`;
    case 'all-reachable':
      return `${formatLargeCount(space.totalFingerprintCount)} total reachable fingerprints × ${runsPerFingerprint.value} runs each`;
    default:
      return `${selectedBatchRuns.value.length} preview-derived fingerprints × ${runsPerFingerprint.value} runs each`;
  }
});

const stitchingBatchProgress = computed(() => {
  const batch = activeStitchingBatch.value;
  if (!batch || batch.totalJobs === 0) return 0;
  return Math.round((batch.completedJobs / batch.totalJobs) * 100);
});

const discoveryProgressSummary = computed(() => {
  const run = activeDiscoveryRun.value;
  if (!run) return 'No discovery run yet.';
  return `${run.generatedCount} generated · ${run.skippedCount} skipped · ${run.failedCount} failed · ${run.queuedCount} queued`;
});

const discoveryStatusTone = computed(() => {
  switch (activeDiscoveryRun.value?.state) {
    case 'RUNNING':
      return 'info';
    case 'STOPPING':
      return 'warn';
    case 'FAILED':
      return 'danger';
    case 'COMPLETED':
    case 'INTERRUPTED':
      return 'success';
    default:
      return 'neutral';
  }
});

const playerQueenCount = computed(
  () => Object.values(playMarks.value).filter((m) => m === 'queen').length
);

const playerFlagCount = computed(
  () => Object.values(playMarks.value).filter((m) => m === 'flag').length
);

// ── Auto-flagging ─────────────────────────────────────────────────────────────
//
// Mirrors QueensConstraintService.isConflict on the frontend:
//   - Same row: abs(col diff) < orthogonalMinDistance
//   - Same col: abs(row diff) < orthogonalMinDistance
//   - Diagonal touch: abs(row diff) == 1 AND abs(col diff) == 1
//   - Same color group: same groupId

function computeAutoFlags(
  qRow: number,
  qCol: number,
  queenCell: QueensAdminStitchingCell
): string[] {
  const board = preview.value?.stitchedBoard;
  const orthDist = preview.value?.orthogonalMinDistance ?? 5;
  if (!board) return [];

  const queenGroupId = queenCell.groupId ?? null;
  const flags: string[] = [];

  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      if (r === qRow && c === qCol) continue;
      const cell = board.cells[r]?.[c];
      if (!cell || cell.state === 'blackout') continue;

      const rowDiff = Math.abs(r - qRow);
      const colDiff = Math.abs(c - qCol);

      const conflicts =
        (r === qRow && colDiff < orthDist) ||
        (c === qCol && rowDiff < orthDist) ||
        (rowDiff === 1 && colDiff === 1) ||
        (queenGroupId !== null && cell.groupId === queenGroupId);

      if (conflicts) {
        flags.push(`${r},${c}`);
      }
    }
  }

  return flags;
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function loadPreview(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  playMarks.value = {};
  try {
    preview.value = await queensAdminApi.getStitchingPreview();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to generate the stitching preview';
    preview.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadStitchingCatalogStats(): Promise<void> {
  try {
    stitchingStats.value = await queensAdminApi.getStitchingCatalogStats();
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to load stitching catalog stats';
  }
}

async function loadFingerprintSpace(): Promise<void> {
  try {
    fingerprintSpace.value = await queensAdminApi.getStitchingFingerprintSpace();
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to load stitching fingerprint space';
  }
}

function formatLargeCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function stopStitchingBatchPolling(): void {
  if (stitchingBatchPollHandle != null) {
    window.clearInterval(stitchingBatchPollHandle);
    stitchingBatchPollHandle = null;
  }
}

function stopDiscoveryPolling(): void {
  if (stitchingDiscoveryPollHandle != null) {
    window.clearInterval(stitchingDiscoveryPollHandle);
    stitchingDiscoveryPollHandle = null;
  }
}

function startStitchingBatchPolling(batchId: string): void {
  stopStitchingBatchPolling();
  stitchingBatchPollHandle = window.setInterval(async () => {
    try {
      const status = await queensAdminApi.getStitchingBatchStatus(batchId);
      activeStitchingBatch.value = status;
      if (status.state !== 'RUNNING' && status.state !== 'QUEUED') {
        stopStitchingBatchPolling();
        await loadStitchingCatalogStats();
      }
    } catch (error) {
      stitchingError.value =
        error instanceof Error ? error.message : 'Failed to poll stitching batch status';
      stopStitchingBatchPolling();
    }
  }, 2000);
}

function startDiscoveryPolling(): void {
  stopDiscoveryPolling();
  stitchingDiscoveryPollHandle = window.setInterval(async () => {
    try {
      const status = await queensAdminApi.getStitchingDiscoveryStatus();
      activeDiscoveryRun.value = status;
      if (!status || !['RUNNING', 'STOPPING'].includes(status.state)) {
        stopDiscoveryPolling();
        await loadStitchingCatalogStats();
      }
    } catch (error) {
      stitchingError.value =
        error instanceof Error ? error.message : 'Failed to poll discovery status';
      stopDiscoveryPolling();
    }
  }, 2000);
}

async function startStitchingBatch(): Promise<void> {
  if (!selectedBatchPreset.value.startsWith('all-') && selectedBatchRuns.value.length === 0) return;
  stitchingBatchLoading.value = true;
  stitchingError.value = null;
  stitchingMessage.value = null;
  try {
    const batchId = await queensAdminApi.startStitchingBatch({
      size: 7,
      orthogonalMinDistance: 5,
      minimumGroupSize: 3,
      runsPerFingerprint: runsPerFingerprint.value,
      maxConcurrentJobs: stitchingConcurrency.value,
      preset:
        selectedBatchPreset.value === 'all-left-only'
          ? 'ALL_LEFT_ONLY'
          : selectedBatchPreset.value === 'all-top-only'
            ? 'ALL_TOP_ONLY'
            : selectedBatchPreset.value === 'all-both'
              ? 'ALL_BOTH'
              : selectedBatchPreset.value === 'all-reachable'
                ? 'ALL_REACHABLE'
                : null,
      runs: selectedBatchPreset.value.startsWith('all-') ? [] : selectedBatchRuns.value,
    });
    activeStitchingBatch.value = await queensAdminApi.getStitchingBatchStatus(batchId);
    stitchingMessage.value = `Started stitching batch ${batchId}.`;
    startStitchingBatchPolling(batchId);
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to start stitching batch';
  } finally {
    stitchingBatchLoading.value = false;
  }
}

async function cancelStitchingBatch(): Promise<void> {
  if (!activeStitchingBatch.value) return;
  try {
    activeStitchingBatch.value = await queensAdminApi.cancelStitchingBatch(
      activeStitchingBatch.value.batchId
    );
    stopStitchingBatchPolling();
    await loadStitchingCatalogStats();
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to cancel stitching batch';
  }
}

async function exportCatalog(): Promise<void> {
  stitchingExportLoading.value = true;
  stitchingError.value = null;
  try {
    stitchingExportResult.value = await queensAdminApi.exportStitchingCatalog();
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to export stitching catalog';
  } finally {
    stitchingExportLoading.value = false;
  }
}

async function deleteBlackoutStitchingPuzzles(): Promise<void> {
  if (
    !window.confirm(
      'Delete ALL stitching puzzles, including seeds and generated pieces? This will not affect the normal Queens puzzle catalog.'
    )
  ) {
    return;
  }

  stitchingDeleteLoading.value = true;
  stitchingError.value = null;
  stitchingMessage.value = null;
  try {
    const deletedCount = await queensAdminApi.deleteBlackoutStitchingPuzzles();
    stitchingMessage.value = `Deleted ${deletedCount} blackout stitching puzzle${deletedCount === 1 ? '' : 's'}.`;
    await loadStitchingCatalogStats();
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to delete blackout stitching puzzles';
  } finally {
    stitchingDeleteLoading.value = false;
  }
}

async function loadDiscoveryStatus(): Promise<void> {
  try {
    activeDiscoveryRun.value = await queensAdminApi.getStitchingDiscoveryStatus();
    if (
      activeDiscoveryRun.value &&
      ['RUNNING', 'STOPPING'].includes(activeDiscoveryRun.value.state)
    ) {
      startDiscoveryPolling();
    }
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to load stitching discovery status';
  }
}

async function startDiscoveryRun(): Promise<void> {
  stitchingDiscoveryLoading.value = true;
  stitchingError.value = null;
  stitchingMessage.value = null;
  try {
    activeDiscoveryRun.value = await queensAdminApi.startStitchingDiscovery({
      generationLimit: discoveryGenerationLimit.value,
      skipSatisfiedBuckets: discoverySkipSatisfiedBuckets.value,
      maxConcurrentJobs: discoveryMaxConcurrentJobs.value,
      minRegionSize: discoveryMinRegionSize.value,
    });
    stitchingMessage.value = `Started discovery run ${activeDiscoveryRun.value.runId.slice(0, 8)}.`;
    startDiscoveryPolling();
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to start stitching discovery run';
  } finally {
    stitchingDiscoveryLoading.value = false;
  }
}

async function stopDiscoveryRun(): Promise<void> {
  try {
    activeDiscoveryRun.value = await queensAdminApi.stopStitchingDiscovery();
    if (!activeDiscoveryRun.value || activeDiscoveryRun.value.state !== 'STOPPING') {
      stopDiscoveryPolling();
    }
  } catch (error) {
    stitchingError.value =
      error instanceof Error ? error.message : 'Failed to stop stitching discovery run';
  }
}

function onCellClick(row: number, col: number): void {
  const cell = preview.value?.stitchedBoard.cells[row]?.[col];
  if (!cell || cell.state === 'blackout') return;

  const key = `${row},${col}`;
  const current = playMarks.value[key];

  if (current === 'queen') {
    // Queen → remove
    const { [key]: _removed, ...rest } = playMarks.value;
    playMarks.value = rest;
  } else if (current === 'flag') {
    // Flag → queen + auto-flag conflicts
    const newMarks = { ...playMarks.value, [key]: 'queen' as const };
    for (const flagKey of computeAutoFlags(row, col, cell)) {
      if (!newMarks[flagKey]) {
        newMarks[flagKey] = 'flag';
      }
    }
    playMarks.value = newMarks;
  } else {
    // Empty → flag
    playMarks.value = { ...playMarks.value, [key]: 'flag' };
  }
}

onMounted(() => {
  void loadPreview();
  void loadStitchingCatalogStats();
  void loadFingerprintSpace();
  void loadDiscoveryStatus();
});

onUnmounted(() => {
  stopStitchingBatchPolling();
  stopDiscoveryPolling();
});

watch(
  [
    showQueens,
    selectedBatchPreset,
    runsPerFingerprint,
    stitchingConcurrency,
    discoveryGenerationLimit,
    discoverySkipSatisfiedBuckets,
    discoveryMaxConcurrentJobs,
    discoveryMinRegionSize,
  ],
  () => {
    saveQueensAdminStitchingInputs({
      showQueens: showQueens.value,
      selectedBatchPreset: selectedBatchPreset.value,
      runsPerFingerprint: runsPerFingerprint.value,
      stitchingConcurrency: stitchingConcurrency.value,
      discoveryGenerationLimit: discoveryGenerationLimit.value,
      discoverySkipSatisfiedBuckets: discoverySkipSatisfiedBuckets.value,
      discoveryMaxConcurrentJobs: discoveryMaxConcurrentJobs.value,
      discoveryMinRegionSize: discoveryMinRegionSize.value,
    });
  },
  { deep: false }
);
</script>
