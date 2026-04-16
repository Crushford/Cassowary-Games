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
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, type PropType } from 'vue';
import Tag from 'primevue/tag';
import { queensAdminApi } from '../../admin/api';
import type {
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
const showQueens = ref(true);
const playMarks = ref<Record<string, 'queen' | 'flag'>>({});

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
});
</script>
