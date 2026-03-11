<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Queens Diversity Lab</h1>
          <p class="text-slate-300 mt-2">
            Internal tool for comparing two random puzzles and seeing exactly how the numeric
            diversity attributes differ.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <label class="text-sm text-slate-300" for="size-select">Size</label>
          <select
            id="size-select"
            v-model.number="selectedSize"
            class="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm"
          >
            <option v-for="size in sizes" :key="size" :value="size">{{ size }}x{{ size }}</option>
          </select>

          <label class="inline-flex items-center gap-2 text-sm text-slate-300">
            <input v-model="originalsOnly" type="checkbox" class="accent-cyan-400" />
            Originals Only (`-0`)
          </label>

          <button
            class="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
            @click="loadPair"
            :disabled="loading"
          >
            {{ loading ? 'Loading...' : 'Load Random Pair' }}
          </button>
        </div>
      </header>

      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-red-200"
      >
        {{ errorMessage }}
      </div>

      <section v-if="pair" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-400">Left Puzzle</p>
            <p class="font-semibold mt-1">{{ pair.left.puzzle.id }}</p>
          </div>
          <div class="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-4 text-center">
            <p class="text-xs uppercase tracking-wide text-cyan-200">Overall Distance</p>
            <p class="text-3xl font-bold text-cyan-100 mt-1">
              {{ formatNumber(pair.comparison.distance) }}
            </p>
            <p class="text-xs text-cyan-100/80 mt-1">0 = very similar, 1 = very different</p>
          </div>
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 text-right">
            <p class="text-xs uppercase tracking-wide text-slate-400">Right Puzzle</p>
            <p class="font-semibold mt-1">{{ pair.right.puzzle.id }}</p>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h2 class="font-semibold text-slate-100">{{ pair.left.puzzle.id }}</h2>
            <PuzzleBoard
              :layout="pair.left.puzzle.layout"
              :queens="pair.left.puzzle.queens"
              :size="pair.size"
            />
          </article>

          <article class="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h2 class="font-semibold text-slate-100">{{ pair.right.puzzle.id }}</h2>
            <PuzzleBoard
              :layout="pair.right.puzzle.layout"
              :queens="pair.right.puzzle.queens"
              :size="pair.size"
            />
          </article>
        </div>

        <section class="rounded-xl border border-slate-800 bg-slate-900 p-4 md:p-6">
          <h2 class="text-lg font-semibold text-slate-100">Attribute Comparison</h2>
          <p class="text-sm text-slate-300 mt-1">
            Each attribute is normalized to 0..1. Weighted Difference controls how much that
            attribute contributes to the overall distance.
          </p>

          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="text-left border-b border-slate-800">
                  <th class="py-2 pr-4 text-slate-400 font-medium">Attribute</th>
                  <th class="py-2 pr-4 text-slate-400 font-medium">Left</th>
                  <th class="py-2 pr-4 text-slate-400 font-medium">Right</th>
                  <th class="py-2 pr-4 text-slate-400 font-medium">Abs Diff</th>
                  <th class="py-2 pr-4 text-slate-400 font-medium">Weight</th>
                  <th class="py-2 text-slate-400 font-medium">Weighted Diff</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in sortedFeatureRows"
                  :key="row.key"
                  class="align-top border-b border-slate-900"
                >
                  <td class="py-3 pr-4">
                    <div class="font-medium text-slate-100">{{ row.label }}</div>
                    <div class="text-xs text-slate-400 mt-1">{{ row.meaning }}</div>
                  </td>
                  <td class="py-3 pr-4">{{ formatNumber(row.left) }}</td>
                  <td class="py-3 pr-4">{{ formatNumber(row.right) }}</td>
                  <td class="py-3 pr-4">{{ formatNumber(row.absDiff) }}</td>
                  <td class="py-3 pr-4">{{ formatNumber(row.weight) }}</td>
                  <td class="py-3 font-semibold text-cyan-200">
                    {{ formatNumber(row.weightedDiff) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue';

interface PuzzleString {
  id: string;
  layout: string;
  queens: string;
}

interface FeatureComparison {
  key: string;
  label: string;
  meaning: string;
  weight: number;
  left: number;
  right: number;
  absDiff: number;
  weightedDiff: number;
}

interface DiversityPairResponse {
  size: number;
  originalsOnly: boolean;
  comparison: {
    distance: number;
    byFeature: FeatureComparison[];
  };
  left: {
    puzzle: PuzzleString;
    features: Record<string, number>;
  };
  right: {
    puzzle: PuzzleString;
    features: Record<string, number>;
  };
}

const API_BASE = import.meta.env.VITE_PUZZLE_API_BASE || '';
const LOCAL_API_PORT_CANDIDATES = Array.from({ length: 25 }, (_, i) => 3001 + i);

const sizes = [4, 5, 6, 7, 8, 9];
const selectedSize = ref(6);
const originalsOnly = ref(true);
const loading = ref(false);
const errorMessage = ref('');
const pair = ref<DiversityPairResponse | null>(null);

const sortedFeatureRows = computed(() => {
  if (!pair.value) return [];
  return [...pair.value.comparison.byFeature].sort((a, b) => b.weightedDiff - a.weightedDiff);
});

function formatNumber(value: number): string {
  return value.toFixed(3);
}

function getSymbolColor(symbol: string): string {
  const hue = (symbol.charCodeAt(0) * 53) % 360;
  return `hsl(${hue} 65% 45%)`;
}

function getApiCandidates(): string[] {
  const discovered: string[] = [];
  if (API_BASE) {
    discovered.push(API_BASE);
  } else {
    discovered.push('');
  }
  for (const port of LOCAL_API_PORT_CANDIDATES) {
    discovered.push(`http://localhost:${port}`);
  }
  return discovered;
}

function buildPairUrl(base: string, query: string): string {
  const cleanBase = base.replace(/\/$/, '');
  if (!cleanBase) {
    return `/api/internal/diversity-pair/${selectedSize.value}${query}`;
  }
  if (cleanBase.endsWith('/api')) {
    return `${cleanBase}/internal/diversity-pair/${selectedSize.value}${query}`;
  }
  return `${cleanBase}/api/internal/diversity-pair/${selectedSize.value}${query}`;
}

async function fetchDiversityPair(query: string): Promise<DiversityPairResponse> {
  const candidates = getApiCandidates();
  let lastError: Error | null = null;

  for (const base of candidates) {
    try {
      const response = await fetch(buildPairUrl(base, query));
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue;
      }

      const data = await response.json();
      if (!response.ok) {
        if (typeof data?.error === 'string') {
          throw new Error(data.error);
        }
        throw new Error('Failed to load puzzle pair');
      }

      if (data?.left?.puzzle?.id && data?.right?.puzzle?.id) {
        return data as DiversityPairResponse;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Request failed');
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('No backend API instance found on localhost ports 3001-3025.');
}

async function loadPair(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    const query = originalsOnly.value ? '?originalsOnly=1' : '?originalsOnly=0';
    pair.value = await fetchDiversityPair(query);
  } catch (error) {
    console.error(error);
    pair.value = null;
    if (error instanceof TypeError) {
      errorMessage.value =
        'Could not reach backend API. Start backend with: `cd backend && yarn server`.';
    } else {
      errorMessage.value =
        error instanceof Error ? error.message : 'Unexpected error while loading pair';
    }
  } finally {
    loading.value = false;
  }
}

const PuzzleBoard = defineComponent({
  name: 'PuzzleBoard',
  props: {
    layout: { type: String, required: true },
    queens: { type: String, required: true },
    size: { type: Number, required: true },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'grid gap-[2px] bg-slate-950 border border-slate-800 rounded-md p-1',
          style: { gridTemplateColumns: `repeat(${props.size}, minmax(0, 1fr))` },
        },
        props.layout.split('').map((symbol, index) => {
          const hasQueen = props.queens[index] === 'Q';
          return h(
            'div',
            {
              class:
                'aspect-square relative rounded-[3px] flex items-center justify-center text-[10px] font-semibold text-slate-100',
              style: { backgroundColor: getSymbolColor(symbol) },
              title: `Cell ${index} | Region ${symbol} | ${hasQueen ? 'Queen' : 'No queen'}`,
            },
            [
              hasQueen
                ? h(
                    'span',
                    { class: 'text-white text-base drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]' },
                    'Q'
                  )
                : null,
            ]
          );
        })
      );
  },
});

onMounted(() => {
  loadPair();
});
</script>
