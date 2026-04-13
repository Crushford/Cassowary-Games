<template>
  <div class="relative w-full max-w-full aspect-square" :style="boardStyle">
    <PlayGrid
      class="relative z-10 h-full w-full"
      :store="store"
      :enable-touch="enableTouch"
      :role="role"
      :aria-label="ariaLabel"
      :aria-rowcount="store.gridSize"
      :aria-colcount="store.gridSize"
      :data-game-board="dataGameBoard"
      @swipe-start="$emit('swipe-start')"
      @swipe-end="$emit('swipe-end')"
    >
      <template #default="{ rowIndex, colIndex, store: playStore }">
        <div
          :role="interactive ? 'button' : undefined"
          :tabindex="interactive ? 0 : undefined"
          class="relative h-full w-full"
          :class="{ 'cursor-pointer': interactive }"
          @click="handleCellActivate(rowIndex as number, colIndex as number)"
          @keydown.enter.prevent="handleCellActivate(rowIndex as number, colIndex as number)"
          @keydown.space.prevent="handleCellActivate(rowIndex as number, colIndex as number)"
        >
          <QueensSquare
            :row-index="rowIndex as number"
            :col-index="colIndex as number"
            :store="playStore"
            class="h-full w-full"
            :class="{ 'pointer-events-none': interactive }"
          />

          <span
            v-if="
              showSelectedCell &&
              selectedCell?.row === (rowIndex as number) &&
              selectedCell?.col === (colIndex as number)
            "
            class="absolute bottom-2 right-2 z-30 rounded-full bg-semantic-info-500 px-2 py-0.5 text-[10px] font-semibold text-white"
          >
            {{ selectedCellLabel }}
          </span>

          <span
            v-if="changedCellSet.has(`${rowIndex as number}:${colIndex as number}`)"
            class="pointer-events-none absolute inset-0 z-20 ring-2 ring-semantic-info-300 ring-offset-2 ring-offset-semantic-neutral-950"
          />
        </div>
      </template>
    </PlayGrid>

    <svg
      v-if="hintOverlayRegions.length > 0"
      class="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
      :viewBox="`0 0 ${hintViewBoxSize} ${hintViewBoxSize}`"
      aria-hidden="true"
    >
      <g v-for="region in hintOverlayRegions" :key="region.id">
        <path
          :d="region.path"
          :fill="region.fill"
          :stroke="region.stroke"
          :stroke-width="region.strokeWidth"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { CSSProperties } from 'vue';
import { useQueensStore } from '../../stores/queensStore';

const PlayGrid = defineAsyncComponent(() => import('@/shared/components/PlayGrid.vue'));
const QueensSquare = defineAsyncComponent(() => import('./QueensSquare.vue'));

type QueensStoreInstance = ReturnType<typeof useQueensStore>;
type BoardCell = {
  row: number;
  col: number;
};

type HintOverlayKind = 'evidence' | 'output';

