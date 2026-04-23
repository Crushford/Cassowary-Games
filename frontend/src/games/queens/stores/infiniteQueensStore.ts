import { computed, reactive, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import type { GridSquare, MarkType, Pos } from '../types/types';
import { isValidMoveOnBoard } from '../utils/queensMoveValidation';
import { getAutoFlagPositions } from '../utils/queensAutoFlagging';
import { detectConstraintViolations, deriveErrorMessage } from '../utils/queensErrorDetection';
import {
  findByFingerprintKey,
  findByLeftFingerprint,
  findByTopFingerprint,
  loadInfiniteQueensCatalog,
  pickCandidate,
  type InfiniteQueensCatalogIndex,
  type InfiniteQueensCatalogRecord,
  INFINITE_QUEENS_CHUNK_SIZE,
  INFINITE_QUEENS_DEFAULT_ORTHOGONAL_MIN_DISTANCE,
  INFINITE_QUEENS_DEFAULT_VIEWPORT_HEIGHT,
  INFINITE_QUEENS_DEFAULT_VIEWPORT_WIDTH,
} from '../utils/infiniteQueensCatalog';

export interface InfiniteQueensWorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface InfiniteQueensViewport {
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface InfiniteQueensChunk {
  chunkX: number;
  chunkY: number;
  key: string;
  record: InfiniteQueensCatalogRecord;
}

export interface InfiniteQueensWorldCell {
  worldRow: number;
  worldCol: number;
  chunkKey: string;
  chunkX: number;
  chunkY: number;
  localRow: number;
  localCol: number;
  displayGroupId: string | null;
  displayGroupSlot: number | null;
  isSolutionQueen: boolean;
  isSeamFill: boolean;
  isBlackout: boolean;
  playerMark: MarkType;
}

type InfiniteQueensTool = 'auto' | 'queen' | 'flag';

const DEFAULT_VIEWPORT_WIDTH = INFINITE_QUEENS_DEFAULT_VIEWPORT_WIDTH;
const DEFAULT_VIEWPORT_HEIGHT = INFINITE_QUEENS_DEFAULT_VIEWPORT_HEIGHT;
const ACTIVE_WINDOW_EXTRA_CELLS = 7;
const VALIDATION_CONFIRMATION_DELAY_MS = 1000;
const MAX_RECENT_PUZZLES = 24;
const INFINITE_QUEENS_DEBUG_PREFIX = '[InfiniteQueens]';

function debugLog(message: string, payload?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (payload) {
    console.info(`${INFINITE_QUEENS_DEBUG_PREFIX} ${message}`, payload);
  } else {
    console.info(`${INFINITE_QUEENS_DEBUG_PREFIX} ${message}`);
  }
}

function chunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`;
}

function worldKey(worldRow: number, worldCol: number): string {
  return `${worldRow},${worldCol}`;
}

function hashGroupId(groupId: string | null): number | null {
  if (!groupId) return null;
  let hash = 0;
  for (let index = 0; index < groupId.length; index++) {
    hash = (hash * 31 + groupId.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function groupIdForCell(
  chunk: InfiniteQueensChunk,
  localRow: number,
  localCol: number
): string | null {
  const symbol = chunk.record.layout[localRow * chunk.record.size + localCol];
  return symbol && symbol !== '.' ? `${chunk.key}:${symbol}` : null;
}

function isBlackoutCell(chunk: InfiniteQueensChunk, localRow: number, localCol: number): boolean {
  return chunk.record.layout[localRow * chunk.record.size + localCol] === '.';
}

function countMarks(playerMarks: Map<string, MarkType>, markType: MarkType): number {
  let count = 0;
  for (const mark of playerMarks.values()) {
    if (mark === markType) count++;
  }
  return count;
}

function createChunk(
  record: InfiniteQueensCatalogRecord,
  chunkX: number,
  chunkY: number
): InfiniteQueensChunk {
  return {
    chunkX,
    chunkY,
    key: chunkKey(chunkX, chunkY),
    record,
  };
}

function findNearestActiveGroupId(
  chunk: InfiniteQueensChunk,
  localRow: number,
  localCol: number
): string | null {
  let bestGroupId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let row = 0; row < chunk.record.size; row++) {
    for (let col = 0; col < chunk.record.size; col++) {
      if (isBlackoutCell(chunk, row, col)) continue;
      const groupId = groupIdForCell(chunk, row, col);
      if (!groupId) continue;
      const distance = Math.abs(localRow - row) + Math.abs(localCol - col);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestGroupId = groupId;
      }
    }
  }
  return bestGroupId;
}

export const useInfiniteQueensStore = defineStore('infiniteQueens', () => {
  const catalogIndex = shallowRef<InfiniteQueensCatalogIndex | null>(null);
  const chunks = reactive(new Map<string, InfiniteQueensChunk>());
  const playerMarks = reactive(new Map<string, MarkType>());
  const recentPuzzleIds = ref<string[]>([]);

  const loading = ref(false);
  const isReady = ref(false);
  const errorMessage = ref<string | null>(null);
  const statusMessage = ref<string | null>(null);
  const validationMessage = ref<string | null>(null);
  const validationErrorCellKeys = ref<Set<string>>(new Set());
  const validationMessageTimeout = ref<number | null>(null);
  const activeTool = ref<InfiniteQueensTool>('auto');
  const autoFlagging = ref(true);

  const worldBounds = reactive<InfiniteQueensWorldBounds>({
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  });

  const viewport = reactive<InfiniteQueensViewport>({
    row: 0,
    col: 0,
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  });

  const loadedWorldWidthCells = computed(() => (worldBounds.maxX + 1) * INFINITE_QUEENS_CHUNK_SIZE);
  const loadedWorldHeightCells = computed(
    () => (worldBounds.maxY + 1) * INFINITE_QUEENS_CHUNK_SIZE
  );

  const queenCount = computed(() => countMarks(playerMarks, 'queen'));
  const flagCount = computed(() => countMarks(playerMarks, 'flag'));

  function resetWorldState(): void {
    chunks.clear();
    playerMarks.clear();
    recentPuzzleIds.value = [];
    worldBounds.minX = 0;
    worldBounds.minY = 0;
    worldBounds.maxX = 0;
    worldBounds.maxY = 0;
    viewport.row = 0;
    viewport.col = 0;
    viewport.width = DEFAULT_VIEWPORT_WIDTH;
    viewport.height = DEFAULT_VIEWPORT_HEIGHT;
    isReady.value = false;
    errorMessage.value = null;
    statusMessage.value = null;
    validationMessage.value = null;
    validationErrorCellKeys.value = new Set();
    if (validationMessageTimeout.value !== null) {
      clearTimeout(validationMessageTimeout.value);
      validationMessageTimeout.value = null;
    }
  }

  function rememberRecentPuzzle(puzzleId: string): void {
    const next = [puzzleId, ...recentPuzzleIds.value.filter((id) => id !== puzzleId)];
    recentPuzzleIds.value = next.slice(0, MAX_RECENT_PUZZLES);
  }

  function getRecentPuzzleIdSet(): Set<string> {
    return new Set(recentPuzzleIds.value);
  }

  function getChunkAt(chunkX: number, chunkY: number): InfiniteQueensChunk | null {
    return chunks.get(chunkKey(chunkX, chunkY)) ?? null;
  }

  function ensureBoundsForChunk(chunkX: number, chunkY: number): void {
    worldBounds.maxX = Math.max(worldBounds.maxX, chunkX);
    worldBounds.maxY = Math.max(worldBounds.maxY, chunkY);
  }

  async function resolveBootstrapCandidates(
    index: InfiniteQueensCatalogIndex,
    origin: InfiniteQueensCatalogRecord
  ): Promise<{
    rightCandidates: InfiniteQueensCatalogRecord[];
    bottomCandidates: InfiniteQueensCatalogRecord[];
  }> {
    const rightCandidates = await findByLeftFingerprint(index, origin.rightBleedFingerprint);
    const bottomCandidates = await findByTopFingerprint(index, origin.bottomBleedFingerprint);
    return { rightCandidates, bottomCandidates };
  }

  async function resolveChunkAt(chunkX: number, chunkY: number): Promise<InfiniteQueensChunk> {
    if (chunkX < 0 || chunkY < 0) {
      throw new Error('Infinite Queens does not generate chunks at negative coordinates.');
    }

    const key = chunkKey(chunkX, chunkY);
    const existing = chunks.get(key);
    if (existing) {
      return existing;
    }

    const index = catalogIndex.value;
    if (!index) {
      throw new Error('Stitching catalog is not loaded.');
    }

    const leftNeighbor = chunkX > 0 ? getChunkAt(chunkX - 1, chunkY) : null;
    const topNeighbor = chunkY > 0 ? getChunkAt(chunkX, chunkY - 1) : null;
    debugLog('resolving chunk', {
      chunkX,
      chunkY,
      key,
      hasLeftNeighbor: leftNeighbor != null,
      hasTopNeighbor: topNeighbor != null,
      recentPuzzles: recentPuzzleIds.value.slice(0, 10),
    });
    const candidates =
      leftNeighbor && topNeighbor
        ? await findByFingerprintKey(
            index,
            `${leftNeighbor.record.rightBleedFingerprint}${topNeighbor.record.bottomBleedFingerprint}`
          )
        : leftNeighbor
          ? await findByLeftFingerprint(index, leftNeighbor.record.rightBleedFingerprint)
          : topNeighbor
            ? await findByTopFingerprint(index, topNeighbor.record.bottomBleedFingerprint)
            : index.records;

    debugLog('candidate set resolved', {
      chunkX,
      chunkY,
      key,
      candidateCount: candidates.length,
      candidateIds: candidates
        .slice(0, 10)
        .map((candidate: InfiniteQueensCatalogRecord) => candidate.id),
    });

    const candidate = pickCandidate(candidates, getRecentPuzzleIdSet());
    if (!candidate) {
      debugLog('no candidate selected', {
        chunkX,
        chunkY,
        key,
        candidateCount: candidates.length,
      });
      throw new Error(`No stitching candidate could be resolved for chunk ${key}.`);
    }

    const chunk = createChunk(candidate, chunkX, chunkY);
    chunks.set(key, chunk);
    rememberRecentPuzzle(candidate.id);
    ensureBoundsForChunk(chunkX, chunkY);
    debugLog('chunk resolved', {
      chunkX,
      chunkY,
      key,
      puzzleId: candidate.id,
      pieceKind: candidate.pieceKind,
      fingerprintKey: candidate.fingerprintKey,
      isSeed: candidate.isSeed,
    });
    return chunk;
  }

  async function buildInitialSeedWorld(): Promise<void> {
    const index = catalogIndex.value;
    if (!index) {
      throw new Error('Stitching catalog is not loaded.');
    }
    const origin = index.seedRecords[0];
    if (!origin) {
      throw new Error('No starting puzzles were exported for Infinite Queens.');
    }

    resetWorldState();
    debugLog('boot seed selected', {
      seedId: origin.id,
      seedFingerprintKey: origin.fingerprintKey,
      seedPieceKind: origin.pieceKind,
      seedCount: index.seedRecords.length,
    });

    const bootstrapCandidates = await resolveBootstrapCandidates(index, origin);
    debugLog('bootstrap fingerprint probes', {
      seedId: origin.id,
      originPieceKind: origin.pieceKind,
      originRightFingerprint: origin.rightBleedFingerprint,
      originBottomFingerprint: origin.bottomBleedFingerprint,
      rightCandidateCount: bootstrapCandidates.rightCandidates.length,
      bottomCandidateCount: bootstrapCandidates.bottomCandidates.length,
      rightCandidateIds: bootstrapCandidates.rightCandidates
        .slice(0, 10)
        .map((candidate) => candidate.id),
      bottomCandidateIds: bootstrapCandidates.bottomCandidates
        .slice(0, 10)
        .map((candidate) => candidate.id),
    });

    if (
      bootstrapCandidates.rightCandidates.length === 0 ||
      bootstrapCandidates.bottomCandidates.length === 0
    ) {
      throw new Error(
        'The starting puzzle does not have matching right and bottom stitching candidates.'
      );
    }

    chunks.set(chunkKey(0, 0), createChunk(origin, 0, 0));
    rememberRecentPuzzle(origin.id);

    const rightCandidate = pickCandidate(
      bootstrapCandidates.rightCandidates,
      getRecentPuzzleIdSet()
    );
    const bottomCandidate = pickCandidate(
      bootstrapCandidates.bottomCandidates,
      getRecentPuzzleIdSet()
    );
    if (!rightCandidate || !bottomCandidate) {
      throw new Error('Unable to select stitched neighbors for the seed puzzle.');
    }

    let bottomRight: InfiniteQueensCatalogRecord | null = null;
    let selectedRightCandidate = rightCandidate;
    let selectedBottomCandidate = bottomCandidate;
    for (const candidateRight of bootstrapCandidates.rightCandidates) {
      for (const candidateBottom of bootstrapCandidates.bottomCandidates) {
        const bottomRightCandidates = await findByFingerprintKey(
          index,
          `${candidateBottom.rightBleedFingerprint}${candidateRight.bottomBleedFingerprint}`
        );
        debugLog('bottom-right probe', {
          seedId: origin.id,
          rightCandidateId: candidateRight.id,
          bottomCandidateId: candidateBottom.id,
          bottomRightCandidateCount: bottomRightCandidates.length,
          bottomRightCandidateIds: bottomRightCandidates
            .slice(0, 10)
            .map((candidate) => candidate.id),
        });
        const candidate = pickCandidate(
          bottomRightCandidates,
          new Set([...getRecentPuzzleIdSet(), candidateRight.id, candidateBottom.id, origin.id])
        );
        if (candidate) {
          selectedRightCandidate = candidateRight;
          selectedBottomCandidate = candidateBottom;
          bottomRight = candidate;
          break;
        }
      }
      if (bottomRight) {
        break;
      }
    }

    if (!bottomRight) {
      throw new Error('The seed puzzle does not have a matching bottom-right stitching candidate.');
    }

    chunks.set(chunkKey(1, 0), createChunk(selectedRightCandidate, 1, 0));
    chunks.set(chunkKey(0, 1), createChunk(selectedBottomCandidate, 0, 1));
    chunks.set(chunkKey(1, 1), createChunk(bottomRight, 1, 1));
    rememberRecentPuzzle(selectedRightCandidate.id);
    rememberRecentPuzzle(selectedBottomCandidate.id);
    rememberRecentPuzzle(bottomRight.id);

    worldBounds.maxX = 1;
    worldBounds.maxY = 1;
    viewport.row = 0;
    viewport.col = 0;
    isReady.value = true;
    statusMessage.value = 'Infinite Queens is ready.';
    debugLog('bootstrap complete', {
      seedId: origin.id,
      rightId: selectedRightCandidate.id,
      bottomId: selectedBottomCandidate.id,
      bottomRightId: bottomRight.id,
      chunkCount: chunks.size,
      bounds: {
        minX: worldBounds.minX,
        minY: worldBounds.minY,
        maxX: worldBounds.maxX,
        maxY: worldBounds.maxY,
      },
    });
  }

  async function ensureRightColumnLoaded(): Promise<void> {
    const nextChunkX = worldBounds.maxX + 1;
    for (let chunkY = worldBounds.minY; chunkY <= worldBounds.maxY; chunkY++) {
      await resolveChunkAt(nextChunkX, chunkY);
    }
    worldBounds.maxX = nextChunkX;
  }

  async function ensureBottomRowLoaded(): Promise<void> {
    const nextChunkY = worldBounds.maxY + 1;
    for (let chunkX = worldBounds.minX; chunkX <= worldBounds.maxX; chunkX++) {
      await resolveChunkAt(chunkX, nextChunkY);
    }
    worldBounds.maxY = nextChunkY;
  }

  async function ensureViewportCoverage(nextRow: number, nextCol: number): Promise<void> {
    if (nextRow < 0 || nextCol < 0) {
      throw new Error('Infinite Queens cannot move into negative world coordinates.');
    }

    const requiredRight = nextCol + viewport.width - 1;
    const requiredBottom = nextRow + viewport.height - 1;

    while (requiredRight > loadedWorldWidthCells.value - 1) {
      await ensureRightColumnLoaded();
    }

    while (requiredBottom > loadedWorldHeightCells.value - 1) {
      await ensureBottomRowLoaded();
    }
  }

  function getLocalPosition(
    worldRow: number,
    worldCol: number
  ): {
    chunk: InfiniteQueensChunk;
    localRow: number;
    localCol: number;
  } | null {
    const chunkX = Math.floor(worldCol / INFINITE_QUEENS_CHUNK_SIZE);
    const chunkY = Math.floor(worldRow / INFINITE_QUEENS_CHUNK_SIZE);
    const chunk = getChunkAt(chunkX, chunkY);
    if (!chunk) return null;

    return {
      chunk,
      localRow: worldRow - chunkY * INFINITE_QUEENS_CHUNK_SIZE,
      localCol: worldCol - chunkX * INFINITE_QUEENS_CHUNK_SIZE,
    };
  }

  function resolveVisibleCell(
    worldRow: number,
    worldCol: number,
    memo: Map<string, InfiniteQueensWorldCell>,
    visiting: Set<string>
  ): InfiniteQueensWorldCell | null {
    const key = worldKey(worldRow, worldCol);
    const cached = memo.get(key);
    if (cached) {
      return cached;
    }
    if (visiting.has(key)) {
      return null;
    }
    visiting.add(key);

    const chunkInfo = getLocalPosition(worldRow, worldCol);
    if (!chunkInfo) {
      visiting.delete(key);
      return null;
    }

    const { chunk, localRow, localCol } = chunkInfo;
    const layoutIndex = localRow * chunk.record.size + localCol;
    const symbol = chunk.record.layout[layoutIndex] ?? '.';
    const playerMark = playerMarks.get(key) ?? null;
    const baseCell: InfiniteQueensWorldCell = {
      worldRow,
      worldCol,
      chunkKey: chunk.key,
      chunkX: chunk.chunkX,
      chunkY: chunk.chunkY,
      localRow,
      localCol,
      displayGroupId: null,
      displayGroupSlot: null,
      isSolutionQueen: (chunk.record.queens[layoutIndex] ?? '.') === 'Q',
      isSeamFill: false,
      isBlackout: symbol === '.',
      playerMark,
    };

    if (symbol !== '.') {
      const groupId = `${chunk.key}:${symbol}`;
      const cell = {
        ...baseCell,
        displayGroupId: groupId,
        displayGroupSlot: hashGroupId(groupId),
      };
      memo.set(key, cell);
      visiting.delete(key);
      return cell;
    }

    const overrideSymbol = chunk.record.blackoutFillOverrideByIndex[layoutIndex];
    if (overrideSymbol) {
      const groupId = `${chunk.key}:${overrideSymbol}`;
      const cell: InfiniteQueensWorldCell = {
        ...baseCell,
        displayGroupId: groupId,
        displayGroupSlot: hashGroupId(groupId),
        isSeamFill: true,
        isBlackout: false,
      };
      memo.set(key, cell);
      visiting.delete(key);
      return cell;
    }

    const leftBleed = localCol < (chunk.record.leftBlackoutSignature[localRow] ?? 0);
    const topBleed = localRow < (chunk.record.topBlackoutSignature[localCol] ?? 0);
    const directions: Array<[number, number]> = [];
    if (leftBleed) directions.push([0, -1]);
    if (topBleed) directions.push([-1, 0]);
    if (!leftBleed) directions.push([0, -1]);
    if (!topBleed) directions.push([-1, 0]);
    directions.push([0, 1], [1, 0]);

    const priorityDirections = directions.filter(
      (direction, index) =>
        directions.findIndex(
          (candidate) => candidate[0] === direction[0] && candidate[1] === direction[1]
        ) === index
    );

    for (const [dr, dc] of priorityDirections) {
      const neighbor = resolveVisibleCell(worldRow + dr, worldCol + dc, memo, visiting);
      if (neighbor?.displayGroupId) {
        const cell: InfiniteQueensWorldCell = {
          ...baseCell,
          displayGroupId: neighbor.displayGroupId,
          displayGroupSlot: neighbor.displayGroupSlot,
          isSeamFill: true,
          isBlackout: false,
        };
        memo.set(key, cell);
        visiting.delete(key);
        return cell;
      }
    }

    const fallbackGroupId = findNearestActiveGroupId(chunk, localRow, localCol);
    const cell: InfiniteQueensWorldCell = {
      ...baseCell,
      displayGroupId: fallbackGroupId,
      displayGroupSlot: hashGroupId(fallbackGroupId),
      isSeamFill: true,
      isBlackout: false,
    };
    memo.set(key, cell);
    visiting.delete(key);
    return cell;
  }

  function buildVisibleCells(): InfiniteQueensWorldCell[][] {
    return buildCellMatrix(viewport.row, viewport.col, viewport.width, viewport.height);
  }

  function buildCellMatrix(
    startRow: number,
    startCol: number,
    width: number,
    height: number
  ): InfiniteQueensWorldCell[][] {
    const memo = new Map<string, InfiniteQueensWorldCell>();
    const visiting = new Set<string>();
    return Array.from({ length: height }, (_, rowOffset) =>
      Array.from({ length: width }, (_, colOffset) => {
        const worldRow = startRow + rowOffset;
        const worldCol = startCol + colOffset;
        const cell = resolveVisibleCell(worldRow, worldCol, memo, visiting);
        return (
          cell ?? {
            worldRow,
            worldCol,
            chunkKey: '',
            chunkX: 0,
            chunkY: 0,
            localRow: 0,
            localCol: 0,
            displayGroupId: null,
            displayGroupSlot: null,
            isSolutionQueen: false,
            isSeamFill: false,
            isBlackout: true,
            playerMark: null,
          }
        );
      })
    );
  }

  function getActiveWindowBounds(): {
    startRow: number;
    startCol: number;
    width: number;
    height: number;
  } {
    const leadingPadding = Math.floor(ACTIVE_WINDOW_EXTRA_CELLS / 2);
    const trailingPadding = ACTIVE_WINDOW_EXTRA_CELLS - leadingPadding;
    const startRow = Math.max(0, viewport.row - leadingPadding);
    const startCol = Math.max(0, viewport.col - leadingPadding);
    const endRow = Math.min(
      loadedWorldHeightCells.value - 1,
      viewport.row + viewport.height - 1 + trailingPadding
    );
    const endCol = Math.min(
      loadedWorldWidthCells.value - 1,
      viewport.col + viewport.width - 1 + trailingPadding
    );
    return {
      startRow,
      startCol,
      width: Math.max(1, endCol - startCol + 1),
      height: Math.max(1, endRow - startRow + 1),
    };
  }

  function buildActiveWindowAnalysisContext(): {
    bounds: { startRow: number; startCol: number; width: number; height: number };
    grid: GridSquare[][];
    playerMarks: MarkType[][];
    gridSize: number;
    orthogonalMinDistance: number;
  } {
    const bounds = getActiveWindowBounds();
    const cells = buildCellMatrix(bounds.startRow, bounds.startCol, bounds.width, bounds.height);

    const gridSize = Math.min(bounds.width, bounds.height);
    const grid = cells.slice(0, gridSize).map((row) =>
      row.slice(0, gridSize).map((cell) => ({
        position: {
          row: cell.worldRow - bounds.startRow,
          col: cell.worldCol - bounds.startCol,
        },
        groupColor: cell.displayGroupId ?? undefined,
        isSolutionQueen: cell.isSolutionQueen,
      }))
    );

    return {
      bounds,
      grid,
      playerMarks: cells
        .slice(0, gridSize)
        .map((row) => row.slice(0, gridSize).map((cell) => cell.playerMark)),
      gridSize,
      orthogonalMinDistance: INFINITE_QUEENS_DEFAULT_ORTHOGONAL_MIN_DISTANCE,
    };
  }

  function detectWindowViolations(): { keys: Set<string>; message: string | null } {
    const analysis = buildActiveWindowAnalysisContext();
    const validation = detectConstraintViolations({
      grid: analysis.grid,
      playerMarks: analysis.playerMarks,
      gridSize: analysis.gridSize,
      targetQueenCount: 0,
      orthogonalMinDistance: analysis.orthogonalMinDistance,
    });
    const localErrorSquares = new Set<string>();
    const worldKeys = new Set<string>();

    const addPosition = (position: Pos): void => {
      const localKey = worldKey(position.row, position.col);
      const worldKeyValue = worldKey(
        analysis.bounds.startRow + position.row,
        analysis.bounds.startCol + position.col
      );
      localErrorSquares.add(localKey);
      worldKeys.add(worldKeyValue);
    };

    for (const violation of validation.timedViolations) {
      violation.affectedCells.forEach(addPosition);
    }
    for (const position of validation.immediateDiagonalErrors) {
      addPosition(position);
    }

    const queenPositions = validation.allQueenPositions;
    const message = deriveErrorMessage({
      grid: analysis.grid,
      playerMarks: analysis.playerMarks,
      gridSize: analysis.gridSize,
      targetQueenCount: 0,
      orthogonalMinDistance: analysis.orthogonalMinDistance,
      errorSquares: localErrorSquares,
      queenPositions,
      hasDiagonalConflicts: validation.hasDiagonalConflicts,
    });

    return { keys: worldKeys, message };
  }

  function isValidWorldMove(worldRow: number, worldCol: number): boolean {
    const analysis = buildActiveWindowAnalysisContext();
    if (
      worldRow < analysis.bounds.startRow ||
      worldCol < analysis.bounds.startCol ||
      worldRow >= analysis.bounds.startRow + analysis.bounds.height ||
      worldCol >= analysis.bounds.startCol + analysis.bounds.width
    ) {
      return true;
    }

    const localRow = worldRow - analysis.bounds.startRow;
    const localCol = worldCol - analysis.bounds.startCol;
    return isValidMoveOnBoard(
      {
        grid: analysis.grid,
        playerMarks: analysis.playerMarks,
        gridSize: analysis.gridSize,
        orthogonalMinDistance: analysis.orthogonalMinDistance,
      },
      localRow,
      localCol
    );
  }

  function scheduleValidationState(): void {
    const validation = detectWindowViolations();
    if (validationMessageTimeout.value !== null) {
      clearTimeout(validationMessageTimeout.value);
      validationMessageTimeout.value = null;
    }

    if (validation.keys.size === 0 || validation.message === null) {
      validationMessage.value = null;
      validationErrorCellKeys.value = new Set();
      return;
    }

    const nextMessage = validation.message;
    const nextKeys = new Set(validation.keys);
    validationMessage.value = null;
    validationErrorCellKeys.value = new Set();
    validationMessageTimeout.value = window.setTimeout(() => {
      validationMessage.value = nextMessage;
      validationErrorCellKeys.value = nextKeys;
      validationMessageTimeout.value = null;
    }, VALIDATION_CONFIRMATION_DELAY_MS);
  }

  function syncErrorState(): void {
    scheduleValidationState();
  }

  function setMark(worldRow: number, worldCol: number, mark: MarkType): void {
    const key = worldKey(worldRow, worldCol);
    if (mark === null) {
      playerMarks.delete(key);
    } else {
      playerMarks.set(key, mark);
    }
    syncErrorState();
  }

  function toggleQueen(worldRow: number, worldCol: number): void {
    const key = worldKey(worldRow, worldCol);
    const current = playerMarks.get(key);
    if (current === 'queen') {
      setMark(worldRow, worldCol, null);
      return;
    }
    setMark(worldRow, worldCol, 'queen');
  }

  function toggleFlag(worldRow: number, worldCol: number): void {
    const key = worldKey(worldRow, worldCol);
    const current = playerMarks.get(key);
    if (current === 'flag') {
      setMark(worldRow, worldCol, null);
      return;
    }
    setMark(worldRow, worldCol, 'flag');
  }

  function clearMarks(): void {
    playerMarks.clear();
    syncErrorState();
  }

  function setActiveTool(tool: InfiniteQueensTool): void {
    activeTool.value = tool;
  }

  function handleCellClick(worldRow: number, worldCol: number): void {
    const key = worldKey(worldRow, worldCol);
    const currentMark = playerMarks.get(key) ?? null;

    if (activeTool.value === 'flag') {
      toggleFlag(worldRow, worldCol);
      return;
    }

    if (activeTool.value === 'queen') {
      toggleQueen(worldRow, worldCol);
      if (autoFlagging.value) {
        autoFlagBoard();
      }
      return;
    }

    if (currentMark === null) {
      toggleFlag(worldRow, worldCol);
      return;
    }

    if (currentMark === 'flag') {
      toggleQueen(worldRow, worldCol);
      if (autoFlagging.value) {
        autoFlagBoard();
      }
    } else {
      toggleQueen(worldRow, worldCol);
    }
  }

  function autoFlagBoard(): number {
    const analysis = buildActiveWindowAnalysisContext();
    const positions = getAutoFlagPositions({
      grid: analysis.grid,
      playerMarks: analysis.playerMarks,
      gridSize: analysis.gridSize,
      orthogonalMinDistance: analysis.orthogonalMinDistance,
    });

    let flagged = 0;
    for (const position of positions) {
      const worldRow = analysis.bounds.startRow + position.row;
      const worldCol = analysis.bounds.startCol + position.col;
      const key = worldKey(worldRow, worldCol);
      if (playerMarks.get(key) != null) continue;
      playerMarks.set(key, 'flag');
      flagged++;
    }

    if (flagged > 0) {
      syncErrorState();
    }

    return flagged;
  }

  async function startGame(): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    errorMessage.value = null;
    statusMessage.value = 'Loading stitched catalog...';
    debugLog('startGame invoked');

    try {
      if (!catalogIndex.value) {
        catalogIndex.value = await loadInfiniteQueensCatalog();
      }
      debugLog('catalog loaded into store', {
        entries: catalogIndex.value.entries.length,
        seedEntries: catalogIndex.value.seedEntries.length,
        seedRecords: catalogIndex.value.seedRecords.length,
      });

      await buildInitialSeedWorld();
      syncErrorState();
      statusMessage.value = 'Infinite Queens ready.';
    } catch (error) {
      resetWorldState();
      errorMessage.value =
        error instanceof Error ? error.message : 'Failed to start Infinite Queens.';
      debugLog('startGame failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function moveViewport(deltaRow: number, deltaCol: number): Promise<boolean> {
    const nextRow = viewport.row + deltaRow;
    const nextCol = viewport.col + deltaCol;
    if (nextRow < 0 || nextCol < 0) {
      statusMessage.value = 'The world does not extend above or left of the seed area.';
      return false;
    }

    try {
      await ensureViewportCoverage(nextRow, nextCol);
      viewport.row = nextRow;
      viewport.col = nextCol;
      syncErrorState();
      return true;
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Failed to expand the stitched world.';
      return false;
    }
  }

  async function setViewport(row: number, col: number): Promise<boolean> {
    if (row < 0 || col < 0) {
      return false;
    }
    try {
      await ensureViewportCoverage(row, col);
      viewport.row = row;
      viewport.col = col;
      syncErrorState();
      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to move the viewport.';
      return false;
    }
  }

  return {
    catalogIndex,
    chunks,
    loading,
    isReady,
    errorMessage,
    statusMessage,
    activeTool,
    autoFlagging,
    worldBounds,
    viewport,
    loadedWorldWidthCells,
    loadedWorldHeightCells,
    queenCount,
    flagCount,
    visibleCells: computed(() => buildVisibleCells()),
    errorCellKeys: computed(() => validationErrorCellKeys.value),
    worldValidationMessage: computed(() => validationMessage.value),
    startGame,
    moveViewport,
    setViewport,
    setActiveTool,
    setAutoFlagging: (enabled: boolean) => {
      autoFlagging.value = enabled;
    },
    handleCellClick,
    toggleQueen,
    toggleFlag,
    clearMarks,
    autoFlagBoard,
    isValidWorldMove,
    syncErrorState,
  };
});

export type InfiniteQueensStore = ReturnType<typeof useInfiniteQueensStore>;
