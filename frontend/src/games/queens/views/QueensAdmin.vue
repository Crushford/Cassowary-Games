<template>
  <div
    class="queens-admin-page min-h-screen select-text bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_26%),linear-gradient(180deg,_#111827_0%,_#0f172a_100%)] px-6 py-8 text-white"
  >
    <div class="mx-auto flex max-w-[1760px] flex-col gap-6">
      <header class="space-y-5">
        <Toolbar
          class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm px-5 py-5"
        >
          <template #start>
            <div class="max-w-4xl">
              <p
                class="text-sm font-semibold uppercase tracking-[0.28em] text-semantic-warning-200"
              >
                Queens Admin
              </p>
              <h1 class="mt-2 text-4xl font-bold tracking-tight">Generation Workshop</h1>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-semantic-neutral-300">
                Build a puzzle the same way the generator does: create a board, place queens, seed
                unique colors, expand groups in order, then fill blocked squares.
              </p>
            </div>
          </template>
          <template #end>
            <div class="flex flex-wrap items-center justify-end gap-3">
              <Tag
                :severity="store.loading ? 'info' : 'contrast'"
                :value="store.loading ? 'Backend Working' : 'Backend Ready'"
                rounded
              />
              <Button
                v-if="store.canCancelRequest"
                type="button"
                label="Interrupt Request"
                severity="danger"
                outlined
                @click="store.cancelCurrentOperation()"
              />
            </div>
          </template>
        </Toolbar>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat
            label="Board"
            :value="`${store.boardSummary.size} x ${store.boardSummary.size}`"
          />
          <AdminStat label="Phase" :value="generationPhaseLabel" />
          <AdminStat label="Tool" :value="toolLabels[store.selectedTool]" />
          <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
            <div class="text-sm text-semantic-neutral-400">Generation Progress</div>
            <div class="mt-1 text-2xl font-semibold text-white">
              {{ store.generationProgress ? `${generationProgressPercent}%` : 'Idle' }}
            </div>
            <ProgressBar
              :value="store.generationProgress ? generationProgressPercent : 0"
              :show-value="false"
              class="mt-3 h-2 overflow-hidden rounded-full"
            />
          </div>
        </div>
      </header>

      <Tabs
        :value="activeTab"
        class="rounded-[26px] border border-semantic-neutral-800 bg-surface-darkFirm px-3 py-3"
        @update:value="handleActiveTabChange"
      >
        <TabList class="gap-2">
          <Tab value="workshop" class="rounded-full px-4 py-2 text-sm font-semibold">Workshop</Tab>
          <Tab value="batch" class="rounded-full px-4 py-2 text-sm font-semibold">
            Batch Generate
          </Tab>
          <Tab value="catalog" class="rounded-full px-4 py-2 text-sm font-semibold">Catalog</Tab>
          <Tab value="max-queens" class="rounded-full px-4 py-2 text-sm font-semibold">
            Max Queens
          </Tab>
          <Tab value="solver" class="rounded-full px-4 py-2 text-sm font-semibold">Solver</Tab>
        </TabList>
      </Tabs>

      <div
        v-if="activeTab === 'workshop'"
        class="grid min-h-[820px] gap-6 xl:grid-cols-[390px_minmax(0,1fr)_390px]"
      >
        <aside
          class="space-y-4 rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5"
        >
          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Board Setup</h2>
                <p class="mt-1 text-sm text-semantic-neutral-400">
                  Start a fresh workshop board or ask the backend to make a complete one.
                </p>
              </div>
              <div
                class="rounded-full border border-edge-warningMuted bg-feedback-warningSubtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-semantic-warning-200"
              >
                Start Here
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <label class="block text-sm text-semantic-neutral-300" for="board-size"
                >Puzzle size</label
              >
              <select
                id="board-size"
                v-model.number="selectedBoardSize"
                class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
              >
                <option v-for="size in boardSizes" :key="size" :value="size">
                  {{ size }} x {{ size }}
                </option>
              </select>
            </div>

            <div class="mt-4 space-y-3">
              <label class="block text-sm text-semantic-neutral-300" for="generation-strategy"
                >Generation strategy</label
              >
              <select
                id="generation-strategy"
                v-model="store.generationStrategy"
                class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
              >
                <option value="baseline">Baseline random fallback</option>
                <option value="marker-guided">Marker-guided experiment</option>
                <option value="template-seeded">Template-seeded experiment</option>
              </select>
              <p class="text-xs leading-5 text-semantic-neutral-400">
                Marker-guided mode prioritizes squares that look safe for another adjacent region to
                steal, while template-seeded mode tries to start as many queen regions as possible
                from your custom shape and requires that at least half of them fit before normal
                expansion continues.
              </p>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="space-y-3">
                <label class="block text-sm text-semantic-neutral-300" for="queen-count-mode"
                  >Queen count mode</label
                >
                <select
                  id="queen-count-mode"
                  v-model="store.queenCountMode"
                  class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
                >
                  <option value="exact">Exact target</option>
                  <option value="max">Maximum that fits</option>
                </select>
              </div>
              <div class="space-y-3">
                <label class="block text-sm text-semantic-neutral-300" for="target-queen-count"
                  >Target queens</label
                >
                <input
                  id="target-queen-count"
                  v-model.number="store.targetQueenCount"
                  type="number"
                  min="1"
                  :max="selectedBoardSize * selectedBoardSize"
                  :disabled="store.queenCountMode === 'max'"
                  class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
                />
              </div>
              <div class="space-y-3">
                <label class="block text-sm text-semantic-neutral-300" for="orthogonal-min-distance"
                  >Orthogonal min distance</label
                >
                <input
                  id="orthogonal-min-distance"
                  v-model.number="store.orthogonalMinDistance"
                  type="number"
                  min="1"
                  :max="selectedBoardSize * selectedBoardSize"
                  class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
                />
              </div>
              <p class="sm:col-span-2 text-xs leading-5 text-semantic-neutral-400">
                Classic Queens is the special case where the queen count resolves to board size and
                the orthogonal distance also equals board size. Use Exact target for a fixed count,
                or Maximum that fits to let the backend find the densest legal placement first.
              </p>
              <p
                v-if="store.queenCountMode === 'max' && !maxQueenConfigSupported"
                class="sm:col-span-2 text-xs leading-5 text-semantic-warning-200"
              >
                Max mode is only available for {{ selectedBoardSize }}x{{ selectedBoardSize }} with
                orthogonal distances {{ supportedMaxDistancesLabel }}.
              </p>
            </div>

            <div class="mt-4 space-y-3">
              <label class="block text-sm text-semantic-neutral-300" for="minimum-group-size"
                >Minimum region size</label
              >
              <input
                id="minimum-group-size"
                v-model.number="store.minimumGroupSize"
                type="number"
                min="1"
                :max="selectedBoardSize"
                class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
              />
              <p class="text-xs leading-5 text-semantic-neutral-400">
                The generator will try to grow every queen region to at least this many squares
                before filling the remaining blocked spaces.
              </p>
            </div>

            <div class="mt-4 space-y-3">
              <label class="block text-sm text-semantic-neutral-300" for="preview-interval"
                >Live preview update interval</label
              >
              <select
                id="preview-interval"
                v-model.number="generationPreviewIntervalMs"
                class="w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-3 py-2 text-sm"
              >
                <option :value="50">0.05 seconds</option>
                <option :value="100">0.1 seconds</option>
                <option :value="250">0.25 seconds</option>
                <option :value="500">0.5 seconds</option>
                <option :value="1000">1 second</option>
                <option :value="2000">2 seconds</option>
                <option :value="5000">5 seconds</option>
              </select>
              <p class="text-xs leading-5 text-semantic-neutral-400">
                While the backend is generating, the workshop will only swap to the latest board
                snapshot once this much time has passed.
              </p>
            </div>

            <div class="mt-4 grid gap-2">
              <button
                class="rounded-xl bg-semantic-info-600 px-4 py-2.5 font-semibold text-white hover:bg-semantic-info-500"
                :disabled="store.loading || !maxGenerationConfigValid"
                @click="
                  store.createBoard(selectedBoardSize, {
                    queenCountMode: store.queenCountMode,
                    targetQueenCount: store.targetQueenCount,
                    orthogonalMinDistance: store.orthogonalMinDistance,
                  })
                "
              >
                Create Empty Board
              </button>
              <button
                class="rounded-xl bg-semantic-success-600 px-4 py-2.5 font-semibold text-white hover:bg-semantic-success-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="store.loading || !templateSeedIsValid || !maxGenerationConfigValid"
                @click="generateBoardFromWorkshop"
              >
                Generate Full Board
              </button>
              <button
                v-if="store.canCancelRequest"
                type="button"
                class="rounded-xl border border-semantic-danger-700 bg-feedback-dangerSubtle px-4 py-2.5 font-semibold text-semantic-danger-100 hover:bg-feedback-dangerSoft"
                @click="store.cancelCurrentOperation()"
              >
                Interrupt Backend Request
              </button>
              <button
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-4 py-2.5 font-semibold text-white hover:bg-semantic-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.board || store.loading"
                @click="store.clearBoard()"
              >
                Clear Board
              </button>
              <button
                class="rounded-xl border border-semantic-danger-700 bg-feedback-dangerSubtle px-4 py-2.5 font-semibold text-semantic-danger-100 hover:bg-feedback-dangerSoft disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.board || store.loading"
                @click="store.deleteBoard()"
              >
                Delete Board From Store
              </button>
              <a
                v-if="playInQueensHref"
                :href="playInQueensHref"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-xl border border-semantic-info-700 bg-feedback-infoFaint px-4 py-2.5 text-center font-semibold text-semantic-info-100 transition hover:bg-feedback-infoSoft"
              >
                Play In Queens
              </a>
              <button
                v-if="shareableQueensPuzzleUrl"
                type="button"
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-semantic-neutral-700"
                @click="copyPuzzleUrl"
              >
                {{ copyButtonLabels.url }}
              </button>
              <button
                v-else-if="!playInQueensHref"
                type="button"
                disabled
                class="rounded-xl border border-semantic-info-700 bg-feedback-infoFaint px-4 py-2.5 text-center font-semibold text-semantic-info-100 opacity-50"
              >
                Play In Queens
              </button>
              <button
                v-if="!shareableQueensPuzzleUrl"
                type="button"
                disabled
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-4 py-2.5 text-center font-semibold text-white opacity-50"
              >
                Copy URL
              </button>
            </div>

            <div
              v-if="store.generationProgress"
              class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-white">Generation Progress</h3>
                  <p class="mt-1 text-xs text-semantic-neutral-400">
                    The colored-cell count can rise and fall when a retry rolls back work.
                  </p>
                </div>
                <div
                  class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  :class="generationProgressBadgeClass"
                >
                  {{ store.generationProgress.state }}
                </div>
              </div>

              <div class="mt-4 h-3 overflow-hidden rounded-full bg-semantic-neutral-900">
                <div
                  class="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8_0%,#22c55e_100%)] transition-[width] duration-300"
                  :style="{ width: `${generationProgressPercent}%` }"
                />
              </div>

              <div class="mt-3 flex items-center justify-between text-sm text-semantic-neutral-200">
                <span
                  >{{ store.generationProgress.coloredCellCount }} /
                  {{ store.generationProgress.totalCellCount }} colored</span
                >
                <span>Attempt {{ Math.max(store.generationProgress.attempt, 1) }}</span>
              </div>

              <div class="mt-3 grid gap-2 text-xs text-semantic-neutral-300 sm:grid-cols-2">
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">Strategy</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ generationStrategyLabel(store.generationProgress.strategy) }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">Elapsed</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ formatElapsed(store.generationProgress.elapsedMs) }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">
                    Solver Checks
                  </div>
                  <div class="mt-1 font-semibold text-white">
                    {{ store.generationProgress.metrics.solverChecks }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">Rollbacks</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ store.generationProgress.metrics.rollbacks }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">
                    Marker Squares
                  </div>
                  <div class="mt-1 font-semibold text-white">
                    {{ store.generationProgress.metrics.markerSquares }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">
                    Marker Steals
                  </div>
                  <div class="mt-1 font-semibold text-white">
                    {{ store.generationProgress.metrics.markerGuidedPlacements }} /
                    {{ store.generationProgress.metrics.markerGuidedCandidates }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">
                    Fallback Placements
                  </div>
                  <div class="mt-1 font-semibold text-white">
                    {{ store.generationProgress.metrics.fallbackPlacements }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="uppercase tracking-[0.16em] text-semantic-neutral-400">
                    Successful Placements
                  </div>
                  <div class="mt-1 font-semibold text-white">
                    {{ store.generationProgress.metrics.successfulPlacements }}
                  </div>
                </div>
              </div>

              <div
                class="mt-3 rounded-xl bg-surface-darkMuted p-3 text-sm text-semantic-neutral-200"
              >
                <div class="font-semibold text-white">
                  {{ formatProgressStage(store.generationProgress.stage) }}
                </div>
                <div class="mt-1">{{ store.generationProgress.message }}</div>
              </div>
            </div>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Generation Pipeline</h2>
                <p class="mt-1 text-sm text-semantic-neutral-400">
                  Click each step in order to build the puzzle the same way the generator does.
                </p>
              </div>
              <button
                class="text-xs uppercase tracking-[0.2em] text-semantic-neutral-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.board || store.loading"
                @click="store.validateCurrentBoard()"
              >
                Validate
              </button>
            </div>

            <div class="mt-4 space-y-3">
              <article
                v-for="step in generationSteps"
                :key="step.id"
                class="rounded-2xl border p-4"
                :class="step.statusClass"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-semantic-neutral-400"
                    >
                      {{ step.stage }}
                    </div>
                    <h3 class="mt-1 text-base font-semibold text-white">{{ step.title }}</h3>
                    <p class="mt-2 text-sm leading-6 text-semantic-neutral-300">
                      {{ step.description }}
                    </p>
                  </div>
                  <span
                    class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    :class="step.badgeClass"
                  >
                    {{ step.statusLabel }}
                  </span>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    class="rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                    :class="step.buttonClass"
                    :disabled="step.disabled"
                    @click="step.run"
                  >
                    {{ step.actionLabel }}
                  </button>
                  <button
                    v-if="step.secondaryActionLabel && step.secondaryRun"
                    class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-semantic-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="step.disabled"
                    @click="step.secondaryRun"
                  >
                    {{ step.secondaryActionLabel }}
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Manual Editing</h2>
              <span class="text-xs uppercase tracking-[0.2em] text-semantic-neutral-400"
                >Debug Tools</span
              >
            </div>

            <div class="mt-4 grid gap-2">
              <button
                v-for="tool in tools"
                :key="tool.id"
                class="rounded-xl border px-3 py-2.5 text-left text-sm transition"
                :class="
                  store.selectedTool === tool.id
                    ? 'border-semantic-info-400 bg-feedback-infoSoft text-white'
                    : 'border-semantic-neutral-700 bg-semantic-neutral-900 text-semantic-neutral-200 hover:bg-semantic-neutral-800'
                "
                @click="store.setSelectedTool(tool.id)"
              >
                <span class="block font-semibold">{{ tool.label }}</span>
                <span class="mt-1 block text-xs text-semantic-neutral-400">
                  {{ tool.description }}
                </span>
              </button>
            </div>

            <div class="mt-4">
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-white">Color Palette</h3>
                <span class="text-xs uppercase tracking-[0.2em] text-semantic-neutral-400">
                  {{ store.selectedColor }}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="color in palette"
                  :key="color"
                  type="button"
                  class="rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition"
                  :class="getColorButtonClasses(color)"
                  @click="store.setSelectedColor(color)"
                >
                  {{ color }}
                </button>
              </div>
              <button
                class="mt-3 w-full rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-semantic-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.board || store.loading"
                @click="store.expandSelectedGroup()"
              >
                Expand Selected Color Group
              </button>
            </div>
          </section>

          <section
            v-if="store.backendError"
            class="rounded-2xl border border-edge-dangerSoft bg-feedback-dangerSubtle p-4 text-sm text-semantic-danger-200"
          >
            {{ store.backendError }}
          </section>
        </aside>

        <main
          class="space-y-4 rounded-[32px] border border-semantic-neutral-800 bg-surface-darkSoft p-6"
        >
          <section
            class="rounded-[28px] border border-semantic-neutral-800 bg-surface-overlayDim p-5"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 class="text-2xl font-semibold">Board Workspace</h2>
                <p class="mt-1 text-sm text-semantic-neutral-300">
                  The board stays visible while you advance through the pipeline. Manual tools still
                  go through the backend for mutations.
                </p>
              </div>
              <div
                class="rounded-full border border-semantic-neutral-700 bg-semantic-neutral-950 px-4 py-2 text-xs uppercase tracking-[0.22em] text-semantic-neutral-300"
              >
                {{ store.loading ? 'Backend Request Running' : 'Board Ready' }}
              </div>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-4">
              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkStrong p-3">
                <div class="text-sm text-semantic-neutral-400">Queens</div>
                <div class="mt-1 text-2xl font-semibold">{{ store.boardSummary.queenCount }}</div>
              </div>
              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkStrong p-3">
                <div class="text-sm text-semantic-neutral-400">Flags</div>
                <div class="mt-1 text-2xl font-semibold">{{ store.boardSummary.flaggedCount }}</div>
              </div>
              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkStrong p-3">
                <div class="text-sm text-semantic-neutral-400">Colored Cells</div>
                <div class="mt-1 text-2xl font-semibold">
                  {{ store.boardSummary.coloredCellCount }}
                </div>
              </div>
              <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkStrong p-3">
                <div class="text-sm text-semantic-neutral-400">Color Groups</div>
                <div class="mt-1 text-2xl font-semibold">
                  {{ store.boardSummary.distinctColorCount }}
                </div>
              </div>
              <div
                class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkStrong p-3 md:col-span-2"
              >
                <div class="text-sm text-semantic-neutral-400">Min Distance Between Flags</div>
                <div class="mt-1 text-2xl font-semibold">
                  {{ workshopMinimumFlagDistanceLabel }}
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-3">
              <button
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-4 py-2.5 font-semibold text-white hover:bg-semantic-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.canUndoWorkshopBoard"
                @click="store.undoWorkshopBoardChange()"
              >
                Undo
              </button>
              <button
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-4 py-2.5 font-semibold text-white hover:bg-semantic-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.board"
                @click="store.clearWorkshopBoardMarks()"
              >
                Clear Marks
              </button>
            </div>
          </section>

          <section
            class="rounded-[28px] border border-semantic-neutral-800 bg-surface-overlaySoft p-4"
          >
            <div v-if="store.generationStrategy === 'template-seeded' && !store.board">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 class="text-2xl font-semibold text-white">Seed Template Editor</h3>
                  <p class="mt-1 max-w-2xl text-sm leading-6 text-semantic-neutral-300">
                    Draw the starting region shape here. Click cells to add or remove them. The
                    backend can place this shape anywhere it fits around a queen region, with no
                    special queen anchor cell inside the template.
                  </p>
                </div>
                <div
                  class="rounded-full border border-semantic-info-700 bg-feedback-infoFaint px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-semantic-info-100"
                >
                  Template Workspace
                </div>
              </div>

              <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <div
                  class="rounded-[28px] border border-semantic-neutral-800 bg-surface-darkStrong p-4"
                >
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-900 px-3.5 py-2 text-sm font-semibold text-semantic-neutral-100 transition hover:bg-semantic-neutral-800"
                      @click="resetTemplateSeedEditor"
                    >
                      Reset Default
                    </button>
                    <button
                      type="button"
                      class="rounded-xl border border-semantic-danger-700 bg-feedback-dangerSubtle px-3.5 py-2 text-sm font-semibold text-semantic-danger-100 transition hover:bg-feedback-dangerSoft"
                      @click="clearTemplateSeedEditor"
                    >
                      Clear
                    </button>
                  </div>

                  <div class="mt-4 grid grid-cols-7 gap-2 rounded-2xl bg-semantic-neutral-950 p-3">
                    <button
                      v-for="cell in templateSeedEditorCells"
                      :key="cell.key"
                      type="button"
                      class="flex aspect-square items-center justify-center rounded-2xl border text-xl transition"
                      :class="templateSeedCellClasses(cell)"
                      @click="handleTemplateSeedCellClick(cell.row, cell.col)"
                    >
                      <span v-if="cell.filled" class="text-lg">•</span>
                    </button>
                  </div>
                </div>

                <div class="space-y-4">
                  <div
                    class="rounded-[24px] border border-semantic-neutral-800 bg-surface-darkStrong p-4"
                  >
                    <h4 class="text-lg font-semibold text-white">Template Summary</h4>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      <div class="rounded-xl bg-surface-darkMuted p-3">
                        <div class="text-sm text-semantic-neutral-400">Filled Cells</div>
                        <div class="mt-1 text-2xl font-semibold text-white">
                          {{ templateSeedStats.filledCellCount }}
                        </div>
                      </div>
                      <div class="rounded-xl bg-surface-darkMuted p-3">
                        <div class="text-sm text-semantic-neutral-400">Variants</div>
                        <div class="mt-1 text-2xl font-semibold text-white">
                          {{ templateSeedStats.variantCount }}
                        </div>
                      </div>
                      <div class="rounded-xl bg-surface-darkMuted p-3">
                        <div class="text-sm text-semantic-neutral-400">Connected</div>
                        <div class="mt-1 text-2xl font-semibold text-white">
                          {{ templateSeedStats.connected ? 'Yes' : 'No' }}
                        </div>
                      </div>
                      <div class="rounded-xl bg-surface-darkMuted p-3">
                        <div class="text-sm text-semantic-neutral-400">Status</div>
                        <div class="mt-1 text-lg font-semibold text-white">
                          {{ templateSeedIsValid ? 'Ready To Generate' : 'Needs Fixing' }}
                        </div>
                      </div>
                    </div>
                    <div
                      class="mt-4 rounded-xl bg-surface-darkMuted p-3 text-sm text-semantic-neutral-300"
                    >
                      <p>
                        Normalized offsets:
                        <span class="font-mono text-semantic-neutral-100">{{
                          templateSeedOffsetsDebug
                        }}</span>
                      </p>
                    </div>
                  </div>

                  <div
                    class="rounded-[24px] border border-semantic-neutral-800 bg-surface-darkStrong p-4"
                  >
                    <h4 class="text-lg font-semibold text-white">Validation</h4>
                    <ul class="mt-4 space-y-2 text-sm leading-6 text-semantic-neutral-300">
                      <li>Shape must contain at least 2 filled cells.</li>
                      <li>Shape must be edge-connected.</li>
                    </ul>
                    <div
                      v-if="!templateSeedIsValid"
                      class="mt-4 rounded-xl border border-edge-warningMuted bg-feedback-warningSubtle p-3 text-sm text-semantic-warning-200"
                    >
                      {{ templateSeedValidationMessage }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="space-y-4">
              <div
                v-if="store.board"
                class="rounded-[28px] border border-semantic-neutral-700 bg-surface-overlayMid p-5 shadow-2xl"
              >
                <QueensPuzzleBoard
                  class="h-full w-full max-w-full"
                  :store="queensStore"
                  :enable-touch="false"
                  interactive
                  :show-selected-cell="true"
                  :selected-cell="store.selectedCell"
                  :changed-cells="store.highlightedChangedCells"
                  :on-cell-activate="store.applyManualToolToCell"
                  role="grid"
                  aria-label="Queens admin puzzle grid"
                  data-game-board="queens-admin"
                />
              </div>

              <div
                v-else
                class="flex min-h-[520px] items-center justify-center rounded-[28px] border border-dashed border-semantic-neutral-700 bg-surface-overlaySoft p-12 text-center text-semantic-neutral-300"
              >
                <div class="max-w-sm space-y-3">
                  <p class="text-lg font-semibold text-white">
                    No board in the current admin session
                  </p>
                  <p>
                    Create a board from the left panel to start painting colors, flags, and queens.
                  </p>
                </div>
              </div>

              <div
                class="rounded-[24px] border border-semantic-neutral-800 bg-surface-darkStrong p-4"
              >
                <label
                  for="show-solution-queens"
                  class="flex items-center justify-between gap-4 text-sm text-semantic-neutral-200"
                >
                  <div>
                    <div class="font-semibold text-white">Board Preview</div>
                    <div class="mt-1 text-xs leading-5 text-semantic-neutral-400">
                      Toggle whether the workshop board shows the hidden solution queens.
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-semantic-neutral-400">
                      {{ showSolutionQueens ? 'Queens visible' : 'Queens hidden' }}
                    </span>
                    <input
                      id="show-solution-queens"
                      v-model="showSolutionQueens"
                      type="checkbox"
                      class="h-4 w-4 rounded border-semantic-neutral-600 bg-semantic-neutral-900 text-semantic-info-500"
                    />
                  </div>
                </label>
              </div>
            </div>
          </section>
        </main>

        <aside
          class="space-y-4 rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5"
        >
          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <h2 class="text-lg font-semibold">Pipeline Notes</h2>
            <div class="mt-3 space-y-3 text-sm leading-6 text-semantic-neutral-300">
              <p>
                Step 1 places the hidden solution queens. Step 2 gives each queen a unique color
                seed. Steps 3 and 4 each grow every region by one tile. Step 5 fills constrained
                blocked spaces to finish the board.
              </p>
              <p>
                The full generator runs those stages with its own retry and solvability checks. The
                manual step buttons let you inspect the intermediate board snapshots directly.
              </p>
            </div>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Difficulty Probe</h2>
                <p class="mt-1 text-sm text-semantic-neutral-400">
                  Starts from blank marks, runs the workshop difficulty solver, and shows exactly
                  which rule tier was needed to finish the current puzzle.
                </p>
              </div>
              <button
                type="button"
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!store.board"
                @click="runDifficultyProbe"
              >
                Analyze Puzzle
              </button>
            </div>

            <div
              v-if="difficultyProbe"
              class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                    Difficulty
                  </div>
                  <div class="mt-1 text-2xl font-semibold text-white">
                    {{ difficultyProbe.tier }}
                  </div>
                </div>
                <button
                  type="button"
                  class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                  @click="copyDebugText('difficulty', difficultyProbeDebugText)"
                >
                  {{ copyButtonLabels.difficulty }}
                </button>
              </div>

              <div class="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="text-semantic-neutral-400">Solved</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ difficultyProbe.solved ? 'Yes' : 'No' }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="text-semantic-neutral-400">Hardest Step Reached</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ formatDifficultyPhase(difficultyProbe.hardestStepReached) }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="text-semantic-neutral-400">Flags Placed</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ difficultyProbe.totalFlagsPlaced }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="text-semantic-neutral-400">Queens Placed</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ difficultyProbe.totalQueensPlaced }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="text-semantic-neutral-400">Loops</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ difficultyProbe.loops }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3">
                  <div class="text-semantic-neutral-400">Queen Guesses Tried</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ difficultyProbe.guessesTried }}
                  </div>
                </div>
                <div class="rounded-xl bg-surface-darkMuted p-3 md:col-span-2">
                  <div class="text-semantic-neutral-400">Unresolved Squares After Probe</div>
                  <div class="mt-1 font-semibold text-white">
                    {{ difficultyProbe.unresolvedSquares }}
                  </div>
                </div>
              </div>

              <div class="mt-4">
                <div class="mb-2 text-sm font-semibold text-semantic-info-200">Working Out</div>
                <div class="space-y-2">
                  <article
                    v-for="(entry, index) in difficultyProbe.trace"
                    :key="`${entry.phase}-${index}`"
                    class="rounded-xl border border-semantic-neutral-800 bg-surface-darkMuted p-3 text-sm"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="font-semibold text-white">
                        {{ entry.label }}
                      </div>
                      <span
                        class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                        :class="difficultyPhaseBadgeClass(entry.phase)"
                      >
                        {{ formatDifficultyPhase(entry.phase) }}
                      </span>
                    </div>
                    <p class="mt-2 leading-6 text-semantic-neutral-300">
                      {{ entry.message }}
                    </p>
                    <div class="mt-2 text-xs uppercase tracking-[0.16em] text-semantic-neutral-400">
                      {{ entry.flagsPlaced }} flags · {{ entry.queensPlaced }} queens
                    </div>
                  </article>
                </div>
              </div>
            </div>

            <p v-else class="mt-4 text-sm text-semantic-neutral-400">
              Run the difficulty probe on a fully built puzzle to classify it as extra easy, easy,
              medium, or hard and inspect the step-by-step reasoning trace.
            </p>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">Last Backend Result</h2>
              <button
                type="button"
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                @click="copyDebugText('result', backendResultDebugText)"
              >
                {{ copyButtonLabels.result }}
              </button>
            </div>
            <p class="mt-3 text-sm text-semantic-neutral-200">
              {{ store.lastActionResult?.explanation || 'No backend action has been run yet.' }}
            </p>

            <div v-if="store.lastActionResult" class="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div class="rounded-xl bg-surface-darkMuted p-3">
                <div class="text-semantic-neutral-400">Action</div>
                <div class="mt-1 font-semibold text-white">{{ store.lastActionResult.action }}</div>
              </div>
              <div class="rounded-xl bg-surface-darkMuted p-3">
                <div class="text-semantic-neutral-400">Phase After Action</div>
                <div class="mt-1 font-semibold text-white">{{ generationPhaseLabel }}</div>
              </div>
              <div class="rounded-xl bg-surface-darkMuted p-3">
                <div class="text-semantic-neutral-400">Changed Cells</div>
                <div class="mt-1 font-semibold text-white">
                  {{ store.lastActionResult.changedCells.length }}
                </div>
              </div>
              <div class="rounded-xl bg-surface-darkMuted p-3">
                <div class="text-semantic-neutral-400">Snapshot Marker</div>
                <div class="mt-1 font-semibold text-white">
                  {{
                    boardSnapshotReasonCount > 0
                      ? `${boardSnapshotReasonCount} cells marked as full snapshot`
                      : 'No full-board snapshot marker'
                  }}
                </div>
              </div>
            </div>

            <div
              v-if="store.lastActionResult && changeReasonGroups.length"
              class="mt-3 rounded-xl bg-surface-darkMuted p-3 text-sm"
            >
              <div class="mb-2 font-semibold text-semantic-info-200">What Changed</div>
              <div class="space-y-2">
                <div
                  v-for="group in changeReasonGroups"
                  :key="group.reason"
                  class="rounded-lg border border-semantic-info-700 bg-feedback-infoFaint px-3 py-2"
                >
                  <div class="font-semibold text-semantic-info-100">
                    {{ group.count }} cell{{ group.count === 1 ? '' : 's' }}
                  </div>
                  <div class="mt-1 text-semantic-neutral-200">{{ group.label }}</div>
                  <div
                    v-if="group.reason === 'generated board snapshot'"
                    class="mt-1 text-xs text-semantic-neutral-400"
                  >
                    This does not mean a screenshot. It means the backend replaced the whole board
                    in one response and reported every cell as changed.
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="store.lastActionResult?.changedCells.length"
              class="mt-3 rounded-xl bg-surface-darkMuted p-3 text-sm"
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="font-semibold text-semantic-info-200">Changed Cell Preview</div>
                <div class="text-xs uppercase tracking-[0.18em] text-semantic-neutral-400">
                  {{ changedCellPreview.length }} shown
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="cell in changedCellPreview"
                  :key="`${cell.row}-${cell.col}-${cell.reason || 'change'}`"
                  class="rounded-full border border-semantic-info-700 bg-feedback-infoFaint px-2 py-1 text-xs text-semantic-info-100"
                >
                  ({{ cell.row }}, {{ cell.col }}){{
                    cell.reason === 'generated board snapshot'
                      ? ' full-board replacement'
                      : cell.reason
                        ? ` ${cell.reason}`
                        : ''
                  }}
                </span>
              </div>
              <div
                v-if="store.lastActionResult.changedCells.length > changedCellPreview.length"
                class="mt-3 text-xs text-semantic-neutral-400"
              >
                {{ store.lastActionResult.changedCells.length - changedCellPreview.length }}
                additional changed cells are omitted from this preview.
              </div>
            </div>

            <div
              v-if="store.lastActionResult?.warnings.length"
              class="mt-3 rounded-xl border border-edge-warningMuted bg-feedback-warningSubtle p-3 text-sm text-semantic-warning-200"
            >
              {{ store.lastActionResult.warnings.join(' ') }}
            </div>

            <div class="mt-4 rounded-xl bg-surface-darkMuted p-3">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="font-semibold text-semantic-info-200">Copyable Debug Log</div>
                <button
                  type="button"
                  class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                  @click="copyDebugText('result', backendResultDebugText)"
                >
                  {{ copyButtonLabels.result }}
                </button>
              </div>
              <pre
                class="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-semantic-neutral-950 p-3 text-xs leading-5 text-semantic-neutral-200"
                >{{ backendResultDebugText }}</pre
              >
            </div>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">Validation</h2>
              <button
                type="button"
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                @click="copyDebugText('validation', validationDebugText)"
              >
                {{ copyButtonLabels.validation }}
              </button>
            </div>
            <div v-if="store.validation" class="mt-3 space-y-3 text-sm">
              <div
                class="rounded-xl px-3 py-2 font-semibold"
                :class="
                  store.validation.isValid
                    ? 'border border-incremental-successBorderFaint bg-feedback-successSubtle text-semantic-success-200'
                    : 'border border-edge-dangerSoft bg-feedback-dangerSubtle text-semantic-danger-200'
                "
              >
                {{
                  store.validation.isValid
                    ? 'Board passes current validation checks'
                    : 'Board has validation errors'
                }}
              </div>
              <div v-if="store.validation.errors.length" class="space-y-1">
                <div class="font-semibold text-semantic-danger-200">Errors</div>
                <div
                  v-for="error in store.validation.errors"
                  :key="error"
                  class="rounded-lg bg-surface-darkSoft px-3 py-2 text-semantic-neutral-200"
                >
                  {{ error }}
                </div>
              </div>
              <div v-if="store.validation.warnings.length" class="space-y-1">
                <div class="font-semibold text-semantic-warning-200">Warnings</div>
                <div
                  v-for="warning in store.validation.warnings"
                  :key="warning"
                  class="rounded-lg bg-surface-darkSoft px-3 py-2 text-semantic-neutral-200"
                >
                  {{ warning }}
                </div>
              </div>
            </div>
            <p v-else class="mt-3 text-sm text-semantic-neutral-400">
              Validation results will appear here after a backend action.
            </p>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">Selected Cell</h2>
              <button
                type="button"
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                @click="copyDebugText('selectedCell', selectedCellDebugText)"
              >
                {{ copyButtonLabels.selectedCell }}
              </button>
            </div>
            <div v-if="store.selectedCell" class="mt-3 space-y-2 text-sm text-semantic-neutral-200">
              <div>Position: {{ store.selectedCell.row }}, {{ store.selectedCell.col }}</div>
              <div>Color: {{ store.selectedCell.groupColor || 'none' }}</div>
              <div>Mark: {{ store.selectedCell.markType }}</div>
              <div>Solution Queen: {{ store.selectedCell.isSolutionQueen ? 'yes' : 'no' }}</div>
            </div>
            <p v-else class="mt-3 text-sm text-semantic-neutral-400">
              Click a cell to inspect it or apply the selected manual tool.
            </p>
          </section>

          <section
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Action History</h2>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                  @click="copyDebugText('history', actionHistoryDebugText)"
                >
                  {{ copyButtonLabels.history }}
                </button>
                <button
                  class="text-xs uppercase tracking-[0.2em] text-semantic-neutral-400 hover:text-white"
                  @click="store.resetHistory()"
                >
                  Clear
                </button>
              </div>
            </div>
            <div class="mt-3 max-h-[220px] space-y-2 overflow-auto pr-1 text-sm">
              <article
                v-for="entry in store.actionHistory"
                :key="entry.id"
                class="rounded-xl border border-semantic-neutral-800 bg-surface-darkMuted p-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="font-semibold capitalize text-white">{{ entry.action }}</span>
                  <span
                    class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                    :class="
                      entry.success
                        ? 'bg-feedback-successSoft text-semantic-success-200'
                        : 'bg-feedback-dangerSoft text-semantic-danger-200'
                    "
                  >
                    {{ entry.success ? 'ok' : 'fail' }}
                  </span>
                </div>
                <p class="mt-2 text-semantic-neutral-300">{{ entry.explanation }}</p>
              </article>
              <p v-if="store.actionHistory.length === 0" class="text-semantic-neutral-400">
                No actions recorded yet.
              </p>
            </div>
          </section>

          <details
            class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4"
          >
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
              <span class="text-lg font-semibold">Raw Board JSON</span>
              <button
                type="button"
                class="rounded-xl border border-semantic-neutral-700 bg-semantic-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-semantic-neutral-700"
                @click.prevent.stop="copyBoardJson"
              >
                {{ copyButtonLabels.json }}
              </button>
            </summary>
            <div class="mt-3 flex items-center justify-between gap-3">
              <p class="text-sm text-semantic-neutral-300">
                Copy the current board snapshot for debugging or sharing.
              </p>
            </div>
            <pre
              class="mt-3 overflow-auto rounded-xl bg-surface-darkStrong p-3 text-xs leading-6 text-semantic-neutral-200"
              >{{ prettyBoardJson }}</pre
            >
          </details>
        </aside>
      </div>

      <QueensAdminBatchPanel v-else-if="activeTab === 'batch'" />
      <QueensAdminCatalogPanel v-else-if="activeTab === 'catalog'" />
      <QueensAdminMaxQueensPanel v-else-if="activeTab === 'max-queens'" />
      <QueensAdminSolverPanel v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import { useRoute, useRouter } from 'vue-router';
import type { ColorName } from '../types/types';
import { COLOR_PALETTE } from '../utils/colorPalette';
import {
  buildEncodedQueensPuzzleLayout,
  QUEENS_PUZZLE_SHARE_BASE_URL,
} from '../utils/urlPuzzleEncoding';
import {
  analyzeQueensDifficulty,
  type QueensDifficultyAnalysis,
  type QueensDifficultyPhase,
} from '../admin/difficultyProbe';
import {
  loadQueensAdminWorkshopInputs,
  saveQueensAdminWorkshopInputs,
} from '../admin/inputPersistence';
import { hasEffectiveMaxQueenCount, supportedPrecomputedDistances } from '../admin/maxQueenCounts';
import AdminStat from '../components/admin/AdminStat.vue';
import QueensAdminBatchPanel from '../components/admin/QueensAdminBatchPanel.vue';
import QueensAdminCatalogPanel from '../components/admin/QueensAdminCatalogPanel.vue';
import QueensAdminMaxQueensPanel from '../components/admin/QueensAdminMaxQueensPanel.vue';
import QueensAdminSolverPanel from '../components/admin/QueensAdminSolverPanel.vue';
import { useQueensAdminStore } from '../stores/queensAdminStore';
import { useQueensStore } from '../stores/queensStore';
import type { QueensAdminGenerationStrategy, QueensAdminTool } from '../admin/types';

const QueensPuzzleBoard = defineAsyncComponent(
  () => import('../components/queens/QueensPuzzleBoard.vue')
);

type TemplateSeedCell = {
  row: number;
  col: number;
  filled: boolean;
};

type CopyButtonKey =
  | 'result'
  | 'validation'
  | 'selectedCell'
  | 'history'
  | 'json'
  | 'url'
  | 'difficulty';

const route = useRoute();
const router = useRouter();
const store = useQueensAdminStore();
const queensStore = useQueensStore();
const persistedWorkshopInputs = loadQueensAdminWorkshopInputs();
const boardSizes = Array.from({ length: 17 }, (_, index) => index + 4);
const palette = COLOR_PALETTE;
const selectedBoardSize = ref(persistedWorkshopInputs?.selectedBoardSize ?? store.boardSize);
const showSolutionQueens = ref(persistedWorkshopInputs?.showSolutionQueens ?? true);
const generationPreviewIntervalMs = ref(
  persistedWorkshopInputs?.generationPreviewIntervalMs ?? 1000
);
const TEMPLATE_EDITOR_SIZE = 7;
const DEFAULT_TEMPLATE_SEED_CELLS: TemplateSeedCell[] = [
  { row: 3, col: 3, filled: true },
  { row: 3, col: 4, filled: true },
  { row: 4, col: 3, filled: true },
];
const templateSeedCells = ref<TemplateSeedCell[]>(
  persistedWorkshopInputs?.templateSeedCells ??
    Array.from({ length: TEMPLATE_EDITOR_SIZE * TEMPLATE_EDITOR_SIZE }, (_, index) => ({
      row: Math.floor(index / TEMPLATE_EDITOR_SIZE),
      col: index % TEMPLATE_EDITOR_SIZE,
      filled: DEFAULT_TEMPLATE_SEED_CELLS.some(
        (cell) =>
          cell.row === Math.floor(index / TEMPLATE_EDITOR_SIZE) &&
          cell.col === index % TEMPLATE_EDITOR_SIZE
      ),
    }))
);

store.minimumGroupSize = persistedWorkshopInputs?.minimumGroupSize ?? store.minimumGroupSize;
store.queenCountMode = persistedWorkshopInputs?.queenCountMode ?? store.queenCountMode;
store.targetQueenCount = persistedWorkshopInputs?.targetQueenCount ?? store.targetQueenCount;
store.orthogonalMinDistance =
  persistedWorkshopInputs?.orthogonalMinDistance ?? store.orthogonalMinDistance;
store.generationStrategy = persistedWorkshopInputs?.generationStrategy ?? store.generationStrategy;
store.selectedTool = persistedWorkshopInputs?.selectedTool ?? store.selectedTool;
store.selectedColor = persistedWorkshopInputs?.selectedColor ?? store.selectedColor;

const activeTab = computed<'workshop' | 'batch' | 'catalog' | 'max-queens' | 'solver'>(() =>
  route.name === 'queens-admin-batch'
    ? 'batch'
    : route.name === 'queens-admin-catalog'
      ? 'catalog'
      : route.name === 'queens-admin-max-queens'
        ? 'max-queens'
        : route.name === 'queens-admin-solver'
          ? 'solver'
          : 'workshop'
);

function setActiveTab(tab: 'workshop' | 'batch' | 'catalog' | 'max-queens' | 'solver'): void {
  const targetRouteName =
    tab === 'batch'
      ? 'queens-admin-batch'
      : tab === 'catalog'
        ? 'queens-admin-catalog'
        : tab === 'max-queens'
          ? 'queens-admin-max-queens'
          : tab === 'solver'
            ? 'queens-admin-solver'
            : 'queens-admin-workshop';
  if (route.name === targetRouteName) return;
  void router.push({ name: targetRouteName });
}

function handleActiveTabChange(value: string | number | undefined): void {
  if (
    value === 'workshop' ||
    value === 'batch' ||
    value === 'catalog' ||
    value === 'max-queens' ||
    value === 'solver'
  ) {
    setActiveTab(value);
  }
}

function resetTemplateSeedEditor(): void {
  templateSeedCells.value = Array.from(
    { length: TEMPLATE_EDITOR_SIZE * TEMPLATE_EDITOR_SIZE },
    (_, index) => ({
      row: Math.floor(index / TEMPLATE_EDITOR_SIZE),
      col: index % TEMPLATE_EDITOR_SIZE,
      filled: DEFAULT_TEMPLATE_SEED_CELLS.some(
        (cell) =>
          cell.row === Math.floor(index / TEMPLATE_EDITOR_SIZE) &&
          cell.col === index % TEMPLATE_EDITOR_SIZE
      ),
    })
  );
}

function clearTemplateSeedEditor(): void {
  templateSeedCells.value = templateSeedCells.value.map((cell) => ({ ...cell, filled: false }));
}

function handleTemplateSeedCellClick(row: number, col: number): void {
  templateSeedCells.value = templateSeedCells.value.map((cell) =>
    cell.row === row && cell.col === col ? { ...cell, filled: !cell.filled } : cell
  );
}

function templateSeedCellClasses(cell: { filled: boolean }): string {
  if (cell.filled) {
    return 'border-semantic-info-500 bg-feedback-infoSoft text-white hover:bg-feedback-infoSoft';
  }
  return 'border-semantic-neutral-800 bg-surface-darkSoft text-transparent hover:border-semantic-neutral-700 hover:bg-semantic-neutral-900';
}

async function generateBoardFromWorkshop(): Promise<void> {
  await store.generateBoard(selectedBoardSize.value, {
    queenCountMode: store.queenCountMode,
    targetQueenCount: store.targetQueenCount,
    orthogonalMinDistance: store.orthogonalMinDistance,
    seedTemplateOffsets:
      store.generationStrategy === 'template-seeded' ? templateSeedOffsets.value : undefined,
    previewIntervalMs: generationPreviewIntervalMs.value,
  });
}

const tools: Array<{
  id: QueensAdminTool;
  label: string;
  description: string;
}> = [
  {
    id: 'paint-color',
    label: 'Paint Color',
    description: 'Assign the selected color to a cell.',
  },
  {
    id: 'erase-color',
    label: 'Erase Color',
    description: 'Remove a cell from any color group.',
  },
  {
    id: 'place-flag',
    label: 'Place Flag',
    description: 'Mark a cell as flagged through the backend.',
  },
  {
    id: 'remove-flag',
    label: 'Remove Flag',
    description: 'Clear a flag from a cell.',
  },
  {
    id: 'place-queen',
    label: 'Place Queen',
    description: 'Place a debugging queen on a cell.',
  },
  {
    id: 'remove-queen',
    label: 'Remove Queen',
    description: 'Clear a debugging queen from a cell.',
  },
  {
    id: 'inspect-cell',
    label: 'Inspect Cell',
    description: 'Read cell state without mutating the board.',
  },
];

const toolLabels = tools.reduce<Record<string, string>>((accumulator, tool) => {
  accumulator[tool.id] = tool.label;
  return accumulator;
}, {});

const generationPhaseLabel = computed(() => {
  if (!store.board?.generationPhase) return 'Not Started';

  const labels: Record<string, string> = {
    EMPTY: 'Empty',
    QUEENS_PLACED: 'Queens Placed',
    INITIAL_COLORS_ASSIGNED: 'Initial Colors',
    GROUPS_EXPANDED: 'Groups Expanded',
    BLOCKED_SQUARES_EXPANDED: 'Blocked Squares Filled',
    SOLVED: 'Solved',
    ANALYZED: 'Analyzed',
  };

  return labels[store.board.generationPhase] || store.board.generationPhase;
});

const workshopMinimumFlagDistanceLabel = computed(() =>
  queensStore.minimumFlagOrthogonalDistance == null
    ? 'N/A'
    : String(queensStore.minimumFlagOrthogonalDistance)
);

watch(
  () => [store.board, showSolutionQueens.value, queensStore.regionColorMode],
  () => {
    if (!store.board || activeTab.value !== 'workshop') return;
    queensStore.hydrateFromAdminBoard(store.board, {
      showSolutionQueens: showSolutionQueens.value,
      resetHistory: false,
    });
  },
  { immediate: true, deep: true }
);

const generationProgressPercent = computed(() => {
  if (!store.generationProgress || store.generationProgress.totalCellCount === 0) return 0;
  return Math.round(
    (store.generationProgress.coloredCellCount / store.generationProgress.totalCellCount) * 100
  );
});

const generationProgressBadgeClass = computed(() => {
  switch (store.generationProgress?.state) {
    case 'COMPLETED':
      return 'bg-feedback-successSoft text-semantic-success-200';
    case 'FAILED':
      return 'bg-feedback-dangerSoft text-semantic-danger-200';
    case 'CANCELLED':
      return 'bg-feedback-warningSubtle text-semantic-warning-200';
    default:
      return 'bg-feedback-infoSoft text-semantic-info-200';
  }
});

const templateSeedEditorCells = computed(() =>
  templateSeedCells.value.map((cell) => ({
    ...cell,
    key: `${cell.row}-${cell.col}`,
  }))
);

const templateSeedFilledCells = computed(() =>
  templateSeedCells.value.filter((cell) => cell.filled)
);

const templateSeedConnected = computed(() => {
  const filled = templateSeedFilledCells.value;
  if (filled.length <= 1) return filled.length === 1;

  const filledKeys = new Set(filled.map((cell) => `${cell.row}:${cell.col}`));
  const visited = new Set<string>();
  const queue = [filled[0]];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    const key = `${current.row}:${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const neighbors = [
      [current.row - 1, current.col],
      [current.row + 1, current.col],
      [current.row, current.col - 1],
      [current.row, current.col + 1],
    ];

    for (const [row, col] of neighbors) {
      const neighborKey = `${row}:${col}`;
      if (!visited.has(neighborKey) && filledKeys.has(neighborKey)) {
        const match = filled.find((cell) => cell.row === row && cell.col === col);
        if (match) queue.push(match);
      }
    }
  }

  return visited.size === filled.length;
});

const templateSeedOffsets = computed(() => {
  if (templateSeedFilledCells.value.length === 0) return [];
  const minRow = Math.min(...templateSeedFilledCells.value.map((cell) => cell.row));
  const minCol = Math.min(...templateSeedFilledCells.value.map((cell) => cell.col));
  return templateSeedFilledCells.value
    .map((cell) => ({
      row: cell.row - minRow,
      col: cell.col - minCol,
    }))
    .sort((left, right) => left.row - right.row || left.col - right.col);
});

const maxQueenConfigSupported = computed(() =>
  hasEffectiveMaxQueenCount(selectedBoardSize.value, store.orthogonalMinDistance)
);

const supportedMaxDistancesLabel = computed(() => {
  const supportedDistances = supportedPrecomputedDistances(selectedBoardSize.value);
  return supportedDistances.length > 0 ? supportedDistances.join(', ') : 'none yet';
});

const maxGenerationConfigValid = computed(
  () => store.queenCountMode !== 'max' || maxQueenConfigSupported.value
);

const templateSeedIsValid = computed(() => {
  return (
    store.generationStrategy !== 'template-seeded' ||
    (templateSeedFilledCells.value.length >= 2 && templateSeedConnected.value)
  );
});

const templateSeedValidationMessage = computed(() => {
  if (templateSeedFilledCells.value.length < 2)
    return 'Add at least 2 filled cells to make a meaningful seed shape.';
  if (!templateSeedConnected.value) return 'The shape must be edge-connected.';
  return 'Template is valid.';
});

const templateSeedStats = computed(() => ({
  filledCellCount: templateSeedFilledCells.value.length,
  connected: templateSeedConnected.value,
  variantCount: countTemplateVariants(templateSeedOffsets.value),
}));

const templateSeedOffsetsDebug = computed(() =>
  templateSeedOffsets.value.map((offset) => `(${offset.row}, ${offset.col})`).join(', ')
);

const copyButtonLabels = ref<Record<CopyButtonKey, string>>({
  result: 'Copy',
  validation: 'Copy',
  selectedCell: 'Copy',
  history: 'Copy',
  json: 'Copy JSON',
  url: 'Copy URL',
  difficulty: 'Copy',
});
const copyTimers: Partial<Record<CopyButtonKey, ReturnType<typeof setTimeout>>> = {};
const difficultyProbe = ref<QueensDifficultyAnalysis | null>(null);

function hasPhase(phase: string): boolean {
  return store.board?.generationPhase === phase;
}

function isAtLeastExpanded(): boolean {
  return (
    store.board?.generationPhase === 'GROUPS_EXPANDED' ||
    store.board?.generationPhase === 'BLOCKED_SQUARES_EXPANDED' ||
    store.board?.generationPhase === 'SOLVED' ||
    store.board?.generationPhase === 'ANALYZED'
  );
}

const generationSteps = computed(() => {
  const loading = store.loading;
  const board = store.board;
  const hasAnyBoard = Boolean(board);
  const coloredCellCount = store.boardSummary.coloredCellCount;
  const totalCells = board ? board.size * board.size : 0;

  return [
    {
      id: 'place-queens',
      stage: 'Step 1',
      title: 'Place Hidden Queens',
      description:
        'Lay down the hidden solution pattern first. This seeds one queen per row in the current backend generation flow.',
      actionLabel: 'Run Step 1',
      run: () => store.placeQueens(),
      disabled: !hasAnyBoard || loading,
      statusLabel:
        hasPhase('QUEENS_PLACED') || hasPhase('INITIAL_COLORS_ASSIGNED') || isAtLeastExpanded()
          ? 'done'
          : hasAnyBoard
            ? 'ready'
            : 'needs board',
      statusClass:
        hasPhase('QUEENS_PLACED') || hasPhase('INITIAL_COLORS_ASSIGNED') || isAtLeastExpanded()
          ? 'border-incremental-successBorderFaint bg-feedback-successSubtle'
          : 'border-semantic-neutral-800 bg-surface-darkSoft',
      badgeClass:
        hasPhase('QUEENS_PLACED') || hasPhase('INITIAL_COLORS_ASSIGNED') || isAtLeastExpanded()
          ? 'bg-feedback-successSoft text-semantic-success-200'
          : 'bg-semantic-neutral-800 text-semantic-neutral-300',
      buttonClass: 'bg-semantic-info-600 text-white hover:bg-semantic-info-500',
    },
    {
      id: 'assign-initial-colors',
      stage: 'Step 2',
      title: 'Assign Initial Queen Colors',
      description:
        'Give each queen a unique seed color so every region has a starting tile before expansion begins.',
      actionLabel: 'Run Step 2',
      run: () => store.assignInitialColors(),
      disabled: !hasAnyBoard || loading,
      statusLabel:
        hasPhase('INITIAL_COLORS_ASSIGNED') || isAtLeastExpanded()
          ? 'done'
          : hasPhase('QUEENS_PLACED')
            ? 'ready'
            : hasAnyBoard
              ? 'waiting'
              : 'needs board',
      statusClass:
        hasPhase('INITIAL_COLORS_ASSIGNED') || isAtLeastExpanded()
          ? 'border-incremental-successBorderFaint bg-feedback-successSubtle'
          : 'border-semantic-neutral-800 bg-surface-darkSoft',
      badgeClass:
        hasPhase('INITIAL_COLORS_ASSIGNED') || isAtLeastExpanded()
          ? 'bg-feedback-successSoft text-semantic-success-200'
          : 'bg-semantic-neutral-800 text-semantic-neutral-300',
      buttonClass: 'bg-semantic-info-600 text-white hover:bg-semantic-info-500',
    },
    {
      id: 'expand-once',
      stage: 'Step 3',
      title: 'Expand All Groups Once',
      description:
        'Grow every color region outward by one cell. This is the first uniform expansion pass after seeding the queen colors.',
      actionLabel: 'Run Step 3',
      run: () => store.expandAllGroupsOnce(),
      secondaryActionLabel: 'Expand Selected Group',
      secondaryRun: () => store.expandSelectedGroup(),
      disabled: !hasAnyBoard || loading,
      statusLabel: isAtLeastExpanded()
        ? 'done'
        : hasPhase('INITIAL_COLORS_ASSIGNED')
          ? 'ready'
          : hasAnyBoard
            ? 'waiting'
            : 'needs board',
      statusClass: isAtLeastExpanded()
        ? 'border-incremental-successBorderFaint bg-feedback-successSubtle'
        : 'border-semantic-neutral-800 bg-surface-darkSoft',
      badgeClass: isAtLeastExpanded()
        ? 'bg-feedback-successSoft text-semantic-success-200'
        : 'bg-semantic-neutral-800 text-semantic-neutral-300',
      buttonClass: 'bg-semantic-info-600 text-white hover:bg-semantic-info-500',
    },
    {
      id: 'expand-again',
      stage: 'Step 4',
      title: 'Expand All Groups Again',
      description:
        'Run the same group expansion pass a second time to reach the next staged region size before final filling.',
      actionLabel: 'Run Step 4',
      run: () => store.expandAllGroupsOnce(),
      disabled: !hasAnyBoard || loading,
      statusLabel:
        coloredCellCount >= store.boardSummary.size * 3 && hasAnyBoard
          ? 'ready'
          : hasPhase('GROUPS_EXPANDED')
            ? 'active'
            : hasAnyBoard
              ? 'waiting'
              : 'needs board',
      statusClass: hasPhase('GROUPS_EXPANDED')
        ? 'border-semantic-info-700 bg-feedback-infoFaint'
        : 'border-semantic-neutral-800 bg-surface-darkSoft',
      badgeClass: hasPhase('GROUPS_EXPANDED')
        ? 'bg-feedback-infoSoft text-semantic-info-200'
        : 'bg-semantic-neutral-800 text-semantic-neutral-300',
      buttonClass: 'bg-semantic-info-600 text-white hover:bg-semantic-info-500',
    },
    {
      id: 'expand-blocked',
      stage: 'Step 5',
      title: 'Fill Blocked Squares',
      description:
        'Use the blocked-square expansion phase to fill remaining constrained holes and push the board toward a complete puzzle.',
      actionLabel: 'Run Step 5',
      run: () => store.expandBlockedSquares(),
      disabled: !hasAnyBoard || loading,
      statusLabel:
        totalCells > 0 && coloredCellCount === totalCells
          ? 'full'
          : hasAnyBoard
            ? 'ready'
            : 'needs board',
      statusClass:
        totalCells > 0 && coloredCellCount === totalCells
          ? 'border-incremental-successBorderFaint bg-feedback-successSubtle'
          : 'border-semantic-neutral-800 bg-surface-darkSoft',
      badgeClass:
        totalCells > 0 && coloredCellCount === totalCells
          ? 'bg-feedback-successSoft text-semantic-success-200'
          : 'bg-semantic-neutral-800 text-semantic-neutral-300',
      buttonClass: 'bg-semantic-success-600 text-white hover:bg-semantic-success-500',
    },
  ];
});

const prettyBoardJson = computed(() => JSON.stringify(store.board, null, 2));

const playInQueensRoute = computed(() => {
  if (!store.board) return null;

  const encodedLayout = buildEncodedQueensPuzzleLayout(
    store.board.cells.flat().map((cell) => ({
      groupColor: cell.groupColor,
      isSolutionQueen: cell.isSolutionQueen,
    }))
  );

  return {
    name: 'queens-encoded-puzzle',
    params: {
      encodedLayout,
    },
  };
});

const playInQueensHref = computed(() => {
  if (!playInQueensRoute.value) return null;
  return router.resolve(playInQueensRoute.value).href;
});

const shareableQueensPuzzleUrl = computed(() => {
  if (!playInQueensHref.value) return null;
  return `${QUEENS_PUZZLE_SHARE_BASE_URL}${playInQueensHref.value}`;
});

function formatChangeReason(reason: string): string {
  if (reason === 'generated board snapshot') {
    return 'Full board replacement';
  }

  return reason.charAt(0).toUpperCase() + reason.slice(1);
}

function formatProgressStage(stage: string): string {
  return stage
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function generationStrategyLabel(strategy: QueensAdminGenerationStrategy): string {
  if (strategy === 'marker-guided') return 'Marker-guided experiment';
  if (strategy === 'template-seeded') return 'Template-seeded experiment';
  return 'Baseline';
}

function formatDifficultyPhase(phase: QueensDifficultyPhase): string {
  return phase
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function difficultyPhaseBadgeClass(phase: QueensDifficultyPhase): string {
  switch (phase) {
    case 'extra-easy':
      return 'bg-feedback-infoSubtle text-semantic-info-200';
    case 'easy':
      return 'bg-feedback-successSoft text-semantic-success-200';
    case 'medium':
      return 'bg-feedback-warningSubtle text-semantic-warning-200';
    case 'hard':
      return 'bg-feedback-dangerSoft text-semantic-danger-200';
  }
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function countTemplateVariants(offsets: Array<{ row: number; col: number }>): number {
  if (offsets.length === 0) return 0;
  const variants = new Set<string>();
  let current = offsets;

  for (let index = 0; index < 4; index += 1) {
    const minRow = Math.min(...current.map((offset) => offset.row));
    const minCol = Math.min(...current.map((offset) => offset.col));
    const normalized = current
      .map((offset) => ({
        row: offset.row - minRow,
        col: offset.col - minCol,
      }))
      .sort((left, right) => left.row - right.row || left.col - right.col);
    variants.add(normalized.map((offset) => `${offset.row},${offset.col}`).join('|'));
    current = current.map((offset) => ({ row: offset.col, col: -offset.row }));
  }

  return variants.size;
}

const changeReasonGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const cell of store.lastActionResult?.changedCells ?? []) {
    const reason = cell.reason || 'changed cell';
    groups.set(reason, (groups.get(reason) || 0) + 1);
  }

  return Array.from(groups.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      label: formatChangeReason(reason),
    }))
    .sort((left, right) => right.count - left.count);
});

const boardSnapshotReasonCount = computed(
  () =>
    changeReasonGroups.value.find((group) => group.reason === 'generated board snapshot')?.count ||
    0
);

const changedCellPreview = computed(() =>
  (store.lastActionResult?.changedCells ?? []).slice(0, 18)
);

const backendResultDebugText = computed(() => {
  const lines = [
    'Workshop Request',
    `- boardSize: ${selectedBoardSize.value}`,
    `- queenCountMode: ${store.queenCountMode}`,
    `- targetQueenCount: ${store.targetQueenCount}`,
    `- orthogonalMinDistance: ${store.orthogonalMinDistance}`,
    `- minimumGroupSize: ${store.minimumGroupSize}`,
    `- generationStrategy: ${store.generationStrategy}`,
    `- previewIntervalMs: ${generationPreviewIntervalMs.value}`,
  ];

  if (store.board?.metadata) {
    lines.push('');
    lines.push('Board Metadata');
    lines.push(`- targetQueenCount: ${store.board.metadata.targetQueenCount ?? 'missing'}`);
    lines.push(
      `- orthogonalMinDistance: ${store.board.metadata.orthogonalMinDistance ?? 'missing'}`
    );
    lines.push(`- generationPhase: ${store.board.generationPhase ?? 'none'}`);
  }

  if (store.generationProgress) {
    lines.push('');
    lines.push('Generation Progress');
    lines.push(`- state: ${store.generationProgress.state}`);
    lines.push(`- attempt: ${store.generationProgress.attempt}`);
    lines.push(`- stage: ${store.generationProgress.stage}`);
    lines.push(`- message: ${store.generationProgress.message}`);
    lines.push(
      `- colored: ${store.generationProgress.coloredCellCount}/${store.generationProgress.totalCellCount}`
    );
    lines.push(`- solverChecks: ${store.generationProgress.metrics.solverChecks}`);
    lines.push(`- rollbacks: ${store.generationProgress.metrics.rollbacks}`);
    lines.push(`- successfulPlacements: ${store.generationProgress.metrics.successfulPlacements}`);
    lines.push(
      `- constrainedWindowHits: ${store.generationProgress.metrics.constrainedWindowHits}`
    );
    lines.push(
      `- constrainedWindowFlags: ${store.generationProgress.metrics.constrainedWindowFlags}`
    );
    lines.push(
      `- deterministicSolved: ${store.generationProgress.metrics.deterministicSolved === null ? 'unknown' : String(store.generationProgress.metrics.deterministicSolved)}`
    );
    lines.push(
      `- deterministicStepsTaken: ${store.generationProgress.metrics.deterministicStepsTaken}`
    );
    lines.push(
      `- deterministicQueensPlaced: ${store.generationProgress.metrics.deterministicQueensPlaced}`
    );
    lines.push(
      `- deterministicUnresolvedSquares: ${store.generationProgress.metrics.deterministicUnresolvedSquares}`
    );
    lines.push(
      `- deterministicHardestTier: ${store.generationProgress.metrics.deterministicHardestTier ?? 'none'}`
    );
    lines.push(
      `- deterministicLastRule: ${store.generationProgress.metrics.deterministicLastRule ?? 'none'}`
    );
    if (store.generationProgress.history.length) {
      lines.push('');
      lines.push('Recent Generation Events');
      for (const entry of store.generationProgress.history.slice(-12)) {
        lines.push(
          `- [attempt ${entry.attempt}] ${entry.stage} :: ${entry.message} (${entry.coloredCellCount}/${entry.totalCellCount} colored${entry.generationPhase ? `, phase ${entry.generationPhase}` : ''})`
        );
      }
    }
  }

  if (store.lastActionResult) {
    lines.push('');
    lines.push('Last Backend Result');
    lines.push(`- action: ${store.lastActionResult.action}`);
    lines.push(`- success: ${store.lastActionResult.success ? 'yes' : 'no'}`);
    lines.push(`- explanation: ${store.lastActionResult.explanation}`);
    lines.push(`- phase: ${generationPhaseLabel.value}`);
    lines.push(`- changedCells: ${store.lastActionResult.changedCells.length}`);
  } else {
    lines.push('');
    lines.push('Last Backend Result');
    lines.push('- none');
  }

  if (changeReasonGroups.value.length > 0 && store.lastActionResult) {
    lines.push('Change reasons:');
    for (const group of changeReasonGroups.value) {
      lines.push(`- ${group.count} cell(s): ${formatChangeReason(group.reason)}`);
    }
  }

  if (store.lastActionResult?.warnings.length) {
    lines.push(`Warnings: ${store.lastActionResult.warnings.join(' | ')}`);
  }

  if (store.lastActionResult?.error) {
    lines.push(`Error: ${store.lastActionResult.error}`);
  }

  if (store.validation) {
    lines.push('');
    lines.push('Validation');
    lines.push(`- isValid: ${store.validation.isValid ? 'yes' : 'no'}`);
    lines.push(`- queenCount: ${store.validation.queenCount}`);
    lines.push(`- flaggedCount: ${store.validation.flaggedCount}`);
    lines.push(`- coloredCellCount: ${store.validation.coloredCellCount}`);
    lines.push(`- distinctColorCount: ${store.validation.distinctColorCount}`);
    if (store.validation.errors.length) {
      lines.push(`- errors: ${store.validation.errors.join(' | ')}`);
    }
    if (store.validation.warnings.length) {
      lines.push(`- warnings: ${store.validation.warnings.join(' | ')}`);
    }
  }

  return lines.join('\n');
});

const validationDebugText = computed(() => {
  if (!store.validation) return 'No validation result available.';

  const lines = [
    `Valid: ${store.validation.isValid ? 'yes' : 'no'}`,
    `Queens: ${store.validation.queenCount}`,
    `Flags: ${store.validation.flaggedCount}`,
    `Colored cells: ${store.validation.coloredCellCount}`,
    `Color groups: ${store.validation.distinctColorCount}`,
  ];

  if (store.validation.errors.length > 0) {
    lines.push(`Errors: ${store.validation.errors.join(' | ')}`);
  }

  if (store.validation.warnings.length > 0) {
    lines.push(`Warnings: ${store.validation.warnings.join(' | ')}`);
  }

  return lines.join('\n');
});

const selectedCellDebugText = computed(() => {
  if (!store.selectedCell) return 'No cell selected.';

  return [
    `Position: ${store.selectedCell.row}, ${store.selectedCell.col}`,
    `Color: ${store.selectedCell.groupColor || 'none'}`,
    `Mark: ${store.selectedCell.markType}`,
    `Solution queen: ${store.selectedCell.isSolutionQueen ? 'yes' : 'no'}`,
  ].join('\n');
});

const actionHistoryDebugText = computed(() => {
  if (store.actionHistory.length === 0) return 'No action history recorded.';

  return store.actionHistory
    .map(
      (entry) =>
        `[${entry.success ? 'ok' : 'fail'}] ${entry.action}\n${entry.explanation}${
          entry.warnings.length > 0 ? `\nWarnings: ${entry.warnings.join(' | ')}` : ''
        }${entry.error ? `\nError: ${entry.error}` : ''}`
    )
    .join('\n\n');
});

const difficultyProbeDebugText = computed(() => {
  if (!difficultyProbe.value) return 'No difficulty probe has been run yet.';

  return [
    `Tier: ${difficultyProbe.value.tier}`,
    `Solved: ${difficultyProbe.value.solved ? 'yes' : 'no'}`,
    `Hardest step: ${formatDifficultyPhase(difficultyProbe.value.hardestStepReached)}`,
    `Flags placed: ${difficultyProbe.value.totalFlagsPlaced}`,
    `Queens placed: ${difficultyProbe.value.totalQueensPlaced}`,
    `Loops: ${difficultyProbe.value.loops}`,
    `Queen guesses tried: ${difficultyProbe.value.guessesTried}`,
    `Unresolved squares: ${difficultyProbe.value.unresolvedSquares}`,
    '',
    ...difficultyProbe.value.trace.map(
      (entry) =>
        `[${formatDifficultyPhase(entry.phase)}] ${entry.label}\n${entry.message}\n${entry.flagsPlaced} flags, ${entry.queensPlaced} queens`
    ),
  ].join('\n');
});

function runDifficultyProbe(): void {
  if (!store.board) return;
  difficultyProbe.value = analyzeQueensDifficulty(store.board);
}

async function copyBoardJson(): Promise<void> {
  await copyDebugText('json', prettyBoardJson.value, 'Copy JSON');
}

watch(
  () => store.board,
  () => {
    difficultyProbe.value = null;
  },
  { deep: true }
);

watch(
  [
    selectedBoardSize,
    showSolutionQueens,
    generationPreviewIntervalMs,
    () => store.queenCountMode,
    () => store.targetQueenCount,
    () => store.orthogonalMinDistance,
    () => store.minimumGroupSize,
    () => store.generationStrategy,
    () => store.selectedTool,
    () => store.selectedColor,
    templateSeedCells,
  ],
  () => {
    saveQueensAdminWorkshopInputs({
      selectedBoardSize: selectedBoardSize.value,
      queenCountMode: store.queenCountMode,
      targetQueenCount: store.targetQueenCount,
      orthogonalMinDistance: store.orthogonalMinDistance,
      minimumGroupSize: store.minimumGroupSize,
      showSolutionQueens: showSolutionQueens.value,
      generationPreviewIntervalMs: generationPreviewIntervalMs.value,
      generationStrategy: store.generationStrategy,
      selectedTool: store.selectedTool,
      selectedColor: store.selectedColor,
      templateSeedCells: templateSeedCells.value,
    });
  },
  { deep: true }
);

async function copyPuzzleUrl(): Promise<void> {
  if (!shareableQueensPuzzleUrl.value) return;
  await copyDebugText('url', shareableQueensPuzzleUrl.value, 'Copy URL');
}

async function copyDebugText(key: CopyButtonKey, text: string, resetLabel = 'Copy'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copyButtonLabels.value[key] = 'Copied';
  } catch {
    copyButtonLabels.value[key] = 'Copy Failed';
  }

  if (copyTimers[key]) {
    clearTimeout(copyTimers[key]);
  }

  copyTimers[key] = setTimeout(() => {
    copyButtonLabels.value[key] = resetLabel;
    delete copyTimers[key];
  }, 1600);
}

function getColorButtonClasses(color: ColorName): string {
  const isSelected = store.selectedColor === color;
  const classes = [
    `bg-group-${color}-base`,
    isSelected
      ? 'border-white text-white ring-2 ring-white/50'
      : 'border-transparent text-white/90 hover:border-white/30',
  ];

  if (color === 'yellow') {
    classes.push('text-semantic-neutral-900');
  }

  return classes.join(' ');
}
</script>