type HintOverlayRegion = {
  id: string;
  kind: HintOverlayKind;
  path: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

type QueensPuzzleBoardProps = {
  store: QueensStoreInstance;
  enableTouch?: boolean;
  interactive?: boolean;
  showSelectedCell?: boolean;
  selectedCell?: BoardCell | null;
  selectedCellLabel?: string;
  changedCells?: string[];
  boardStyle?: CSSProperties;
  ariaLabel?: string;
  role?: string;
  dataGameBoard?: string;
  onCellActivate?: ((row: number, col: number) => void) | null;
};

const props = withDefaults(defineProps<QueensPuzzleBoardProps>(), {
  enableTouch: false,
  interactive: false,
  showSelectedCell: false,
  selectedCell: null,
  selectedCellLabel: 'selected',
  changedCells: () => [],
  boardStyle: () => ({}),
  ariaLabel: 'Queens puzzle grid',
  role: undefined,
  dataGameBoard: undefined,
  onCellActivate: null,
});

defineEmits<{
  (e: 'swipe-start'): void;
  (e: 'swipe-end'): void;
}>();

const changedCellSet = computed(() => new Set(props.changedCells));
const hintCellSize = 100;
const hintViewBoxSize = computed(() => props.store.gridSize * hintCellSize);

const hintOverlayRegions = computed<HintOverlayRegion[]>(() => {
  const evidence = buildOverlayRegions(Array.from(props.store.hintEvidenceCellKeys), 'evidence');
  const output = buildOverlayRegions(Array.from(props.store.hintOutputCellKeys), 'output');
  return [...evidence, ...output];
});

function handleCellActivate(row: number, col: number): void {
  if (!props.interactive || !props.onCellActivate) {
    return;
  }

  props.onCellActivate(row, col);
}

function buildOverlayRegions(cellKeys: string[], kind: HintOverlayKind): HintOverlayRegion[] {
  const positions = parseCellKeys(cellKeys);
  if (positions.length === 0) return [];

  const regions = getConnectedRegions(positions);
  return regions
    .map((region, index) => buildOverlayRegion(region, kind, index))
    .filter((region): region is HintOverlayRegion => region !== null);
}

function parseCellKeys(cellKeys: string[]): BoardCell[] {
  return cellKeys
    .map((key) => {
      const [rowValue, colValue] = key.split(',').map(Number);
      if (!Number.isInteger(rowValue) || !Number.isInteger(colValue)) {
        return null;
      }
      return { row: rowValue, col: colValue };
    })
    .filter((cell): cell is BoardCell => cell !== null);
}

function getConnectedRegions(cells: BoardCell[]): BoardCell[][] {
  const unvisited = new Map(cells.map((cell) => [toCellKey(cell), cell]));
  const regions: BoardCell[][] = [];

  while (unvisited.size > 0) {
    const start = unvisited.values().next().value as BoardCell;
    const queue = [start];
    const region: BoardCell[] = [];
    unvisited.delete(toCellKey(start));

    while (queue.length > 0) {
      const cell = queue.shift() as BoardCell;
      region.push(cell);

      for (const neighbor of getNeighbors(cell)) {
        const neighborKey = toCellKey(neighbor);
        const next = unvisited.get(neighborKey);
        if (!next) continue;
        unvisited.delete(neighborKey);
        queue.push(next);
      }
    }

    regions.push(region);
  }

  return regions;
}

function getNeighbors(cell: BoardCell): BoardCell[] {
  return [
    { row: cell.row - 1, col: cell.col },
    { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 },
    { row: cell.row, col: cell.col + 1 },
  ];
}

function toCellKey(cell: BoardCell): string {
  return `${cell.row},${cell.col}`;
}

function buildOverlayRegion(
  cells: BoardCell[],
  kind: HintOverlayKind,
  index: number
): HintOverlayRegion | null {
  const path = buildRegionPath(cells);
  if (!path) return null;

  return {
    id: `${kind}-${index}-${cells.map(toCellKey).sort().join('|')}`,
    kind,
    path,
    fill: kind === 'evidence' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(52, 211, 153, 0.22)',
    stroke: kind === 'evidence' ? 'rgba(125, 211, 252, 0.95)' : 'rgba(74, 222, 128, 0.95)',
    strokeWidth: kind === 'evidence' ? 3 : 4,
  };
}

function buildRegionPath(cells: BoardCell[]): string {
  const edgeMap = new Map<string, [number, number]>();

  for (const cell of cells) {
    const x = cell.col * hintCellSize;
    const y = cell.row * hintCellSize;
    const corners: Array<[number, number]> = [
      [x, y],
      [x + hintCellSize, y],
      [x + hintCellSize, y + hintCellSize],
      [x, y + hintCellSize],
    ];

    addEdge(edgeMap, corners[0], corners[1]);
    addEdge(edgeMap, corners[1], corners[2]);
    addEdge(edgeMap, corners[2], corners[3]);
    addEdge(edgeMap, corners[3], corners[0]);
  }

  const loops = traceClosedLoops(edgeMap);
  if (loops.length === 0) return '';

  return loops.map((loop) => `M ${loop.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`).join(' ');
}

function addEdge(
  edgeMap: Map<string, [number, number]>,
  start: [number, number],
  end: [number, number]
): void {
  const forward = edgeKey(start, end);
  const reverse = edgeKey(end, start);

  if (edgeMap.has(reverse)) {
    edgeMap.delete(reverse);
    return;
  }

  edgeMap.set(forward, end);
}

function edgeKey(start: [number, number], end: [number, number]): string {
  return `${start[0]},${start[1]}->${end[0]},${end[1]}`;
}

function traceClosedLoops(edgeMap: Map<string, [number, number]>): Array<Array<[number, number]>> {
  const remainingEdges = new Map(edgeMap);
  const loops: Array<Array<[number, number]>> = [];

  while (remainingEdges.size > 0) {
    const [initialKey, initialEnd] = remainingEdges.entries().next().value as [
      string,
      [number, number],
    ];
    remainingEdges.delete(initialKey);

    const start = parseStartPoint(initialKey);
    const loop: Array<[number, number]> = [start];
    let current = initialEnd;

    while (!(current[0] === start[0] && current[1] === start[1])) {
      loop.push(current);

      const nextEntry = findOutgoingEdge(remainingEdges, current);
      if (!nextEntry) {
        return [];
      }

      remainingEdges.delete(nextEntry[0]);
      current = nextEntry[1];
    }

    loops.push(loop);
  }

  return loops;
}

function parseStartPoint(edge: string): [number, number] {
  const [coords] = edge.split('->');
  const [x, y] = coords.split(',').map(Number);
  return [x, y];
}

function findOutgoingEdge(
  edges: Map<string, [number, number]>,
  start: [number, number]
): [string, [number, number]] | null {
  const prefix = `${start[0]},${start[1]}->`;
  for (const entry of edges.entries()) {
    if (entry[0].startsWith(prefix)) {
      return entry;
    }
  }
  return null;
}
</script>
