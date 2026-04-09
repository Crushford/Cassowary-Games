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

        <div class="mt-4 grid gap-2">
          <Button
            label="Place Single Color Queen"
            :disabled="!currentSolverBoard || actionLoading"
            :loading="actionLoading && activeAction === 'single-color'"
            @click="runSingleColorCandidateRule"
          />
          <Button
            label="Run Row / Column Constraints"
            :disabled="!currentSolverBoard || actionLoading"
            :loading="actionLoading && activeAction === 'row-column'"
            @click="runRowColumnConstraintRule"
          />
          <Button
            label="Assume Queen Until Progress"
            :disabled="!currentSolverBoard || actionLoading"
            :loading="actionLoading && activeAction === 'assume-progress'"
            @click="runAssumeQueenUntilProgress"
          />
          <Button
            label="Assume Queen Exhaustive"
            :disabled="!currentSolverBoard || actionLoading"
            :loading="actionLoading && activeAction === 'assume-exhaustive'"
            @click="runAssumeQueenExhaustive"
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
      </section>

      <section class="rounded-[26px] border border-semantic-neutral-800 bg-surface-overlayDim p-4">
        <h2 class="text-lg font-semibold text-white">Difficulty</h2>
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
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div
            v-for="step in solverStepUsageRows"
            :key="step.id"
            class="flex items-center justify-between rounded-xl bg-surface-darkMuted px-3 py-2"
          >
            <div>
              <div class="text-sm font-semibold text-white">{{ step.label }}</div>
              <div class="text-xs text-semantic-neutral-400">Difficulty {{ step.difficulty }}</div>
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
              class="rounded-full border border-semantic-neutral-700 bg-semantic-neutral-950 px-4 py-2 text-xs uppercase tracking-[0.22em] text-semantic-neutral-300"
            >
              {{ solverPuzzleMetaLabel }}
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
        description="Patterns will stay in local storage, but every run/edit action will still round-trip through the backend with the current puzzle and selected pattern payload."
        content-class="mt-0"
      >
        <template #badge>
          <Tag severity="info" value="Local + API" rounded />
        </template>

        <div class="flex flex-wrap gap-3">
          <Button label="New Pattern" :disabled="actionLoading" @click="startNewPattern" />
        </div>

        <div
          v-if="showPatternEditor"
          class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
        >
          <SharedPatternDesigner
            v-model="patternDraft"
            :title="editingPatternId ? 'Edit Pattern' : 'Create Pattern'"
            :description="
              editingPatternId
                ? 'Adjust the selected pattern and save it back to local storage.'
                : 'Create a new solver pattern and save it to local storage.'
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
          v-if="savedPatterns.length === 0"
          class="mt-4 rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4 text-sm text-semantic-neutral-300"
        >
          No solver patterns saved yet.
        </div>

        <div v-else class="mt-4 space-y-3">
          <div
            v-for="pattern in savedPatterns"
            :key="pattern.id"
            class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
          >
            <div class="flex items-start gap-4">
              <SharedPatternPreview
                :size="pattern.size"
                :cells="pattern.cells"
                :output-flags="pattern.outputFlags"
                cell-size-class="h-8 w-8"
              />

              <div class="flex-1 space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm text-semantic-neutral-300">
                    {{ pattern.size }}x{{ pattern.size }} pattern
                  </div>
                  <Tag
                    severity="secondary"
                    :value="`${pattern.outputFlags.length} flags`"
                    rounded
                  />
                </div>

                <div class="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    label="Run Pattern"
                    :disabled="!currentSolverBoard || actionLoading"
                    :loading="actionLoading && activeAction === `pattern-${pattern.id}`"
                    @click="runPatternOnce(pattern)"
                  />
                  <Button
                    size="small"
                    label="Run Until No Flags"
                    outlined
                    :disabled="!currentSolverBoard || actionLoading"
                    :loading="actionLoading && activeAction === `pattern-loop-${pattern.id}`"
                    @click="runPatternUntilNoFlags(pattern)"
                  />
                  <Button
                    size="small"
                    label="Edit"
                    outlined
                    severity="secondary"
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
import Slider from 'primevue/slider';
import Tag from 'primevue/tag';
import AdminMessage from './AdminMessage.vue';
import AdminPanel from './AdminPanel.vue';
import SharedPatternDesigner from '../queens/SharedPatternDesigner.vue';
import SharedPatternPreview from '../queens/SharedPatternPreview.vue';
import { useQueensStore } from '../../stores/queensStore';
import { assignRegionPaletteColors } from '../../utils/regionDisplay';
import { queensAdminApi } from '../../admin/api';
import type {
  QueensAdminBoardState,
  QueensAdminCatalogPuzzleSelection,
  QueensAdminOperationResult,
  QueensAdminPuzzleCatalogGroup,
  QueensAdminSolverPattern,
} from '../../admin/types';
import type { PatternEditorDraft } from '../queens/patternEditorTypes';
import { PATTERN_CARD_DEFINITIONS } from '../../utils/incrementalPatternCards';

