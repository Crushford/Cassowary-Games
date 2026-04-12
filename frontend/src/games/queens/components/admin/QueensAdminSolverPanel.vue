<template>
  <section class="grid min-h-[820px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
    <aside
      class="space-y-4 rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5"
    >
      <section class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-white">Solver Steps</h2>
            <p class="mt-1 text-sm text-semantic-neutral-400">
              Every action sends the current puzzle to the backend and expects an updated puzzle
              back.
            </p>
          </div>
          <div
            class="rounded-full bg-feedback-infoFaint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-info-100"
          >
            API-Driven
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <div class="min-w-[180px] flex-1">
            <Select
              v-model="runAllDifficultyThreshold"
              :options="solverDifficultyOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <Button
            label="Run All Through Difficulty"
            :disabled="!currentSolverBoard || actionLoading"
            :loading="actionLoading && activeAction === 'run-all-difficulty'"
            @click="runAllThroughDifficulty"
          />
          <Button
            label="Undo"
            outlined
            :disabled="queensStore.moveHistory.length === 0 || actionLoading"
            @click="handleUndo"
          />
          <Button
            label="Clear"
            outlined
            :disabled="!currentSolverBoard || actionLoading"
            @click="handleClear"
          />
        </div>

        <div class="mt-4 space-y-3">
          <div
            v-for="step in builtInSolverRows"
            :key="step.id"
            class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkMuted p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-white">{{ step.label }}</div>
                <div class="mt-1 text-xs text-semantic-neutral-400">{{ step.description }}</div>
              </div>
              <div class="w-full sm:w-40">
                <Select
                  :model-value="step.difficulty"
                  :options="solverDifficultyOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                  @update:model-value="updateBuiltInStepDifficulty(step.id, $event)"
                />
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <Button
                size="small"
                label="Run Once"
                :disabled="!currentSolverBoard || actionLoading"
                :loading="actionLoading && activeAction === step.runOnceActionId"
                @click="runBuiltInStepOnce(step.id)"
              />
              <Button
                size="small"
                outlined
                label="Run Until No Progress"
                :disabled="!currentSolverBoard || actionLoading"
                :loading="actionLoading && activeAction === step.runUntilActionId"
                @click="runBuiltInStepUntilNoProgress(step.id)"
              />
            </div>
          </div>
        </div>

        <label
          class="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-semantic-neutral-800 bg-surface-darkMuted px-4 py-3"
        >
          <div class="space-y-1">
            <div class="text-sm font-semibold text-white">Auto-run Single Color Queen</div>
            <div class="text-xs text-semantic-neutral-400">
              After any other solver or pattern action places at least one new flag, run
              single-color once on the updated board.
            </div>
          </div>
          <ToggleSwitch v-model="autoRunSingleColorAfterSolverAction" />
        </label>
      </section>

      <section class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4">
        <h2 class="text-lg font-semibold text-white">Difficulty</h2>
        <div class="mt-4 rounded-2xl border border-semantic-info-900 bg-feedback-infoFaint p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-info-100">
            Queen Distance Rule
          </div>
          <div class="mt-2 text-base font-semibold text-white">
            Queens in the same row or column must be at least
            {{ requiredQueenDistanceLabel }} squares apart.
          </div>
          <div class="mt-1 text-sm text-semantic-neutral-200">
            This puzzle is using a minimum distance of
            <span class="font-semibold text-white">{{ requiredQueenDistanceLabel }}</span
            >. That is the main spacing rule the solver is checking against.
          </div>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-surface-darkMuted p-3">
            <div class="text-sm text-semantic-neutral-400">Hardest Rule Used</div>
            <div class="mt-1 text-xl font-semibold text-white">{{ hardestDifficultyUsed }}</div>
          </div>
          <div class="rounded-xl bg-surface-darkMuted p-3">
            <div class="text-sm text-semantic-neutral-400">Queens Placed</div>
            <div class="mt-1 text-xl font-semibold text-white">{{ queensPlaced }}</div>
          </div>
          <div class="rounded-xl bg-surface-darkMuted p-3">
            <div class="text-sm text-semantic-neutral-400">Step Uses</div>
            <div class="mt-1 text-xl font-semibold text-white">{{ totalStepUses }}</div>
          </div>
          <div class="rounded-xl bg-surface-darkMuted p-3">
            <div class="text-sm text-semantic-neutral-400">Candidates Left</div>
            <div class="mt-1 text-xl font-semibold text-white">{{ unresolvedCandidateCount }}</div>
          </div>
          <div class="rounded-xl bg-surface-darkMuted p-3 sm:col-span-2">
            <div class="text-sm text-semantic-neutral-400">Min Distance Between Flags</div>
            <div class="mt-1 text-xl font-semibold text-white">
              {{ minimumFlagDistanceLabel }}
            </div>
            <div class="mt-1 text-xs text-semantic-neutral-400">
              Compared against queen minimum distance {{ requiredQueenDistanceLabel }}.
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div
              class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-500"
            >
              Difficulty Overview
            </div>
            <Button
              size="small"
              outlined
              label="Copy Config"
              :disabled="difficultyOverviewSections.length === 0"
              @click="copyDifficultyOverview"
            />
          </div>

          <div
            v-for="section in difficultyOverviewSections"
            :key="section.id"
            class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkMuted p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-white">{{ section.title }}</div>
                <div class="text-xs text-semantic-neutral-400">{{ section.subtitle }}</div>
              </div>
              <div
                class="rounded-full bg-semantic-neutral-950 px-3 py-1 text-[11px] font-semibold text-semantic-neutral-300"
              >
                {{ section.entries.length }}
              </div>
            </div>

            <div class="mt-3 space-y-2">
              <div
                v-for="entry in section.entries"
                :key="entry.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-semantic-neutral-950 px-3 py-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold text-white">{{ entry.label }}</div>
                  <div class="text-xs text-semantic-neutral-400">{{ entry.meta }}</div>
                </div>
                <div class="text-sm font-semibold text-semantic-info-100">
                  {{ formatSolverDifficulty(entry.difficulty) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-semantic-neutral-500">
            Usage
          </div>
          <div
            v-for="step in solverStepUsageRows"
            :key="step.id"
            class="flex items-center justify-between rounded-xl bg-surface-darkMuted px-3 py-2"
          >
            <div>
              <div class="text-sm font-semibold text-white">{{ step.label }}</div>
              <div class="text-xs text-semantic-neutral-400">
                Difficulty {{ formatSolverDifficulty(step.difficulty) }}
              </div>
            </div>
            <div class="text-lg font-semibold text-semantic-info-100">{{ step.count }}</div>
          </div>
        </div>
      </section>
    </aside>

    <main
      class="space-y-4 rounded-[32px] border border-semantic-neutral-800 bg-surface-darkSoft p-6"
    >
      <section class="rounded-[28px] border border-semantic-neutral-800 bg-surface-overlayDim p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold text-white">Solver Board</h2>
            <p class="mt-1 text-sm text-semantic-neutral-300">
              The backend returns the full updated puzzle state, including queens and flags. This
              view highlights the cells changed by the last solver action.
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="small"
              outlined
              label="Copy Board"
              :disabled="!currentSolverBoard"
              @click="copyCurrentBoard"
            />
            <Button
              size="small"
              outlined
              label="Copy Last 50 + Board"
              :disabled="!currentSolverBoard && solverLogEntries.length === 0"
              @click="copyLastFiftyLogLinesAndBoard"
            />
            <Button
              size="small"
              outlined
              label="Copy All Logs"
              :disabled="solverLogEntries.length === 0"
              @click="copyAllLogs"
            />
            <div
              class="min-w-[320px] rounded-2xl border border-semantic-neutral-700 bg-semantic-neutral-950 px-4 py-3"
            >
              <div
                class="text-[11px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-400"
              >
                Puzzle Details
              </div>
              <div
                v-if="solverPuzzleMetaItems.length > 0"
                class="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div
                  v-for="item in solverPuzzleMetaItems"
                  :key="item.label"
                  class="rounded-xl bg-surface-darkMuted px-3 py-2"
                >
                  <div
                    class="text-[10px] font-semibold uppercase tracking-[0.16em] text-semantic-neutral-500"
                  >
                    {{ item.label }}
                  </div>
                  <div class="mt-1 text-sm font-semibold text-white">{{ item.value }}</div>
                </div>
              </div>
              <div v-else class="mt-2 text-sm text-semantic-neutral-300">No puzzle loaded</div>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="currentSolverBoard"
        class="rounded-[28px] border border-semantic-neutral-800 bg-surface-overlaySoft p-4"
      >
        <QueensPuzzleBoard
          class="w-full max-w-full"
          :store="queensStore"
          :enable-touch="false"
          :changed-cells="highlightedChangedCells"
          aria-label="Queens solver puzzle grid"
        />
      </section>

      <div
        v-else
        class="flex min-h-[520px] items-center justify-center rounded-[28px] border border-dashed border-semantic-neutral-700 bg-surface-overlaySoft p-12 text-center text-semantic-neutral-300"
      >
        <div class="max-w-sm space-y-3">
          <p class="text-lg font-semibold text-white">No solver puzzle loaded</p>
          <p>Choose filters below and load a random DB puzzle to start testing rules.</p>
        </div>
      </div>

      <AdminPanel
        title="Puzzle Source"
        description="Load random puzzles from the database using exact ruleset filters."
        content-class="mt-4"
      >
        <template #badge>
          <Tag severity="warn" value="Solver" rounded />
        </template>

        <div class="space-y-4">
          <div class="space-y-2">
            <div class="text-sm font-semibold text-white">Size</div>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="option in sizeRadioOptions"
                :key="`size-${option.value}`"
                class="flex items-center gap-2 text-sm text-semantic-neutral-200"
              >
                <RadioButton v-model="selectedSize" name="solver-size" :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-semibold text-white">Min Distance</div>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="option in distanceRadioOptions"
                :key="`distance-${option.value}`"
                class="flex items-center gap-2 text-sm text-semantic-neutral-200"
              >
                <RadioButton
                  v-model="selectedDistance"
                  name="solver-distance"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-semibold text-white">Min Group Size</div>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="option in minimumGroupSizeRadioOptions"
                :key="`group-${option.value}`"
                class="flex items-center gap-2 text-sm text-semantic-neutral-200"
              >
                <RadioButton
                  v-model="selectedMinimumGroupSize"
                  name="solver-min-group"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-semibold text-white">Queens</div>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="option in queenCountRadioOptions"
                :key="`queen-${option.value}`"
                class="flex items-center gap-2 text-sm text-semantic-neutral-200"
              >
                <RadioButton
                  v-model="selectedQueenCount"
                  name="solver-queen-count"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
          <div class="text-sm text-semantic-neutral-400">Matching Puzzles</div>
          <div class="mt-1 text-2xl font-semibold text-white">{{ matchingPuzzleCount }}</div>
        </div>

        <div class="mt-4 space-y-3">
          <div class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-white">Board Update Cadence</div>
                <div class="mt-1 text-xs text-semantic-neutral-400">
                  Multi-step solver jobs should respect this interval when swapping in newer board
                  snapshots. Single-step actions update immediately.
                </div>
              </div>
              <div class="text-sm font-semibold text-semantic-info-200">
                {{ updateCadenceMs }} ms
              </div>
            </div>
            <Slider v-model="updateCadenceMs" class="mt-4" :min="50" :max="5000" :step="50" />
          </div>

          <div class="flex flex-wrap gap-3">
            <Button
              label="Load Random Puzzle"
              :disabled="matchingPuzzleCount === 0 || loadingPuzzle"
              :loading="loadingPuzzle"
              @click="loadRandomPuzzle"
            />
            <Button
              label="Reset Marks"
              outlined
              :disabled="!solverSelection || actionLoading"
              @click="resetSolverState"
            />
          </div>
        </div>

        <AdminMessage v-if="statusMessage" severity="info" class="mt-4">
          {{ statusMessage }}
        </AdminMessage>

        <AdminMessage v-if="errorMessage" severity="error" class="mt-4">
          {{ errorMessage }}
        </AdminMessage>
      </AdminPanel>

      <AdminPanel
        title="Activity Log"
        description="Tracks every solver service call, what changed, and any errors."
        content-class="mt-4"
      >
        <template #badge>
          <Tag severity="contrast" :value="`${solverLogEntries.length} entries`" rounded />
        </template>

        <div class="flex flex-wrap gap-3">
          <Button
            size="small"
            label="Copy All Logs"
            :disabled="solverLogEntries.length === 0"
            @click="copyAllLogs"
          />
          <Button
            size="small"
            outlined
            label="Copy Puzzle Board"
            :disabled="!currentSolverBoard"
            @click="copyCurrentBoard"
          />
          <Button
            size="small"
            outlined
            label="Copy Last 50 + Board"
            :disabled="!currentSolverBoard && solverLogEntries.length === 0"
            @click="copyLastFiftyLogLinesAndBoard"
          />
        </div>

        <div
          v-if="solverLogEntries.length === 0"
          class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4 text-sm text-semantic-neutral-300"
        >
          No solver activity logged yet.
        </div>

        <div
          v-else
          class="mt-4 max-h-[26rem] space-y-2 overflow-y-auto rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-3"
        >
          <div
            v-for="entry in logEntriesForDisplay"
            :key="entry.id"
            class="rounded-xl border border-semantic-neutral-800 bg-semantic-neutral-950 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-white">{{ entry.title }}</div>
              <div class="text-[11px] uppercase tracking-[0.18em] text-semantic-neutral-400">
                {{ entry.timestamp }}
              </div>
            </div>
            <div class="mt-1 text-xs text-semantic-neutral-300">{{ entry.detail }}</div>
            <div v-if="entry.error" class="mt-1 text-xs text-semantic-danger-200">
              Error: {{ entry.error }}
            </div>
          </div>
        </div>
      </AdminPanel>
    </main>

    <aside
      class="space-y-4 rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5"
    >
      <AdminPanel
        title="Patterns"
        description="Patterns are stored in the backend solver config and reused by the admin solver and difficulty assessment pipeline."
        content-class="mt-0"
      >
        <template #badge>
          <Tag severity="info" value="Backend Config" rounded />
        </template>

        <div class="flex flex-wrap gap-3">
          <Button label="New Pattern" :disabled="actionLoading" @click="startNewPattern" />
          <Button
            label="Run All Until No Flags"
            outlined
            :disabled="!currentSolverBoard || actionLoading || savedPatterns.length === 0"
            :loading="actionLoading && activeAction === 'patterns-loop-all'"
            @click="runAllPatternsUntilNoFlags"
          />
        </div>

        <div
          v-if="showPatternEditor"
          class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-white">Pattern Difficulty</div>
              <div class="mt-1 text-xs text-semantic-neutral-400">
                Stored with the backend solver pattern config.
              </div>
            </div>
            <div class="w-36">
              <Select
                v-model="editingPatternDifficulty"
                :options="solverDifficultyOptions"
                option-label="label"
                option-value="value"
                class="w-full"
              />
            </div>
          </div>

          <SharedPatternDesigner
            v-model="patternDraft"
            :title="editingPatternId ? 'Edit Pattern' : 'Create Pattern'"
            :description="
              editingPatternId
                ? 'Adjust the selected pattern and save it back to the backend solver config.'
                : 'Create a new solver pattern and save it to the backend solver config.'
            "
            grid-label="Pattern Grid"
            save-label="Save Pattern"
            cancel-label="Cancel"
            :show-id="false"
            :show-actions="true"
            :show-cancel="true"
            @save="savePatternDraft"
            @cancel="cancelPatternEditing"
          />
        </div>

        <div
          v-if="savedPatterns.length === 0 && !loadingSolverConfig"
          class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4 text-sm text-semantic-neutral-300"
        >
          No solver patterns saved yet.
        </div>

        <div
          v-else-if="loadingSolverConfig"
          class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4 text-sm text-semantic-neutral-300"
        >
          Loading solver patterns...
        </div>

        <div v-else class="mt-4 space-y-3">
          <div
            v-for="pattern in savedPatterns"
            :key="pattern.id"
            class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
          >
            <div class="space-y-4">
              <SharedPatternPreview
                :size="pattern.size"
                :cells="pattern.cells"
                :output-flags="pattern.outputFlags"
                class="mx-auto rounded-2xl border border-semantic-neutral-800 bg-surface-overlayDim p-2"
                cell-size-class="h-7 w-7"
              />

              <div class="space-y-3 text-center">
                <div>
                  <div class="text-base font-semibold text-white">{{ pattern.name }}</div>
                  <div class="mt-1 text-sm text-semantic-neutral-400">
                    {{ pattern.size }}x{{ pattern.size }} • {{ pattern.outputFlags.length }} flag{{
                      pattern.outputFlags.length === 1 ? '' : 's'
                    }}
                    • {{ formatSolverDifficulty(pattern.difficulty) }}
                  </div>
                </div>

                <div
                  class="rounded-2xl border border-semantic-neutral-800 bg-surface-overlayDim px-3 py-2"
                >
                  <div
                    class="text-[11px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-500"
                  >
                    Difficulty
                  </div>
                  <div class="mt-2">
                    <Select
                      :model-value="pattern.difficulty"
                      :options="solverDifficultyOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      @update:model-value="updatePatternDifficulty(pattern.id, $event)"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 border-t border-semantic-neutral-800 pt-3">
                  <Button
                    size="small"
                    label="Run"
                    :disabled="!currentSolverBoard || actionLoading || !pattern.enabled"
                    :loading="actionLoading && activeAction === `pattern-${pattern.id}`"
                    @click="runPatternOnce(pattern)"
                  />
                  <Button
                    size="small"
                    label="Loop"
                    outlined
                    :disabled="!currentSolverBoard || actionLoading || !pattern.enabled"
                    :loading="actionLoading && activeAction === `pattern-loop-${pattern.id}`"
                    @click="runPatternUntilNoFlags(pattern)"
                  />
                  <Button
                    size="small"
                    label="Edit"
                    outlined
                    severity="secondary"
                    class="col-span-2"
                    :disabled="actionLoading"
                    @click="editPattern(pattern)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import Select from 'primevue/select';
import Slider from 'primevue/slider';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';
import AdminMessage from './AdminMessage.vue';
import AdminPanel from './AdminPanel.vue';
import SharedPatternDesigner from '../queens/SharedPatternDesigner.vue';
import SharedPatternPreview from '../queens/SharedPatternPreview.vue';
import { useQueensStore } from '../../stores/queensStore';
import { assignRegionPaletteColors } from '../../utils/regionDisplay';
import { queensAdminApi } from '../../admin/api';
import type {
  QueensAdminBoardState,
  QueensAdminBuiltInSolverStep,
  QueensAdminCatalogPuzzleSelection,
  QueensAdminDifficulty,
  QueensAdminOperationResult,
  QueensAdminPuzzleCatalogGroup,
  QueensAdminSolverPattern,
} from '../../admin/types';
import {
  loadQueensAdminSolverInputs,
  loadQueensAdminSolverSession,
  saveQueensAdminSolverInputs,
  saveQueensAdminSolverSession,
} from '../../admin/inputPersistence';
import {
  formatSolverDifficulty,
  isDifficultyAtOrBelow,
  normalizeSolverDifficulty,
  SOLVER_DIFFICULTY_OPTIONS,
} from '../../admin/solverDifficulty';
import type { PatternEditorDraft } from '../queens/patternEditorTypes';

const QueensPuzzleBoard = defineAsyncComponent(() => import('../queens/QueensPuzzleBoard.vue'));
const DEFAULT_BUILT_IN_SOLVER_STEPS = [
  {
    id: 'single-color',
    label: 'Single Color Queen',
    description: 'Place the queen when exactly one valid square remains in a color group.',
    difficulty: 'easy',
    enabled: true,
    sortOrder: 10,
  },
  {
    id: 'row-column',
    label: 'Row / Column Constraints',
    description: 'Use constrained sliding row and column bands to eliminate impossible candidates.',
    difficulty: 'medium',
    enabled: true,
    sortOrder: 20,
  },
  {
    id: 'group-confined-to-line',
    label: 'Group Confined To Line',
    description:
      'Flag candidates near a color group whose remaining squares are trapped in one row or column.',
    difficulty: 'easy',
    enabled: true,
    sortOrder: 30,
  },
  {
    id: 'assume-progress',
    label: 'Assume Queen Until Progress',
    description: 'Try queen assumptions until one contradiction forces a real move.',
    difficulty: 'hard',
    enabled: true,
    sortOrder: 40,
  },
  {
    id: 'assume-exhaustive',
    label: 'Assume Queen Exhaustive',
    description:
      'Exhaustively scan queen and flag assumptions until no further forced move exists.',
    difficulty: 'hard',
    enabled: true,
    sortOrder: 50,
  },
] as const satisfies ReadonlyArray<QueensAdminBuiltInSolverStep>;

type BuiltInSolverStepId = (typeof DEFAULT_BUILT_IN_SOLVER_STEPS)[number]['id'];
type BuiltInSolverStepDefinition = Omit<QueensAdminBuiltInSolverStep, 'id'> & {
  id: BuiltInSolverStepId;
};
type SolverMetricId = BuiltInSolverStepId | `pattern:${string}`;
const persistedSolverInputs = loadQueensAdminSolverInputs();
const persistedSolverSession = loadQueensAdminSolverSession();

const queensStore = useQueensStore();
const catalogGroups = ref<QueensAdminPuzzleCatalogGroup[]>([]);
const loadingPuzzle = ref(false);
const actionLoading = ref(false);
const activeAction = ref<string | null>(null);
const solverSelection = ref<QueensAdminCatalogPuzzleSelection | null>(null);
const statusMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const highlightedChangedCells = ref<string[]>([]);
const updateCadenceMs = ref(1000);
const selectedSize = ref<'any' | number>(persistedSolverInputs?.selectedSize ?? 'any');
const selectedDistance = ref<'any' | number>(persistedSolverInputs?.selectedDistance ?? 'any');
const selectedMinimumGroupSize = ref<'any' | number>(
  persistedSolverInputs?.selectedMinimumGroupSize ?? 'any'
);
const selectedQueenCount = ref<'any' | number>(persistedSolverInputs?.selectedQueenCount ?? 'any');
const autoRunSingleColorAfterSolverAction = ref(
  persistedSolverInputs?.autoRunSingleColorAfterSolverAction ?? false
);
const builtInStepDefinitions = ref<BuiltInSolverStepDefinition[]>([
  ...DEFAULT_BUILT_IN_SOLVER_STEPS,
]);
const builtInStepDifficulties = ref<Record<BuiltInSolverStepId, QueensAdminDifficulty>>(
  buildInitialStepDifficulties(
    DEFAULT_BUILT_IN_SOLVER_STEPS,
    persistedSolverInputs?.stepDifficulties
  )
);
const runAllDifficultyThreshold = ref<QueensAdminDifficulty>(
  normalizeSolverDifficulty(persistedSolverInputs?.runAllDifficultyThreshold, 'hard')
);
const solverUsageCounts = ref<Record<SolverMetricId, number>>({
  'single-color': 0,
  'row-column': 0,
  'group-confined-to-line': 0,
  'assume-progress': 0,
  'assume-exhaustive': 0,
});
const savedPatterns = ref<QueensAdminSolverPattern[]>([]);
const showPatternEditor = ref(false);
const editingPatternId = ref<string | null>(null);
const editingPatternDifficulty = ref<QueensAdminDifficulty>('medium');
const patternDraft = ref<PatternEditorDraft>(createEmptyPatternDraft());
const solverLogEntries = ref<SolverLogEntry[]>([]);
const loadingSolverConfig = ref(false);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

type RadioOption = {
  value: 'any' | number;
  label: string;
};

type SolverLogEntry = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  error?: string | null;
};

const solverDifficultyOptions = SOLVER_DIFFICULTY_OPTIONS;

const builtInSolverRows = computed(() =>
  builtInStepDefinitions.value
    .filter((step) => step.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((step) => ({
      ...step,
      difficulty: builtInStepDifficulties.value[step.id],
      runOnceActionId: `${step.id}-once`,
      runUntilActionId: `${step.id}-loop`,
    }))
);

const filteredBySize = computed(() =>
  catalogGroups.value.filter(
    (group) => selectedSize.value === 'any' || group.size === selectedSize.value
  )
);
const filteredByDistance = computed(() =>
  filteredBySize.value.filter(
    (group) =>
      selectedDistance.value === 'any' || group.orthogonalMinDistance === selectedDistance.value
  )
);
const filteredByMinimumGroup = computed(() =>
  filteredByDistance.value.filter(
    (group) =>
      selectedMinimumGroupSize.value === 'any' ||
      group.minimumGroupSize === selectedMinimumGroupSize.value
  )
);
const fullyFilteredGroups = computed(() =>
  filteredByMinimumGroup.value.filter(
    (group) =>
      selectedQueenCount.value === 'any' || group.targetQueenCount === selectedQueenCount.value
  )
);

const matchingPuzzleCount = computed(() =>
  fullyFilteredGroups.value.reduce((total, group) => total + group.count, 0)
);

const sizeRadioOptions = computed<RadioOption[]>(() => [
  { value: 'any', label: 'Any' },
  ...uniqueOptions(catalogGroups.value.map((group) => group.size)).map((value) => ({
    value,
    label: `${value}x${value}`,
  })),
]);

const distanceRadioOptions = computed<RadioOption[]>(() => [
  { value: 'any', label: 'Any' },
  ...uniqueOptions(filteredBySize.value.map((group) => group.orthogonalMinDistance)).map(
    (value) => ({
      value,
      label: String(value),
    })
  ),
]);

const minimumGroupSizeRadioOptions = computed<RadioOption[]>(() => [
  { value: 'any', label: 'Any' },
  ...uniqueOptions(filteredByDistance.value.map((group) => group.minimumGroupSize)).map(
    (value) => ({
      value,
      label: String(value),
    })
  ),
]);

const queenCountRadioOptions = computed<RadioOption[]>(() => [
  { value: 'any', label: 'Any' },
  ...uniqueOptions(filteredByMinimumGroup.value.map((group) => group.targetQueenCount)).map(
    (value) => ({
      value,
      label: String(value),
    })
  ),
]);

const queensPlaced = computed(() =>
  currentSolverBoard.value
    ? currentSolverBoard.value.cells.flat().filter((cell) => cell.markType === 'QUEEN').length
    : 0
);

const unresolvedCandidateCount = computed(() =>
  currentSolverBoard.value
    ? currentSolverBoard.value.cells.flat().filter((cell) => cell.markType === 'NONE').length
    : 0
);

const minimumFlagDistanceLabel = computed(() =>
  queensStore.minimumFlagOrthogonalDistance == null
    ? 'N/A'
    : String(queensStore.minimumFlagOrthogonalDistance)
);

const requiredQueenDistanceLabel = computed(() =>
  solverSelection.value ? String(solverSelection.value.orthogonalMinDistance) : 'N/A'
);

const totalStepUses = computed(() =>
  Object.values(solverUsageCounts.value).reduce((total, count) => total + count, 0)
);

const hardestDifficultyUsed = computed(() => {
  const usedBuiltIn = builtInStepDefinitions.value
    .filter((step) => step.enabled)
    .filter((step) => (solverUsageCounts.value[step.id] ?? 0) > 0)
    .map((step) => builtInStepDifficulties.value[step.id]);
  const usedPatterns = savedPatterns.value
    .filter((pattern) => (solverUsageCounts.value[`pattern:${pattern.id}`] ?? 0) > 0)
    .map((pattern) => pattern.difficulty);
  const allUsed = [...usedBuiltIn, ...usedPatterns];
  if (allUsed.length === 0) return 'None';
  return formatSolverDifficulty(
    allUsed.reduce((hardest, difficulty) =>
      isDifficultyAtOrBelow(difficulty, hardest) ? hardest : difficulty
    )
  );
});

const solverStepUsageRows = computed(() => [
  ...builtInStepDefinitions.value
    .filter((step) => step.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((step) => ({
      id: step.id,
      label: step.label,
      difficulty: builtInStepDifficulties.value[step.id],
      count: solverUsageCounts.value[step.id] ?? 0,
    })),
  ...savedPatterns.value
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((pattern) => ({
      id: `pattern:${pattern.id}`,
      label: pattern.name,
      difficulty: pattern.difficulty,
      count: solverUsageCounts.value[`pattern:${pattern.id}`] ?? 0,
    })),
]);

const difficultyOverviewSections = computed(() => {
  const builtInEntries = builtInSolverRows.value.map((step, index) => ({
    id: step.id,
    label: step.label,
    meta: `Built-in step ${index + 1}`,
    difficulty: step.difficulty,
  }));

  const patternEntries = savedPatterns.value
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((pattern, index) => ({
      id: `pattern:${pattern.id}`,
      label: pattern.name,
      meta: `Pattern ${index + 1}`,
      difficulty: pattern.difficulty,
    }));

  return [
    {
      id: 'built-in-steps',
      title: 'Built-In Steps',
      subtitle: 'Execution order used by the solver loop.',
      entries: builtInEntries,
    },
    {
      id: 'patterns',
      title: 'Patterns',
      subtitle: 'Backend-backed pattern rules in execution order.',
      entries: patternEntries,
    },
  ].filter((section) => section.entries.length > 0);
});

const difficultyOverviewClipboardText = computed(() =>
  difficultyOverviewSections.value
    .map((section) =>
      [
        section.title,
        ...section.entries.map(
          (entry) => `- ${entry.label}: ${formatSolverDifficulty(entry.difficulty)} (${entry.meta})`
        ),
      ].join('\n')
    )
    .join('\n\n')
);

const logEntriesForDisplay = computed(() => solverLogEntries.value.slice(-50).reverse());

const currentSolverBoard = computed<QueensAdminBoardState | null>(() =>
  solverSelection.value ? queensStore.exportAdminBoardState() : null
);

const solverPuzzleMetaItems = computed(() => {
  if (!solverSelection.value) return [];

  return [
    {
      label: 'Board Size',
      value: `${solverSelection.value.size} x ${solverSelection.value.size}`,
    },
    {
      label: 'Min Queen Distance',
      value: String(solverSelection.value.orthogonalMinDistance),
    },
    {
      label: 'Target Queens',
      value: String(solverSelection.value.targetQueenCount),
    },
    {
      label: 'Min Group Size',
      value: String(solverSelection.value.minimumGroupSize),
    },
  ];
});

watch(selectedSize, () => {
  selectedDistance.value = 'any';
  selectedMinimumGroupSize.value = 'any';
  selectedQueenCount.value = 'any';
});

watch(selectedDistance, () => {
  selectedMinimumGroupSize.value = 'any';
  selectedQueenCount.value = 'any';
});

watch(selectedMinimumGroupSize, () => {
  selectedQueenCount.value = 'any';
});

watch(
  [
    selectedSize,
    selectedDistance,
    selectedMinimumGroupSize,
    selectedQueenCount,
    autoRunSingleColorAfterSolverAction,
    runAllDifficultyThreshold,
  ],
  ([
    nextSelectedSize,
    nextSelectedDistance,
    nextSelectedMinimumGroupSize,
    nextSelectedQueenCount,
    nextAutoRunSingleColorAfterSolverAction,
    nextRunAllDifficultyThreshold,
  ]) => {
    saveQueensAdminSolverInputs({
      selectedSize: nextSelectedSize,
      selectedDistance: nextSelectedDistance,
      selectedMinimumGroupSize: nextSelectedMinimumGroupSize,
      selectedQueenCount: nextSelectedQueenCount,
      autoRunSingleColorAfterSolverAction: nextAutoRunSingleColorAfterSolverAction,
      runAllDifficultyThreshold: nextRunAllDifficultyThreshold,
      stepDifficulties: builtInStepDifficulties.value,
    });
  }
);

watch(
  builtInStepDifficulties,
  (nextStepDifficulties) => {
    saveQueensAdminSolverInputs({
      selectedSize: selectedSize.value,
      selectedDistance: selectedDistance.value,
      selectedMinimumGroupSize: selectedMinimumGroupSize.value,
      selectedQueenCount: selectedQueenCount.value,
      autoRunSingleColorAfterSolverAction: autoRunSingleColorAfterSolverAction.value,
      runAllDifficultyThreshold: runAllDifficultyThreshold.value,
      stepDifficulties: nextStepDifficulties,
    });
  },
  { deep: true }
);

watch(
  currentSolverBoard,
  (boardState) => {
    if (!boardState || !solverSelection.value) return;
    persistSolverSession(boardState);
  },
  { deep: true }
);

restorePersistedSolverSession();
void loadCatalogGroups();
void loadSolverConfig();

async function loadCatalogGroups(): Promise<void> {
  const stats = await queensAdminApi.getPuzzleCatalogStats();
  catalogGroups.value = stats.groups;
}

function isBuiltInSolverStepId(value: string): value is BuiltInSolverStepId {
  return DEFAULT_BUILT_IN_SOLVER_STEPS.some((step) => step.id === value);
}

function normalizeBuiltInStepDefinitions(
  definitions: QueensAdminBuiltInSolverStep[]
): BuiltInSolverStepDefinition[] {
  return definitions
    .filter((step): step is QueensAdminBuiltInSolverStep & { id: BuiltInSolverStepId } =>
      isBuiltInSolverStepId(step.id)
    )
    .map((step) => ({ ...step }));
}

async function loadSolverConfig(): Promise<void> {
  loadingSolverConfig.value = true;

  try {
    const config = await queensAdminApi.getSolverConfig();
    const normalizedBuiltInSteps = normalizeBuiltInStepDefinitions(config.builtInSteps);
    builtInStepDefinitions.value = normalizedBuiltInSteps;
    builtInStepDifficulties.value = buildInitialStepDifficulties(
      normalizedBuiltInSteps,
      persistedSolverInputs?.stepDifficulties
    );
    savedPatterns.value = config.patterns
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load solver configuration.';
    appendLog(
      'Solver Config',
      'Failed to load solver configuration from the backend.',
      errorMessage.value
    );
  } finally {
    loadingSolverConfig.value = false;
  }
}

function uniqueOptions(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

async function loadRandomPuzzle(): Promise<void> {
  loadingPuzzle.value = true;
  statusMessage.value = null;
  errorMessage.value = null;
  appendLog('Puzzle Source', 'Requested random puzzle from catalog filters.');

  try {
    const selection = await queensAdminApi.getRandomCatalogPuzzle({
      size: selectedSize.value === 'any' ? undefined : selectedSize.value,
      orthogonalMinDistance: selectedDistance.value === 'any' ? undefined : selectedDistance.value,
      minimumGroupSize:
        selectedMinimumGroupSize.value === 'any' ? undefined : selectedMinimumGroupSize.value,
      targetQueenCount: selectedQueenCount.value === 'any' ? undefined : selectedQueenCount.value,
    });

    if (!selection) {
      solverSelection.value = null;
      saveQueensAdminSolverSession(null);
      statusMessage.value = 'No puzzle matched those filters.';
      appendLog('Puzzle Source', 'No puzzle matched the selected catalog filters.');
      return;
    }

    solverSelection.value = selection;
    queensStore.hydrateFromAdminBoard(selection.board, {
      showSolutionQueens: false,
      resetHistory: true,
    });
    resetSolverMetrics();
    highlightedChangedCells.value = [];
    persistSolverSession(selection.board);
    statusMessage.value = `Loaded random puzzle ${selection.puzzleId}.`;
    appendLog(
      'Puzzle Source',
      `Loaded puzzle ${selection.puzzleId} (${selection.size}x${selection.size}, d${selection.orthogonalMinDistance}, q${selection.targetQueenCount}, g${selection.minimumGroupSize}).`
    );
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load a random DB puzzle.';
    appendLog('Puzzle Source', 'Random puzzle load failed.', errorMessage.value);
  } finally {
    loadingPuzzle.value = false;
  }
}

function resetSolverState(): void {
  if (!solverSelection.value) return;
  queensStore.hydrateFromAdminBoard(solverSelection.value.board, {
    showSolutionQueens: false,
    resetHistory: true,
  });
  highlightedChangedCells.value = [];
  resetSolverMetrics();
  persistSolverSession(solverSelection.value.board);
  statusMessage.value = 'Reset solver marks for the loaded puzzle.';
  errorMessage.value = null;
  appendLog('Solver Board', 'Reset visible queens and flags to the clean puzzle state.');
}

async function runBuiltInStepOnce(stepId: BuiltInSolverStepId): Promise<void> {
  const board = currentSolverBoard.value;
  if (!board) return;
  await runBackendAction(`${stepId}-once`, board, () => executeBuiltInStep(stepId, board), stepId);
}

async function runBuiltInStepUntilNoProgress(stepId: BuiltInSolverStepId): Promise<void> {
  if (!currentSolverBoard.value) return;

  actionLoading.value = true;
  activeAction.value = `${stepId}-loop`;
  errorMessage.value = null;

  try {
    let currentBoard = currentSolverBoard.value;
    let progressMade = false;
    let passCount = 0;
    let shouldContinue = true;
    appendLog('Service Call', `Calling solver service for action "${stepId}-loop".`);

    while (shouldContinue) {
      const previousBoard = currentBoard;
      const result = await executeBuiltInStep(stepId, currentBoard);
      if (!result.success || !result.board || result.changedCells.length === 0) {
        shouldContinue = false;
        continue;
      }

      passCount += 1;
      progressMade = true;
      applyOperationResult(result);
      incrementStepUsage(stepId);
      appendLog(
        'Service Result',
        `${result.action}: ${result.explanation} Changed ${result.changedCells.length} cell${result.changedCells.length === 1 ? '' : 's'}.`,
        result.error
      );

      currentBoard = result.board;

      if (shouldAutoRunSingleColor(stepId, previousBoard, result)) {
        currentBoard = await runSingleColorFollowUp(currentBoard);
      }

      await pauseForCadence();
    }

    if (!progressMade) {
      statusMessage.value = `${lookupBuiltInStep(stepId).label} made no change.`;
      appendLog(
        'Service Result',
        'RUN_SPECIFIC_SOLVER_RULE: The requested solver rule made no change. Changed 0 cells.'
      );
    } else {
      statusMessage.value = `${lookupBuiltInStep(stepId).label} ran for ${passCount} pass${passCount === 1 ? '' : 'es'} until no more progress was made.`;
      appendLog(
        'Service Result',
        `${lookupBuiltInStep(stepId).label} loop finished after ${passCount} pass${passCount === 1 ? '' : 'es'}.`
      );
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : `${lookupBuiltInStep(stepId).label} loop failed.`;
    appendLog('Service Error', `Solver action "${stepId}-loop" failed.`, errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

async function executeBuiltInStep(
  stepId: BuiltInSolverStepId,
  board: QueensAdminBoardState
): Promise<QueensAdminOperationResult> {
  switch (stepId) {
    case 'single-color':
      return queensAdminApi.runSingleColorGroupSolverRule(board);
    case 'row-column':
      return queensAdminApi.runSpecificSolverRule(board, 'constrained-lines');
    case 'group-confined-to-line':
      return queensAdminApi.runSpecificSolverRule(board, 'group-confined-to-line');
    case 'assume-progress':
      return runAssumeSolver(board, true);
    case 'assume-exhaustive':
      return runAssumeSolver(board, false);
  }
}

function lookupBuiltInStep(stepId: BuiltInSolverStepId) {
  return (
    builtInStepDefinitions.value.find((step) => step.id === stepId) ??
    builtInStepDefinitions.value[0]
  );
}

async function runPatternOnce(pattern: QueensAdminSolverPattern): Promise<void> {
  const board = currentSolverBoard.value;
  if (!board) return;
  await runBackendAction(
    `pattern-${pattern.id}`,
    board,
    () => queensAdminApi.runSolverPattern(board, pattern),
    `pattern:${pattern.id}`
  );
}

async function runPatternUntilNoFlags(pattern: QueensAdminSolverPattern): Promise<void> {
  if (!currentSolverBoard.value) return;

  actionLoading.value = true;
  activeAction.value = `pattern-loop-${pattern.id}`;
  errorMessage.value = null;

  try {
    appendLog('Pattern', `Started run-until-no-flags for pattern ${pattern.id}.`);
    const progressMade = await runPatternLoop(pattern, true);
    appendLog(
      'Pattern',
      progressMade
        ? `Pattern ${pattern.id} stopped after no further flags were placed.`
        : `Pattern ${pattern.id} placed no flags.`
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Pattern loop failed.';
    appendLog('Pattern', `Pattern loop failed for ${pattern.id}.`, errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

async function runAllPatternsUntilNoFlags(): Promise<void> {
  if (!currentSolverBoard.value || savedPatterns.value.length === 0) return;

  actionLoading.value = true;
  activeAction.value = 'patterns-loop-all';
  errorMessage.value = null;

  try {
    let loopCount = 0;
    let anyProgress = false;
    let shouldContinue = true;
    appendLog(
      'Pattern',
      `Started run-all-patterns-until-no-flags across ${savedPatterns.value.length} patterns.`
    );

    while (shouldContinue) {
      loopCount += 1;
      let loopPlacedFlags = false;

      for (const pattern of savedPatterns.value) {
        if (!pattern.enabled) continue;
        const patternProgress = await runPatternLoop(pattern, false);
        if (patternProgress) {
          anyProgress = true;
          loopPlacedFlags = true;
        }
      }

      if (!loopPlacedFlags) {
        shouldContinue = false;
      }
    }

    statusMessage.value = anyProgress
      ? `Ran all patterns for ${loopCount} pass${loopCount === 1 ? '' : 'es'} until no new flags were placed.`
      : 'All patterns completed one full pass without placing any flags.';
    appendLog(
      'Pattern',
      anyProgress
        ? `Finished all-pattern loop after ${loopCount} pass${loopCount === 1 ? '' : 'es'}.`
        : 'All patterns made no progress on the first full pass.'
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'All-pattern solver loop failed.';
    appendLog('Pattern', 'All-pattern solver loop failed.', errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

function startNewPattern(): void {
  editingPatternId.value = null;
  editingPatternDifficulty.value = 'medium';
  patternDraft.value = createEmptyPatternDraft();
  showPatternEditor.value = true;
  appendLog('Pattern', 'Started creating a new solver pattern.');
}

function editPattern(pattern: QueensAdminSolverPattern): void {
  editingPatternId.value = pattern.id;
  editingPatternDifficulty.value = pattern.difficulty;
  patternDraft.value = {
    id: pattern.id,
    size: pattern.size,
    cells: pattern.cells.map((cell) => ({ ...cell })),
    outputFlags: pattern.outputFlags.map((flag) => ({ ...flag })),
  };
  showPatternEditor.value = true;
  appendLog('Pattern', `Loaded pattern ${pattern.id} into the editor.`);
}

function cancelPatternEditing(): void {
  editingPatternId.value = null;
  editingPatternDifficulty.value = 'medium';
  patternDraft.value = createEmptyPatternDraft();
  showPatternEditor.value = false;
  appendLog('Pattern', 'Closed the pattern editor without saving.');
}

async function savePatternDraft(draft: PatternEditorDraft): Promise<void> {
  const normalized = normalizeSolverPattern(
    {
      id: editingPatternId.value ?? draft.id ?? nextPatternId(savedPatterns.value),
      name: editingPatternId.value ?? draft.id ?? nextPatternId(savedPatterns.value),
      size: draft.size,
      cells: draft.cells,
      outputFlags: draft.outputFlags,
      difficulty: editingPatternDifficulty.value,
      enabled: true,
      sortOrder:
        savedPatterns.value.find((pattern) => pattern.id === editingPatternId.value)?.sortOrder ??
        nextPatternSortOrder(savedPatterns.value),
    },
    editingPatternId.value ?? draft.id ?? nextPatternId(savedPatterns.value)
  );

  try {
    const savedPattern = editingPatternId.value
      ? await queensAdminApi.updateSolverPattern(normalized)
      : await queensAdminApi.createSolverPattern(normalized);

    if (editingPatternId.value) {
      savedPatterns.value = savedPatterns.value.map((pattern) =>
        pattern.id === editingPatternId.value ? savedPattern : pattern
      );
      statusMessage.value = 'Updated solver pattern.';
      appendLog('Pattern', `Updated backend pattern ${savedPattern.id}.`);
    } else {
      savedPatterns.value = [...savedPatterns.value, savedPattern].sort(
        (left, right) => left.sortOrder - right.sortOrder
      );
      statusMessage.value = 'Saved new solver pattern.';
      appendLog('Pattern', `Saved new backend pattern ${savedPattern.id}.`);
    }

    cancelPatternEditing();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save solver pattern.';
    appendLog('Pattern', 'Saving solver pattern failed.', errorMessage.value);
  }
}

async function runBackendAction(
  actionKey: string,
  beforeBoard: QueensAdminBoardState,
  action: () => Promise<QueensAdminOperationResult>,
  usageStepId?: SolverMetricId
): Promise<void> {
  actionLoading.value = true;
  activeAction.value = actionKey;
  errorMessage.value = null;
  appendLog('Service Call', `Calling solver service for action "${actionKey}".`);

  try {
    const result = await action();
    applyOperationResult(result);
    if (usageStepId && result.success) {
      incrementStepUsage(usageStepId);
    }
    appendLog(
      'Service Result',
      `${result.action}: ${result.explanation} Changed ${result.changedCells.length} cell${result.changedCells.length === 1 ? '' : 's'}.`,
      result.error
    );

    if (shouldAutoRunSingleColor(actionKey, beforeBoard, result)) {
      await runSingleColorFollowUp(result.board);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Solver request failed.';
    appendLog('Service Error', `Solver action "${actionKey}" failed.`, errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

async function runPatternLoop(
  pattern: QueensAdminSolverPattern,
  pauseBetweenIterations: boolean
): Promise<boolean> {
  let currentBoard = currentSolverBoard.value;
  if (!currentBoard) return false;

  let progressMade = false;
  let shouldContinue = true;

  while (shouldContinue) {
    const previousBoard = currentBoard;
    const result = await queensAdminApi.runSolverPattern(currentBoard, pattern);
    if (!result.success || !result.board || result.changedCells.length === 0) {
      if (!progressMade) {
        statusMessage.value = 'The selected pattern did not place any flags.';
      }
      shouldContinue = false;
      continue;
    }

    progressMade = true;
    applyOperationResult(result);
    incrementStepUsage(`pattern:${pattern.id}`);
    currentBoard = result.board;

    if (shouldAutoRunSingleColor(`pattern-${pattern.id}`, previousBoard, result)) {
      currentBoard = await runSingleColorFollowUp(currentBoard);
    }

    if (pauseBetweenIterations) {
      await pauseForCadence();
    }
  }

  return progressMade;
}

function applyOperationResult(result: QueensAdminOperationResult): void {
  statusMessage.value = result.explanation;
  errorMessage.value = result.error;

  if (result.board) {
    queensStore.applyAdminBoardResult(result.board, {
      showSolutionQueens: false,
      saveHistory: true,
    });
    persistSolverSession(result.board);
  }

  highlightedChangedCells.value = result.changedCells.map((cell) => `${cell.row}:${cell.col}`);
  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
  if (highlightedChangedCells.value.length > 0) {
    highlightTimer = setTimeout(
      () => {
        highlightedChangedCells.value = [];
        highlightTimer = null;
      },
      Math.max(1200, updateCadenceMs.value + 600)
    );
  }
}

async function runAssumeSolver(
  board: QueensAdminBoardState,
  stopOnQueenPlacement: boolean
): Promise<QueensAdminOperationResult> {
  let currentBoard = board;
  const combinedChangedCells: QueensAdminOperationResult['changedCells'] = [];
  let lastExplanation = stopOnQueenPlacement
    ? 'Assumption scan found no forced flags or queens.'
    : 'Exhaustive assumption scan made no progress.';
  let shouldContinue = true;

  while (shouldContinue) {
    const queenCountBeforePass = countQueens(currentBoard);
    const queenAssumption = await queensAdminApi.runSpecificSolverRule(
      currentBoard,
      'queen-assumption-contradiction'
    );

    if (
      queenAssumption.success &&
      queenAssumption.board &&
      queenAssumption.changedCells.length > 0
    ) {
      currentBoard = queenAssumption.board;
      combinedChangedCells.push(...queenAssumption.changedCells);
      lastExplanation = queenAssumption.explanation;
      if (stopOnQueenPlacement && countQueens(currentBoard) > queenCountBeforePass) {
        shouldContinue = false;
        continue;
      }
      if (stopOnQueenPlacement) {
        shouldContinue = false;
        continue;
      }
      continue;
    }

    const flagAssumption = await queensAdminApi.runSpecificSolverRule(
      currentBoard,
      'flag-assumption-contradiction'
    );

    if (flagAssumption.success && flagAssumption.board && flagAssumption.changedCells.length > 0) {
      currentBoard = flagAssumption.board;
      combinedChangedCells.push(...flagAssumption.changedCells);
      lastExplanation = flagAssumption.explanation;
      if (stopOnQueenPlacement && countQueens(currentBoard) > queenCountBeforePass) {
        shouldContinue = false;
        continue;
      }
      if (stopOnQueenPlacement) {
        shouldContinue = false;
        continue;
      }
      continue;
    }

    shouldContinue = false;
  }

  return {
    success: combinedChangedCells.length > 0,
    action: 'run-specific-solver-rule',
    explanation: combinedChangedCells.length > 0 ? lastExplanation : lastExplanation,
    board: currentBoard,
    changedCells: combinedChangedCells,
    warnings: [],
    validation: null,
    metadata: null,
    error: null,
  };
}

function incrementStepUsage(stepId: SolverMetricId): void {
  solverUsageCounts.value = {
    ...solverUsageCounts.value,
    [stepId]: (solverUsageCounts.value[stepId] ?? 0) + 1,
  };
}

function shouldAutoRunSingleColor(
  actionKey: string,
  beforeBoard: QueensAdminBoardState,
  result: QueensAdminOperationResult
): result is QueensAdminOperationResult & { board: QueensAdminBoardState } {
  return (
    autoRunSingleColorAfterSolverAction.value &&
    !actionKey.startsWith('single-color') &&
    result.success &&
    !!result.board &&
    countFlags(result.board) > countFlags(beforeBoard)
  );
}

async function runSingleColorFollowUp(
  board: QueensAdminBoardState
): Promise<QueensAdminBoardState> {
  appendLog('Auto Follow-Up', 'Running single-color queen after the previous solver action.');

  const result = await queensAdminApi.runSingleColorGroupSolverRule(board);
  appendLog(
    'Auto Follow-Up',
    `${result.action}: ${result.explanation} Changed ${result.changedCells.length} cell${result.changedCells.length === 1 ? '' : 's'}.`,
    result.error
  );

  if (!result.success || !result.board || result.changedCells.length === 0) {
    return board;
  }

  applyOperationResult(result);
  incrementStepUsage('single-color');
  return result.board;
}

function resetSolverMetrics(): void {
  solverUsageCounts.value = {
    'single-color': 0,
    'row-column': 0,
    'group-confined-to-line': 0,
    'assume-progress': 0,
    'assume-exhaustive': 0,
  };
}

function countQueens(board: QueensAdminBoardState): number {
  return board.cells.flat().filter((cell) => cell.markType === 'QUEEN').length;
}

function countFlags(board: QueensAdminBoardState): number {
  return board.cells.flat().filter((cell) => cell.markType === 'FLAG').length;
}

async function pauseForCadence(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, updateCadenceMs.value));
}

function createEmptyPatternDraft(): PatternEditorDraft {
  return {
    size: 5,
    cells: [],
    outputFlags: [],
  };
}

function buildInitialStepDifficulties(
  definitions: readonly BuiltInSolverStepDefinition[],
  persistedDifficulties: Record<string, QueensAdminDifficulty> | undefined
): Record<BuiltInSolverStepId, QueensAdminDifficulty> {
  return definitions.reduce<Record<BuiltInSolverStepId, QueensAdminDifficulty>>(
    (acc, step) => {
      acc[step.id] = normalizeSolverDifficulty(persistedDifficulties?.[step.id], step.difficulty);
      return acc;
    },
    {} as Record<BuiltInSolverStepId, QueensAdminDifficulty>
  );
}

function updateBuiltInStepDifficulty(stepId: BuiltInSolverStepId, value: unknown): void {
  builtInStepDifficulties.value = {
    ...builtInStepDifficulties.value,
    [stepId]: normalizeSolverDifficulty(value, builtInStepDifficulties.value[stepId]),
  };
}

async function updatePatternDifficulty(patternId: string, value: unknown): Promise<void> {
  const existingPattern = savedPatterns.value.find((pattern) => pattern.id === patternId);
  if (!existingPattern) return;

  const nextPattern = {
    ...existingPattern,
    difficulty: normalizeSolverDifficulty(value, existingPattern.difficulty),
  };

  try {
    const savedPattern = await queensAdminApi.updateSolverPattern(nextPattern);
    savedPatterns.value = savedPatterns.value
      .map((pattern) => (pattern.id === patternId ? savedPattern : pattern))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to update solver pattern difficulty.';
    appendLog('Pattern', `Updating difficulty failed for ${patternId}.`, errorMessage.value);
  }
}

async function runAllThroughDifficulty(): Promise<void> {
  if (!currentSolverBoard.value) return;

  actionLoading.value = true;
  activeAction.value = 'run-all-difficulty';
  errorMessage.value = null;

  try {
    let currentBoard = currentSolverBoard.value;
    let anyProgress = false;
    let passCount = 0;
    let shouldContinue = true;
    appendLog(
      'Service Call',
      `Calling solver service for action "run-all-difficulty" through ${formatSolverDifficulty(runAllDifficultyThreshold.value)}.`
    );

    while (shouldContinue) {
      let passProgress = false;
      passCount += 1;

      for (const step of builtInSolverRows.value) {
        if (!isDifficultyAtOrBelow(step.difficulty, runAllDifficultyThreshold.value)) continue;

        const result = await executeBuiltInStep(step.id, currentBoard);
        if (!result.success || !result.board || result.changedCells.length === 0) continue;

        passProgress = true;
        anyProgress = true;
        applyOperationResult(result);
        incrementStepUsage(step.id);
        appendLog(
          'Service Result',
          `${result.action}: ${result.explanation} Changed ${result.changedCells.length} cell${result.changedCells.length === 1 ? '' : 's'}.`,
          result.error
        );

        const boardBeforeFollowUp = currentBoard;
        currentBoard = result.board;
        if (shouldAutoRunSingleColor(step.id, boardBeforeFollowUp, result)) {
          currentBoard = await runSingleColorFollowUp(currentBoard);
        }
        await pauseForCadence();
      }

      for (const pattern of savedPatterns.value) {
        if (!pattern.enabled) continue;
        if (!isDifficultyAtOrBelow(pattern.difficulty, runAllDifficultyThreshold.value)) continue;

        const result = await queensAdminApi.runSolverPattern(currentBoard, pattern);
        if (!result.success || !result.board || result.changedCells.length === 0) continue;

        passProgress = true;
        anyProgress = true;
        applyOperationResult(result);
        incrementStepUsage(`pattern:${pattern.id}`);
        appendLog(
          'Service Result',
          `${result.action}: ${result.explanation} Changed ${result.changedCells.length} cell${result.changedCells.length === 1 ? '' : 's'}.`,
          result.error
        );

        const boardBeforeFollowUp = currentBoard;
        currentBoard = result.board;
        if (shouldAutoRunSingleColor(`pattern:${pattern.id}`, boardBeforeFollowUp, result)) {
          currentBoard = await runSingleColorFollowUp(currentBoard);
        }
        await pauseForCadence();
      }

      if (!passProgress) {
        shouldContinue = false;
      }
    }

    statusMessage.value = anyProgress
      ? `Ran all solver items through ${formatSolverDifficulty(runAllDifficultyThreshold.value)} for ${passCount - 1} pass${passCount - 1 === 1 ? '' : 'es'} until no more progress was made.`
      : `No solver items through ${formatSolverDifficulty(runAllDifficultyThreshold.value)} made progress.`;
    appendLog(
      'Service Result',
      anyProgress
        ? `Run-all-through-difficulty finished after ${passCount - 1} pass${passCount - 1 === 1 ? '' : 'es'}.`
        : 'Run-all-through-difficulty made no progress on the first pass.'
    );
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Run-all-through-difficulty failed.';
    appendLog('Service Error', 'Solver action "run-all-difficulty" failed.', errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

function restorePersistedSolverSession(): void {
  if (!persistedSolverSession) return;

  solverSelection.value = persistedSolverSession.selection;
  queensStore.hydrateFromAdminBoard(persistedSolverSession.currentBoard, {
    showSolutionQueens: false,
    resetHistory: true,
  });
}

function persistSolverSession(boardState: QueensAdminBoardState): void {
  if (!solverSelection.value) return;

  saveQueensAdminSolverSession({
    selection: solverSelection.value,
    currentBoard: boardState,
  });
}

function appendLog(title: string, detail: string, error?: string | null): void {
  solverLogEntries.value = [
    ...solverLogEntries.value,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toLocaleTimeString(),
      title,
      detail,
      error: error ?? null,
    },
  ];
}

function formatBoardForClipboard(board: QueensAdminBoardState | null): string {
  if (!board) return 'No board loaded.';

  const rows = board.cells.map((row) =>
    row
      .map((cell) => {
        if (cell.markType === 'QUEEN') return 'Q';
        if (cell.markType === 'FLAG') return 'F';
        return '.';
      })
      .join(' ')
  );

  const colors = board.cells.map((row) => row.map((cell) => cell.groupColor ?? '-').join(' '));

  return [
    `Board ${board.size}x${board.size}`,
    'Marks:',
    ...rows,
    '',
    'Groups:',
    ...colors,
    '',
    'Raw JSON:',
    JSON.stringify(board, null, 2),
  ].join('\n');
}

function formatLogsForClipboard(entries: SolverLogEntry[]): string {
  if (entries.length === 0) return 'No solver log entries.';
  return entries
    .map((entry) =>
      [
        `[${entry.timestamp}] ${entry.title}`,
        entry.detail,
        entry.error ? `Error: ${entry.error}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');
}

async function copyToClipboard(text: string, successDetail: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    statusMessage.value = successDetail;
    appendLog('Clipboard', successDetail);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clipboard write failed.';
    errorMessage.value = message;
    appendLog('Clipboard', 'Clipboard export failed.', message);
  }
}

async function copyCurrentBoard(): Promise<void> {
  await copyToClipboard(
    formatBoardForClipboard(currentSolverBoard.value),
    'Copied the current board.'
  );
}

async function copyAllLogs(): Promise<void> {
  await copyToClipboard(formatLogsForClipboard(solverLogEntries.value), 'Copied all solver logs.');
}

async function copyDifficultyOverview(): Promise<void> {
  await copyToClipboard(
    difficultyOverviewClipboardText.value,
    'Copied the solver difficulty overview.'
  );
}

async function copyLastFiftyLogLinesAndBoard(): Promise<void> {
  const payload = [
    'Recent Solver Log:',
    formatLogsForClipboard(solverLogEntries.value.slice(-50)),
    '',
    'Current Board:',
    formatBoardForClipboard(currentSolverBoard.value),
  ].join('\n');

  await copyToClipboard(payload, 'Copied the last 50 log entries and current board.');
}

function normalizeSolverPattern(input: unknown, fallbackId: string): QueensAdminSolverPattern {
  const value = input as Partial<QueensAdminSolverPattern>;
  const size = Math.min(9, Math.max(3, Number(value.size ?? 5)));
  const id = typeof value.id === 'string' && value.id.trim().length > 0 ? value.id : fallbackId;
  const name = typeof value.name === 'string' && value.name.trim().length > 0 ? value.name : id;

  const cells = Array.isArray(value.cells)
    ? value.cells
        .filter((cell) => cell && typeof cell.row === 'number' && typeof cell.col === 'number')
        .map((cell) => ({
          row: cell.row,
          col: cell.col,
          activeSquare: cell.activeSquare === true,
        }))
        .filter((cell) => cell.activeSquare === true)
    : [];

  const outputFlags = Array.isArray(value.outputFlags)
    ? value.outputFlags
        .filter((flag) => flag && typeof flag.row === 'number' && typeof flag.col === 'number')
        .map((flag) => ({ row: flag.row, col: flag.col }))
    : [];

  return {
    id,
    name,
    size,
    cells,
    outputFlags,
    difficulty: normalizeSolverDifficulty(value.difficulty, 'medium'),
    enabled: value.enabled ?? true,
    sortOrder:
      typeof value.sortOrder === 'number' && Number.isFinite(value.sortOrder) ? value.sortOrder : 0,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  };
}

function nextPatternId(existingPatterns: QueensAdminSolverPattern[]): string {
  let nextId = existingPatterns.length + 1;
  while (existingPatterns.some((pattern) => pattern.id === `solver-pattern-${nextId}`)) {
    nextId += 1;
  }
  return `solver-pattern-${nextId}`;
}

function nextPatternSortOrder(existingPatterns: QueensAdminSolverPattern[]): number {
  const maxSortOrder = existingPatterns.reduce(
    (currentMax, pattern) => Math.max(currentMax, pattern.sortOrder),
    90
  );
  return maxSortOrder + 10;
}

function handleUndo(): void {
  queensStore.handleUndo();
  appendLog('Solver Board', 'Undid the last solver board change.');
}

function handleClear(): void {
  queensStore.clearAdminMarks();
  appendLog('Solver Board', 'Cleared all visible queens and flags from the solver board.');
}
</script>
