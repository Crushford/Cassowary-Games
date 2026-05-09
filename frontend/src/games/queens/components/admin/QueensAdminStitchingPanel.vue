<template>
  <section class="space-y-6">
    <AdminPanel
      title="Vertical Stitching Preview"
      description="Generate three 7x7 Queens chunks stitched downward into one 21x7 preview board. This is a static admin prototype: no scrolling, catalog lookup, persistence, or gameplay store cloning."
    >
      <template #badge>
        <Tag
          :severity="loading ? 'info' : preview ? 'success' : 'warn'"
          :value="loading ? 'Generating...' : preview ? 'Vertical 3-piece' : 'Pending'"
          rounded
        />
      </template>
      <template #actions>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-xl border border-semantic-success-700 bg-feedback-successSoft px-3 py-2 text-sm font-semibold text-semantic-success-100 transition hover:opacity-90 disabled:opacity-50"
            :disabled="loading"
            @click="startGeneration"
          >
            {{ loading ? 'Starting generation...' : 'Start Generating' }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-semantic-error-700 bg-feedback-errorSoft px-3 py-2 text-sm font-semibold text-semantic-error-100 transition hover:opacity-90 disabled:opacity-50"
            :disabled="!loading"
            @click="stopGeneration()"
          >
            Stop Generation
          </button>
        </div>
      </template>

      <div class="grid gap-3 md:grid-cols-4">
        <AdminStat label="Chunk size" value="7 x 7" detail="fixed prototype input" />
        <AdminStat label="Final board" :value="stitchedSizeLabel" detail="height x width" />
        <AdminStat
          label="Distance"
          :value="String(preview?.orthogonalMinDistance ?? 5)"
          detail="orthogonal minimum"
        />
        <AdminStat
          label="Chunks"
          :value="String(preview?.chunks.length ?? 0)"
          detail="stitched vertically"
        />
      </div>

      <AdminMessage v-if="errorMessage" severity="error" class="mt-5">
        {{ errorMessage }}
      </AdminMessage>
    </AdminPanel>

    <AdminPanel
      title="Generation Logs"
      description="Click the log container to copy the full frontend generation log for debugging."
    >
      <template #actions>
        <span
          class="rounded-full bg-surface-darkSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-300"
        >
          {{ copiedLogs ? 'Copied' : `${generationLogs.length} entries` }}
        </span>
      </template>
      <button
        type="button"
        class="block max-h-72 w-full overflow-auto rounded-2xl border border-semantic-neutral-800 bg-semantic-neutral-950/80 p-4 text-left font-mono text-xs leading-5 text-semantic-neutral-300 transition hover:border-semantic-info-700"
        @click="copyLogs"
      >
        <pre class="whitespace-pre-wrap break-words">{{ logText }}</pre>
      </button>
    </AdminPanel>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <AdminPanel
        title="Playable 21 x 7 Board"
        description="A cloned Queens board renderer and isolated scrolling Queens store render the three chunks as one continuous 21x7 puzzle."
      >
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full bg-surface-darkSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-neutral-300"
            >
              {{
                preview
                  ? `${scrollingStore.rowCount} rows x ${scrollingStore.colCount} cols`
                  : 'No board'
              }}
            </span>
            <span
              v-if="scrollingStore.isComplete"
              class="rounded-full bg-feedback-successSoft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-semantic-success-100"
            >
              Complete
            </span>
          </div>
        </template>

        <div
          v-if="!preview"
          class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-6 text-sm text-semantic-neutral-400"
        >
          Click Start Generating to create a playable stitched board.
        </div>
        <div v-else class="space-y-4">
          <AdminMessage v-if="scrollingStore.errorMessage" severity="error">
            {{ scrollingStore.errorMessage }}
          </AdminMessage>
          <AdminMessage v-else-if="scrollingStore.hintMessage" severity="info">
            {{ scrollingStore.hintMessage }}
          </AdminMessage>
          <AdminMessage v-else-if="scrollingStore.isComplete" severity="success">
            Puzzle complete.
          </AdminMessage>

          <ScrollingQueensPuzzleBoard
            :board="scrollingBoardAdapter"
            interactive
            aria-label="Vertical stitched Queens puzzle grid"
          />

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="mode in placementModes"
              :key="mode.value"
              type="button"
              class="rounded-xl border px-3 py-2 text-sm font-semibold transition"
              :class="
                scrollingStore.uiState.placementMode === mode.value
                  ? 'border-semantic-info-500 bg-feedback-infoFaint text-semantic-info-100'
                  : 'border-semantic-neutral-700 bg-surface-darkSoft text-semantic-neutral-200 hover:border-semantic-neutral-500 hover:text-white'
              "
              @click="scrollingStore.setPlacementMode(mode.value)"
            >
              {{ mode.label }}
            </button>

            <button
              type="button"
              class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
              @click="scrollingStore.setAutoFlagging(!scrollingStore.uiState.autoFlagging)"
            >
              Auto-flag {{ scrollingStore.uiState.autoFlagging ? 'On' : 'Off' }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-semantic-neutral-700 bg-surface-darkSoft px-3 py-2 text-sm font-semibold text-semantic-neutral-200 transition hover:border-semantic-neutral-500 hover:text-white"
              @click="scrollingStore.toggleSolution()"
            >
              {{ scrollingStore.showSolution ? 'Hide Solution' : 'Show Solution' }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-semantic-info-700 bg-semantic-info-900 px-3 py-2 text-sm font-semibold text-semantic-info-100 transition hover:bg-semantic-info-800"
              @click="scrollingStore.requestHint()"
            >
              Hint First 10
            </button>
            <button
              type="button"
              class="rounded-xl border border-semantic-warning-700 bg-semantic-warning-900 px-3 py-2 text-sm font-semibold text-semantic-warning-100 transition hover:bg-semantic-warning-800 disabled:opacity-50"
              :disabled="scrollingStore.moveHistory.length === 0"
              @click="scrollingStore.handleUndo()"
            >
              Undo
            </button>
            <button
              type="button"
              class="rounded-xl border border-semantic-danger-800 bg-semantic-danger-900 px-3 py-2 text-sm font-semibold text-semantic-danger-100 transition hover:bg-semantic-danger-800"
              @click="scrollingStore.clearAll()"
            >
              Clear
            </button>
          </div>

          <div class="grid gap-3 md:grid-cols-4">
            <AdminStat
              label="Queens"
              :value="`${scrollingStore.queenCount} / ${scrollingStore.targetQueenCount}`"
              detail="placed / target"
            />
            <AdminStat
              label="Flags"
              :value="String(scrollingStore.flagCount)"
              detail="player + auto"
            />
            <AdminStat
              label="Rows"
              :value="String(scrollingStore.rowCount)"
              detail="rectangular board"
            />
            <AdminStat
              label="Columns"
              :value="String(scrollingStore.colCount)"
              detail="rectangular board"
            />
          </div>
        </div>
      </AdminPanel>

      <section class="space-y-6">
        <AdminPanel title="Seam Debug" description="Signatures used for each downward stitch.">
          <div v-if="!preview" class="text-sm text-semantic-neutral-400">
            Click Start Generating to inspect seam signatures.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="seam in preview.seams"
              :key="`${seam.fromChunkIndex}-${seam.toChunkIndex}`"
              class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4 text-sm text-semantic-neutral-300"
            >
              <div class="font-semibold text-white">
                Chunk {{ seam.fromChunkIndex + 1 }} -> Chunk {{ seam.toChunkIndex + 1 }}
              </div>
              <div class="mt-3 grid gap-2 text-xs">
                <div>
                  <span class="text-semantic-neutral-500">Bottom bleed:</span>
                  <code class="ml-2 text-semantic-info-100"
                    >[{{ seam.bottomSignature.join(', ') }}]</code
                  >
                </div>
                <div>
                  <span class="text-semantic-neutral-500">Next top:</span>
                  <code class="ml-2 text-semantic-info-100"
                    >[{{ seam.topSignature.join(', ') }}]</code
                  >
                </div>
                <div>
                  <span class="text-semantic-neutral-500">Match:</span>
                  <span
                    :class="
                      signaturesMatch(seam)
                        ? 'text-semantic-success-200'
                        : 'text-semantic-error-200'
                    "
                  >
                    {{ signaturesMatch(seam) ? 'yes' : 'no' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Chunk Summary" description="Per-piece generation details.">
          <div v-if="!preview" class="text-sm text-semantic-neutral-400">
            No chunks loaded yet. Click Start Generating to create a preview.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(chunk, index) in preview.chunks"
              :key="chunk.pieceKind"
              class="rounded-2xl border border-semantic-neutral-800 bg-surface-darkSoft p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-white">Chunk {{ index + 1 }}</div>
                  <div class="mt-1 text-xs text-semantic-neutral-400">{{ chunk.pieceKind }}</div>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  :class="
                    chunk.queenCount >= chunk.targetQueenCount
                      ? 'bg-feedback-successSoft text-semantic-success-100'
                      : 'bg-feedback-errorSoft text-semantic-error-100'
                  "
                >
                  {{ chunk.queenCount }} / {{ chunk.targetQueenCount }} queens
                </span>
              </div>
              <div class="mt-3 grid gap-2 text-xs text-semantic-neutral-300">
                <div>Blackout cells: {{ chunk.blackoutCellCount }}</div>
                <div>
                  Left signature:
                  <code class="text-semantic-info-100"
                    >[{{ chunk.leftBlackoutSignature.join(', ') }}]</code
                  >
                </div>
                <div>
                  Top signature:
                  <code class="text-semantic-info-100"
                    >[{{ chunk.topBlackoutSignature.join(', ') }}]</code
                  >
                </div>
              </div>
              <ChunkBoard class="mt-4" :rows="chunk.board.cells" :columns="chunk.board.width" />
            </div>
          </div>
        </AdminPanel>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  defineComponent,
  h,
  onUnmounted,
  ref,
  type PropType,
} from 'vue';
import Tag from 'primevue/tag';
import { queensAdminApi } from '../../admin/api';
import {
  useScrollingQueensStore,
  type ScrollingQueensPlacementMode,
} from '../../stores/scrollingQueensStore';
import { buildScrollingPuzzleBoardAdapter } from '../queens/puzzleBoardAdapters';
import type {
  QueensAdminStitchingCell,
  QueensAdminStitchingPreview,
  QueensAdminVerticalStitchingSeam,
} from '../../admin/types';
import AdminMessage from './AdminMessage.vue';
import AdminPanel from './AdminPanel.vue';
import AdminStat from './AdminStat.vue';

const ScrollingQueensPuzzleBoard = defineAsyncComponent(
  () => import('../queens/ScrollingQueensPuzzleBoard.vue')
);

const paletteByPrefix: Record<string, string[]> = {
  V1: [
    'bg-sky-950/90 text-sky-100 border-sky-700/70',
    'bg-cyan-950/90 text-cyan-100 border-cyan-700/70',
    'bg-blue-900/80 text-blue-100 border-blue-700/70',
    'bg-indigo-950/90 text-indigo-100 border-indigo-700/70',
    'bg-teal-950/90 text-teal-100 border-teal-700/70',
    'bg-sky-900/80 text-sky-100 border-sky-600/70',
    'bg-blue-950/90 text-blue-100 border-blue-800/70',
  ],
  V2: [
    'bg-fuchsia-950/90 text-fuchsia-100 border-fuchsia-700/70',
    'bg-pink-950/90 text-pink-100 border-pink-700/70',
    'bg-purple-950/90 text-purple-100 border-purple-700/70',
    'bg-violet-950/90 text-violet-100 border-violet-700/70',
    'bg-slate-800/90 text-slate-100 border-slate-600/70',
    'bg-stone-800/90 text-stone-100 border-stone-600/70',
    'bg-zinc-800/90 text-zinc-100 border-zinc-600/70',
  ],
  V3: [
    'bg-emerald-900/80 text-emerald-100 border-emerald-600/70',
    'bg-green-950/90 text-green-100 border-green-700/70',
    'bg-teal-900/80 text-teal-100 border-teal-600/70',
    'bg-cyan-900/80 text-cyan-100 border-cyan-600/70',
    'bg-lime-900/80 text-lime-100 border-lime-700/70',
    'bg-orange-900/80 text-orange-100 border-orange-600/70',
    'bg-amber-900/80 text-amber-100 border-amber-700/70',
  ],
};

function paletteClass(cell: QueensAdminStitchingCell): string {
  if (cell.state === 'blackout') return 'bg-neutral-950 text-neutral-500 border-neutral-700';
  const prefix = cell.groupId?.slice(0, 2) ?? 'V1';
  const palette = paletteByPrefix[prefix] ?? paletteByPrefix.V1;
  return palette[(cell.groupSlot ?? 0) % palette.length];
}

const ChunkBoard = defineComponent({
  name: 'ChunkBoard',
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
        { class: 'rounded-2xl border border-semantic-neutral-800 bg-semantic-neutral-950/60 p-3' },
        [
          h(
            'div',
            {
              class: 'grid gap-1',
              style: { gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` },
            },
            props.rows.flatMap((row, rowIndex) =>
              row.map((cell, colIndex) =>
                h(
                  'div',
                  {
                    key: `${rowIndex}-${colIndex}`,
                    class: [
                      'aspect-square rounded-md border text-[10px] font-semibold flex items-center justify-center',
                      paletteClass(cell),
                      cell.state === 'join-fill' ? 'ring-1 ring-white/30' : '',
                    ],
                    title: `row ${rowIndex + 1}, col ${colIndex + 1}`,
                  },
                  cell.state === 'queen'
                    ? 'Q'
                    : cell.state === 'blackout'
                      ? '#'
                      : cell.state === 'join-fill'
                        ? '+'
                        : ''
                )
              )
            )
          ),
        ]
      );
  },
});

const preview = ref<QueensAdminStitchingPreview | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const generationLogs = ref<string[]>([]);
const copiedLogs = ref(false);
const scrollingStore = useScrollingQueensStore();
let generationAbortController: AbortController | null = null;
let generationTimeoutHandle: number | null = null;

const GENERATION_TIMEOUT_MS = 60_000;
const placementModes: Array<{ value: ScrollingQueensPlacementMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'flag', label: 'Flag' },
  { value: 'queen', label: 'Queen' },
];

const stitchedSizeLabel = computed(() => {
  if (!preview.value) return '21 x 7';
  return `${preview.value.stitchedBoard.height} x ${preview.value.stitchedBoard.width}`;
});

const logText = computed(() =>
  generationLogs.value.length > 0
    ? generationLogs.value.join('\n')
    : 'No generation logs yet. Click Start Generating to begin.'
);

const scrollingBoardAdapter = computed(() => buildScrollingPuzzleBoardAdapter(scrollingStore));

function signaturesMatch(seam: QueensAdminVerticalStitchingSeam): boolean {
  return seam.bottomSignature.join(',') === seam.topSignature.join(',');
}

function appendLog(message: string, details?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  generationLogs.value = [...generationLogs.value, `[${timestamp}] ${message}${payload}`];
}

function clearGenerationTimeout(): void {
  if (generationTimeoutHandle !== null) {
    window.clearTimeout(generationTimeoutHandle);
    generationTimeoutHandle = null;
  }
}

function stopGeneration(reason = 'Stopped by user'): void {
  if (!generationAbortController) return;
  appendLog('Generation abort requested', { reason });
  generationAbortController.abort();
  clearGenerationTimeout();
}

async function startGeneration(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = null;
  preview.value = null;
  generationLogs.value = [];
  copiedLogs.value = false;
  generationAbortController = new AbortController();
  appendLog('Generation started', { timeoutMs: GENERATION_TIMEOUT_MS });

  generationTimeoutHandle = window.setTimeout(() => {
    appendLog('Generation timed out; aborting request', { timeoutMs: GENERATION_TIMEOUT_MS });
    stopGeneration('Timed out after 60 seconds');
  }, GENERATION_TIMEOUT_MS);

  try {
    preview.value = await queensAdminApi.getStitchingPreview(generationAbortController.signal);
    scrollingStore.hydrateFromVerticalPreview(preview.value);
    appendLog('Generation completed', {
      chunks: preview.value.chunks.length,
      rows: preview.value.stitchedBoard.height,
      columns: preview.value.stitchedBoard.width,
      seams: preview.value.seams.map((seam) => ({
        from: seam.fromChunkIndex + 1,
        to: seam.toChunkIndex + 1,
        bottomSignature: seam.bottomSignature,
        topSignature: seam.topSignature,
      })),
    });
  } catch (error) {
    const aborted =
      error instanceof DOMException
        ? error.name === 'AbortError'
        : error instanceof Error && error.name === 'AbortError';
    errorMessage.value = aborted
      ? 'Generation was stopped before completion.'
      : error instanceof Error
        ? error.message
        : 'Failed to generate the vertical stitching preview';
    appendLog(aborted ? 'Generation stopped' : 'Generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    preview.value = null;
  } finally {
    clearGenerationTimeout();
    generationAbortController = null;
    loading.value = false;
    appendLog('Generation request finished');
  }
}

async function copyLogs(): Promise<void> {
  try {
    await navigator.clipboard.writeText(logText.value);
    copiedLogs.value = true;
    window.setTimeout(() => {
      copiedLogs.value = false;
    }, 1500);
  } catch (error) {
    appendLog('Failed to copy logs', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

onUnmounted(() => {
  stopGeneration('Page unmounted');
  clearGenerationTimeout();
});
</script>