const QueensPuzzleBoard = defineAsyncComponent(() => import('../queens/QueensPuzzleBoard.vue'));

const SOLVER_PATTERN_STORAGE_KEY = 'queens-admin-solver-patterns-v1';

const SOLVER_STEPS = [
  { id: 'single-color', label: 'Single Color Candidate', difficulty: 0 },
  { id: 'pattern', label: 'Pattern Match', difficulty: 1 },
  { id: 'row-column', label: 'Row / Column Constraints', difficulty: 2 },
  { id: 'assume-progress', label: 'Assume Queen Until Progress', difficulty: 2 },
  { id: 'assume-exhaustive', label: 'Assume Queen Exhaustive', difficulty: 2 },
] as const;

type SolverStepId = (typeof SOLVER_STEPS)[number]['id'];

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
const selectedSize = ref<'any' | number>('any');
const selectedDistance = ref<'any' | number>('any');
const selectedMinimumGroupSize = ref<'any' | number>('any');
const selectedQueenCount = ref<'any' | number>('any');
const solverUsageCounts = ref<Record<SolverStepId, number>>({
  'single-color': 0,
  pattern: 0,
  'row-column': 0,
  'assume-progress': 0,
  'assume-exhaustive': 0,
});
const savedPatterns = ref<QueensAdminSolverPattern[]>(loadInitialPatterns());
const showPatternEditor = ref(false);
const editingPatternId = ref<string | null>(null);
const patternDraft = ref<PatternEditorDraft>(createEmptyPatternDraft());
const solverLogEntries = ref<SolverLogEntry[]>([]);
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

const totalStepUses = computed(() =>
  Object.values(solverUsageCounts.value).reduce((total, count) => total + count, 0)
);

const hardestDifficultyUsed = computed(() => {
  const usedSteps = SOLVER_STEPS.filter((step) => solverUsageCounts.value[step.id] > 0);
  if (usedSteps.length === 0) return 'None';
  return String(Math.max(...usedSteps.map((step) => step.difficulty)));
});

const solverStepUsageRows = computed(() =>
  SOLVER_STEPS.map((step) => ({
    ...step,
    count: solverUsageCounts.value[step.id],
  }))
);

const logEntriesForDisplay = computed(() => solverLogEntries.value.slice(-50).reverse());

const currentSolverBoard = computed<QueensAdminBoardState | null>(() =>
  solverSelection.value ? queensStore.exportAdminBoardState() : null
);

const solverPuzzleMetaLabel = computed(() => {
  if (!solverSelection.value) return 'No Puzzle Loaded';
  return `${solverSelection.value.size}x${solverSelection.value.size} · d${solverSelection.value.orthogonalMinDistance} · q${solverSelection.value.targetQueenCount} · g${solverSelection.value.minimumGroupSize}`;
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

void loadCatalogGroups();

async function loadCatalogGroups(): Promise<void> {
  const stats = await queensAdminApi.getPuzzleCatalogStats();
  catalogGroups.value = stats.groups;
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
  statusMessage.value = 'Reset solver marks for the loaded puzzle.';
  errorMessage.value = null;
  appendLog('Solver Board', 'Reset visible queens and flags to the clean puzzle state.');
}

async function runSingleColorCandidateRule(): Promise<void> {
  const board = currentSolverBoard.value;
  if (!board) return;
  await runBackendAction('single-color', () => queensAdminApi.runSingleColorGroupSolverRule(board));
}

async function runRowColumnConstraintRule(): Promise<void> {
  const board = currentSolverBoard.value;
  if (!board) return;
  await runBackendAction('row-column', () =>
    queensAdminApi.runSpecificSolverRule(board, 'constrained-lines')
  );
}

async function runAssumeQueenUntilProgress(): Promise<void> {
  await runAssumptionLoop(true);
}

async function runAssumeQueenExhaustive(): Promise<void> {
  await runAssumptionLoop(false);
}

async function runPatternOnce(pattern: QueensAdminSolverPattern): Promise<void> {
  const board = currentSolverBoard.value;
  if (!board) return;
  await runBackendAction(
    `pattern-${pattern.id}`,
    () => queensAdminApi.runSolverPattern(board, pattern),
    'pattern'
  );
}

async function runPatternUntilNoFlags(pattern: QueensAdminSolverPattern): Promise<void> {
  if (!currentSolverBoard.value) return;

  actionLoading.value = true;
  activeAction.value = `pattern-loop-${pattern.id}`;
  errorMessage.value = null;

  try {
    let currentBoard = currentSolverBoard.value;
    let progressMade = false;
    let shouldContinue = true;
    appendLog('Pattern', `Started run-until-no-flags for pattern ${pattern.id}.`);

    while (shouldContinue) {
      const result = await queensAdminApi.runSolverPattern(currentBoard, pattern);
      if (!result.success || !result.board || result.changedCells.length === 0) {
        if (!progressMade) {
          statusMessage.value = 'The selected pattern did not place any flags.';
        }
        appendLog(
          'Pattern',
          progressMade
            ? `Pattern ${pattern.id} stopped after no further flags were placed.`
            : `Pattern ${pattern.id} placed no flags.`
        );
        shouldContinue = false;
        continue;
      }

      progressMade = true;
      applyOperationResult(result);
      incrementStepUsage('pattern');
      currentBoard = result.board;
      await pauseForCadence();
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Pattern loop failed.';
    appendLog('Pattern', `Pattern loop failed for ${pattern.id}.`, errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

function startNewPattern(): void {
  editingPatternId.value = null;
  patternDraft.value = createEmptyPatternDraft();
  showPatternEditor.value = true;
  appendLog('Pattern', 'Started creating a new local solver pattern.');
}

function editPattern(pattern: QueensAdminSolverPattern): void {
  editingPatternId.value = pattern.id;
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
  patternDraft.value = createEmptyPatternDraft();
  showPatternEditor.value = false;
  appendLog('Pattern', 'Closed the pattern editor without saving.');
}

function savePatternDraft(draft: PatternEditorDraft): void {
  const normalized = normalizeSolverPattern(
    {
      id: editingPatternId.value ?? draft.id ?? nextPatternId(savedPatterns.value),
      size: draft.size,
      cells: draft.cells,
      outputFlags: draft.outputFlags,
    },
    editingPatternId.value ?? draft.id ?? nextPatternId(savedPatterns.value)
  );

  if (editingPatternId.value) {
    savedPatterns.value = savedPatterns.value.map((pattern) =>
      pattern.id === editingPatternId.value ? normalized : pattern
    );
    statusMessage.value = 'Updated solver pattern.';
    appendLog('Pattern', `Updated local pattern ${normalized.id}.`);
  } else {
    savedPatterns.value = [...savedPatterns.value, normalized];
    statusMessage.value = 'Saved new solver pattern.';
    appendLog('Pattern', `Saved new local pattern ${normalized.id}.`);
  }

  persistPatterns(savedPatterns.value);
  cancelPatternEditing();
}

async function runBackendAction(
  actionKey: string,
  action: () => Promise<QueensAdminOperationResult>,
  usageStepId?: SolverStepId
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
    } else if (result.action === 'run-single-color-group-solver-rule' && result.success) {
      incrementStepUsage('single-color');
    }
    appendLog(
      'Service Result',
      `${result.action}: ${result.explanation} Changed ${result.changedCells.length} cell${result.changedCells.length === 1 ? '' : 's'}.`,
      result.error
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Solver request failed.';
    appendLog('Service Error', `Solver action "${actionKey}" failed.`, errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

function applyOperationResult(result: QueensAdminOperationResult): void {
  statusMessage.value = result.explanation;
  errorMessage.value = result.error;

  if (result.board) {
    queensStore.applyAdminBoardResult(result.board, {
      showSolutionQueens: false,
      saveHistory: true,
    });
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

async function runAssumptionLoop(stopOnQueenPlacement: boolean): Promise<void> {
  if (!currentSolverBoard.value) return;

  actionLoading.value = true;
  activeAction.value = stopOnQueenPlacement ? 'assume-progress' : 'assume-exhaustive';
  errorMessage.value = null;

  try {
    let currentBoard = currentSolverBoard.value;
    let progressMade = false;
    let shouldContinue = true;
    appendLog(
      'Assumption',
      stopOnQueenPlacement
        ? 'Started queen-assumption scan until a queen is placed.'
        : 'Started exhaustive queen-assumption scan.'
    );

    while (shouldContinue) {
      const beforeQueenCount = countQueens(currentBoard);
      const queenAssumption = await queensAdminApi.runSpecificSolverRule(
        currentBoard,
        'queen-assumption-contradiction'
      );

      if (queenAssumption.success && queenAssumption.board) {
        progressMade = true;
        incrementStepUsage(stopOnQueenPlacement ? 'assume-progress' : 'assume-exhaustive');
        applyOperationResult(queenAssumption);
        currentBoard = queenAssumption.board;
        if (stopOnQueenPlacement && countQueens(currentBoard) > beforeQueenCount) {
          shouldContinue = false;
          continue;
        }
        await pauseForCadence();
        continue;
      }

      const beforeFlagQueenCount = countQueens(currentBoard);
      const flagAssumption = await queensAdminApi.runSpecificSolverRule(
        currentBoard,
        'flag-assumption-contradiction'
      );

      if (flagAssumption.success && flagAssumption.board) {
        progressMade = true;
        incrementStepUsage(stopOnQueenPlacement ? 'assume-progress' : 'assume-exhaustive');
        applyOperationResult(flagAssumption);
        currentBoard = flagAssumption.board;
        if (stopOnQueenPlacement && countQueens(currentBoard) > beforeFlagQueenCount) {
          shouldContinue = false;
          continue;
        }
        await pauseForCadence();
        continue;
      }

      if (!progressMade) {
        statusMessage.value = stopOnQueenPlacement
          ? 'Assumption scan found no forced flags or queens.'
          : 'Exhaustive assumption scan made no progress.';
      }
      appendLog(
        'Assumption',
        stopOnQueenPlacement
          ? progressMade
            ? 'Stopped assumption scan after making progress.'
            : 'Assumption scan found no forced moves.'
          : progressMade
            ? 'Exhaustive assumption scan finished after checking all squares.'
            : 'Exhaustive assumption scan made no progress.'
      );
      shouldContinue = false;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Assumption solver failed.';
    appendLog('Assumption', 'Assumption solver failed.', errorMessage.value);
  } finally {
    actionLoading.value = false;
    activeAction.value = null;
  }
}

function incrementStepUsage(stepId: SolverStepId): void {
  solverUsageCounts.value = {
    ...solverUsageCounts.value,
    [stepId]: solverUsageCounts.value[stepId] + 1,
  };
}

function resetSolverMetrics(): void {
  solverUsageCounts.value = {
    'single-color': 0,
    pattern: 0,
    'row-column': 0,
    'assume-progress': 0,
    'assume-exhaustive': 0,
  };
}

function countQueens(board: QueensAdminBoardState): number {
  return board.cells.flat().filter((cell) => cell.markType === 'QUEEN').length;
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

function loadInitialPatterns(): QueensAdminSolverPattern[] {
  if (typeof window === 'undefined') {
    return seedPatterns();
  }

  try {
    const raw = window.localStorage.getItem(SOLVER_PATTERN_STORAGE_KEY);
    if (!raw) {
      const seeds = seedPatterns();
      persistPatterns(seeds);
      return seeds;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      const seeds = seedPatterns();
      persistPatterns(seeds);
      return seeds;
    }

    const normalized = parsed.map((pattern, index) =>
      normalizeSolverPattern(pattern, `solver-pattern-${index + 1}`)
    );
    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // fall through to seeds
  }

  const seeds = seedPatterns();
  persistPatterns(seeds);
  return seeds;
}

function seedPatterns(): QueensAdminSolverPattern[] {
  return PATTERN_CARD_DEFINITIONS.map((pattern) => ({
    id: pattern.id,
    size: pattern.size,
    cells: pattern.cells.map((cell) => ({ row: cell.row, col: cell.col, activeSquare: true })),
    outputFlags: pattern.outputFlags.map((flag) => ({ row: flag.row, col: flag.col })),
  }));
}

function persistPatterns(patterns: QueensAdminSolverPattern[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOLVER_PATTERN_STORAGE_KEY, JSON.stringify(patterns));
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
    size,
    cells,
    outputFlags,
  };
}

function nextPatternId(existingPatterns: QueensAdminSolverPattern[]): string {
  let nextId = existingPatterns.length + 1;
  while (existingPatterns.some((pattern) => pattern.id === `solver-pattern-${nextId}`)) {
    nextId += 1;
  }
  return `solver-pattern-${nextId}`;
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
