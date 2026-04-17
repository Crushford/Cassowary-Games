import { buildQueensAssetUrl } from './puzzleCatalog';
import { isDiagonalTouch, isOrthogonalConflict } from './queensRules';
import type { Pos } from '../types/types';

export const INFINITE_QUEENS_CHUNK_SIZE = 7;
export const INFINITE_QUEENS_DEFAULT_ORTHOGONAL_MIN_DISTANCE = 5;
export const INFINITE_QUEENS_DEFAULT_VIEWPORT_WIDTH = 10;
export const INFINITE_QUEENS_DEFAULT_VIEWPORT_HEIGHT = 10;
const INFINITE_QUEENS_INDEX_PATH = '/queens/stitching/index.json';
const INFINITE_QUEENS_DEBUG_PREFIX = '[InfiniteQueens]';

function debugLog(message: string, payload?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (payload) {
    console.info(`${INFINITE_QUEENS_DEBUG_PREFIX} ${message}`, payload);
  } else {
    console.info(`${INFINITE_QUEENS_DEBUG_PREFIX} ${message}`);
  }
}

export interface InfiniteQueensCatalogIndexEntry {
  boardSize: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  leftBlackoutFingerprint: string;
  topBlackoutFingerprint: string;
  fingerprintKey: string;
  pieceCategory: string;
  isSeed?: boolean;
  recordId?: string;
  recordIds?: string[];
  puzzleCount: number;
  countsByPieceKind: Record<string, number>;
  path: string;
}

export interface InfiniteQueensCatalogRecord {
  id: string;
  size: number;
  layout: string;
  queens: string;
  pieceKind: string;
  pieceCategory: string;
  boardSize: number;
  orthogonalMinDistance: number;
  targetQueenCount: number;
  queenCount: number;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  leftBlackoutFingerprint: string;
  topBlackoutFingerprint: string;
  rightBleedFingerprint: string;
  bottomBleedFingerprint: string;
  fingerprintKey: string;
  generationStrategy: string;
  isSeed: boolean;
}

export interface InfiniteQueensCatalogIndex {
  records: InfiniteQueensCatalogRecord[];
  seedRecords: InfiniteQueensCatalogRecord[];
  seedEntries: InfiniteQueensCatalogIndexEntry[];
  entries: InfiniteQueensCatalogIndexEntry[];
  byId: Map<string, InfiniteQueensCatalogRecord>;
  byLeftFingerprint: Map<string, InfiniteQueensCatalogIndexEntry[]>;
  byTopFingerprint: Map<string, InfiniteQueensCatalogIndexEntry[]>;
  byFingerprintKey: Map<string, InfiniteQueensCatalogIndexEntry[]>;
}

interface RawStitchingCatalogFile {
  byFingerprint?: Record<string, RawCatalogRecord[]>;
  startingPuzzles?: RawCatalogRecord[];
}

export interface InfiniteQueensBleedFingerprints {
  rightBleedFingerprint: string;
  bottomBleedFingerprint: string;
}

type RawCatalogRecord = Record<string, unknown> & {
  id: string;
  layout: string;
  queens: string;
  pieceKind: string;
  pieceCategory: string;
  boardSize?: number;
  size?: number;
  orthogonalMinDistance?: number;
  targetQueenCount?: number;
  queenCount?: number;
  leftBlackoutSignature: number[];
  topBlackoutSignature: number[];
  leftBlackoutFingerprint: string;
  topBlackoutFingerprint: string;
  rightBleedFingerprint?: string;
  bottomBleedFingerprint?: string;
  rightBlackoutFingerprint?: string;
  bottomBlackoutFingerprint?: string;
  fingerprintKey: string;
  generationStrategy?: string;
  isSeed?: boolean;
};

function fetchJson<T>(path: string, cache: RequestCache = 'force-cache'): Promise<T | null> {
  return fetch(buildQueensAssetUrl(path), { cache }).then(async (response) => {
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return (await response.json()) as T;
  });
}

function toRecordArray(payload: unknown): RawCatalogRecord[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter((entry): entry is RawCatalogRecord => {
    return (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as RawCatalogRecord).id === 'string' &&
      typeof (entry as RawCatalogRecord).layout === 'string' &&
      typeof (entry as RawCatalogRecord).queens === 'string'
    );
  });
}

function parseQueuedSignature(raw: unknown, size: number): number[] {
  if (!Array.isArray(raw)) {
    return Array.from({ length: size }, () => 0);
  }
  return raw.map((value) => Number(value)).map((value) => (Number.isFinite(value) ? value : 0));
}

function decodeQueensPositions(queens: string, size: number): Pos[] {
  const positions: Pos[] = [];
  for (let index = 0; index < queens.length; index++) {
    if (queens[index] === 'Q') {
      positions.push({ row: Math.floor(index / size), col: index % size });
    }
  }
  return positions;
}

function conflictsWithQueensAcrossRight(
  queens: Pos[],
  orthogonalMinDistance: number,
  row: number,
  localCol: number,
  boardSize: number
): boolean {
  const candidate = { row, col: boardSize + localCol };
  return queens.some(
    (queen) =>
      isOrthogonalConflict(queen, candidate, orthogonalMinDistance) ||
      isDiagonalTouch(queen, candidate)
  );
}

function conflictsWithQueensAcrossBottom(
  queens: Pos[],
  orthogonalMinDistance: number,
  localRow: number,
  col: number,
  boardSize: number
): boolean {
  const candidate = { row: boardSize + localRow, col };
  return queens.some(
    (queen) =>
      isOrthogonalConflict(queen, candidate, orthogonalMinDistance) ||
      isDiagonalTouch(queen, candidate)
  );
}

function computeOutgoingBleedFingerprints(
  queens: Pos[],
  orthogonalMinDistance: number,
  boardSize: number
): InfiniteQueensBleedFingerprints {
  const rightSignature = Array.from({ length: boardSize }, (_, row) => {
    let prefixLength = 0;
    while (
      prefixLength < boardSize &&
      conflictsWithQueensAcrossRight(queens, orthogonalMinDistance, row, prefixLength, boardSize)
    ) {
      prefixLength += 1;
    }
    return prefixLength;
  });

  const bottomSignature = Array.from({ length: boardSize }, (_, col) => {
    let prefixLength = 0;
    while (
      prefixLength < boardSize &&
      conflictsWithQueensAcrossBottom(queens, orthogonalMinDistance, prefixLength, col, boardSize)
    ) {
      prefixLength += 1;
    }
    return prefixLength;
  });

  return {
    rightBleedFingerprint: `R${serializeSignature(rightSignature)}`,
    bottomBleedFingerprint: `C${serializeSignature(bottomSignature)}`,
  };
}

function serializeSignature(signature: number[]): string {
  return signature.map((value) => String(value)).join('');
}

function normalizeRecord(record: RawCatalogRecord): InfiniteQueensCatalogRecord {
  const size = record.boardSize ?? record.size ?? INFINITE_QUEENS_CHUNK_SIZE;
  const orthogonalMinDistance =
    record.orthogonalMinDistance ?? INFINITE_QUEENS_DEFAULT_ORTHOGONAL_MIN_DISTANCE;
  const queens = decodeQueensPositions(record.queens, size);
  const outgoing = computeOutgoingBleedFingerprints(queens, orthogonalMinDistance, size);
  const rightBleedFingerprint =
    record.rightBleedFingerprint ??
    record.rightBlackoutFingerprint ??
    outgoing.rightBleedFingerprint;
  const bottomBleedFingerprint =
    record.bottomBleedFingerprint ??
    record.bottomBlackoutFingerprint ??
    outgoing.bottomBleedFingerprint;
  const isSeed =
    record.isSeed ??
    (record.pieceKind.toUpperCase() === 'TOP_LEFT' &&
      record.leftBlackoutSignature.every((value) => value === 0) &&
      record.topBlackoutSignature.every((value) => value === 0));

  return {
    id: record.id,
    size,
    layout: record.layout,
    queens: record.queens,
    pieceKind: record.pieceKind.toUpperCase(),
    pieceCategory: record.pieceCategory.toUpperCase(),
    boardSize: size,
    orthogonalMinDistance,
    targetQueenCount: record.targetQueenCount ?? 0,
    queenCount: record.queenCount ?? queens.length,
    leftBlackoutSignature: parseQueuedSignature(record.leftBlackoutSignature, size),
    topBlackoutSignature: parseQueuedSignature(record.topBlackoutSignature, size),
    leftBlackoutFingerprint: record.leftBlackoutFingerprint,
    topBlackoutFingerprint: record.topBlackoutFingerprint,
    rightBleedFingerprint,
    bottomBleedFingerprint,
    fingerprintKey: record.fingerprintKey,
    generationStrategy: record.generationStrategy ?? 'baseline',
    isSeed,
  };
}

function addToIndex(
  map: Map<string, InfiniteQueensCatalogIndexEntry[]>,
  key: string,
  entry: InfiniteQueensCatalogIndexEntry
): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(entry);
    return;
  }
  map.set(key, [entry]);
}

export function buildInfiniteQueensCatalogIndex(
  records: InfiniteQueensCatalogRecord[]
): InfiniteQueensCatalogIndex {
  const byId = new Map<string, InfiniteQueensCatalogRecord>();
  const byLeftFingerprint = new Map<string, InfiniteQueensCatalogIndexEntry[]>();
  const byTopFingerprint = new Map<string, InfiniteQueensCatalogIndexEntry[]>();
  const byFingerprintKey = new Map<string, InfiniteQueensCatalogIndexEntry[]>();
  const seedRecords: InfiniteQueensCatalogRecord[] = [];
  const seedEntries: InfiniteQueensCatalogIndexEntry[] = [];
  const entries: InfiniteQueensCatalogIndexEntry[] = records.map((record) => ({
    boardSize: record.boardSize,
    orthogonalMinDistance: record.orthogonalMinDistance,
    targetQueenCount: record.targetQueenCount,
    leftBlackoutFingerprint: record.leftBlackoutFingerprint,
    topBlackoutFingerprint: record.topBlackoutFingerprint,
    fingerprintKey: record.fingerprintKey,
    pieceCategory: record.pieceCategory,
    isSeed: record.isSeed,
    recordId: record.id,
    recordIds: [record.id],
    puzzleCount: 1,
    countsByPieceKind: { [record.pieceKind]: 1 },
    path: INFINITE_QUEENS_INDEX_PATH,
  }));

  for (const [index, record] of records.entries()) {
    byId.set(record.id, record);
    const entry = entries[index]!;
    addToIndex(byLeftFingerprint, record.leftBlackoutFingerprint, entry);
    addToIndex(byTopFingerprint, record.topBlackoutFingerprint, entry);
    addToIndex(byFingerprintKey, record.fingerprintKey, entry);
    if (record.isSeed) {
      seedRecords.push(record);
      seedEntries.push(entry);
    }
  }

  debugLog('catalog index built', {
    records: records.length,
    seedRecords: seedRecords.length,
    seedEntries: seedEntries.length,
    entries: entries.length,
    leftFingerprintBuckets: byLeftFingerprint.size,
    topFingerprintBuckets: byTopFingerprint.size,
    fingerprintKeyBuckets: byFingerprintKey.size,
  });

  return {
    records,
    seedRecords,
    seedEntries,
    entries,
    byId,
    byLeftFingerprint,
    byTopFingerprint,
    byFingerprintKey,
  };
}

function sortAndDedupe(records: InfiniteQueensCatalogRecord[]): InfiniteQueensCatalogRecord[] {
  const seen = new Set<string>();
  const ordered: InfiniteQueensCatalogRecord[] = [];
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    ordered.push(record);
  }
  return ordered;
}

export function getSeedCandidates(
  index: InfiniteQueensCatalogIndex
): InfiniteQueensCatalogRecord[] {
  const seeds = sortAndDedupe(index.seedRecords);
  debugLog('seed candidates requested', {
    seedCandidates: seeds.length,
    seedIds: seeds.slice(0, 10).map((record) => record.id),
  });
  return seeds;
}

export async function loadRecordsForEntries(
  index: InfiniteQueensCatalogIndex,
  entries: InfiniteQueensCatalogIndexEntry[],
  _cache: RequestCache = 'force-cache'
): Promise<InfiniteQueensCatalogRecord[]> {
  const records: InfiniteQueensCatalogRecord[] = [];
  debugLog('loading records for entries', {
    entries: entries.length,
    keys: entries.slice(0, 10).map((entry) => entry.fingerprintKey),
  });
  for (const entry of entries) {
    const recordIds = entry.recordIds ?? (entry.recordId ? [entry.recordId] : []);
    const resolved = recordIds
      .map((recordId) => index.byId.get(recordId))
      .filter((record): record is InfiniteQueensCatalogRecord => record != null);
    if (resolved.length > 0) {
      records.push(...resolved);
      continue;
    }

    debugLog('records missing from cache', {
      key: entry.fingerprintKey,
    });
  }
  return records;
}

export async function findByLeftFingerprint(
  index: InfiniteQueensCatalogIndex,
  fingerprint: string,
  cache: RequestCache = 'force-cache'
): Promise<InfiniteQueensCatalogRecord[]> {
  const entries = index.byLeftFingerprint.get(fingerprint) ?? [];
  debugLog('lookup by left fingerprint', {
    fingerprint,
    entries: entries.length,
  });
  return sortAndDedupe(await loadRecordsForEntries(index, entries, cache));
}

export async function findByTopFingerprint(
  index: InfiniteQueensCatalogIndex,
  fingerprint: string,
  cache: RequestCache = 'force-cache'
): Promise<InfiniteQueensCatalogRecord[]> {
  const entries = index.byTopFingerprint.get(fingerprint) ?? [];
  debugLog('lookup by top fingerprint', {
    fingerprint,
    entries: entries.length,
  });
  return sortAndDedupe(await loadRecordsForEntries(index, entries, cache));
}

export async function findByFingerprintKey(
  index: InfiniteQueensCatalogIndex,
  fingerprintKey: string,
  cache: RequestCache = 'force-cache'
): Promise<InfiniteQueensCatalogRecord[]> {
  const entries = index.byFingerprintKey.get(fingerprintKey) ?? [];
  debugLog('lookup by fingerprint key', {
    fingerprintKey,
    entries: entries.length,
  });
  return sortAndDedupe(await loadRecordsForEntries(index, entries, cache));
}

export function pickCandidate(
  candidates: InfiniteQueensCatalogRecord[],
  recentIds: Set<string>
): InfiniteQueensCatalogRecord | null {
  for (const candidate of candidates) {
    if (!recentIds.has(candidate.id)) {
      return candidate;
    }
  }
  return candidates[0] ?? null;
}

export async function loadInfiniteQueensCatalog(
  cache: RequestCache = 'force-cache'
): Promise<InfiniteQueensCatalogIndex> {
  const indexPayload = await fetchJson<RawStitchingCatalogFile | RawCatalogRecord[]>(
    INFINITE_QUEENS_INDEX_PATH,
    'no-store'
  );
  const isObjectPayload =
    typeof indexPayload === 'object' &&
    indexPayload !== null &&
    !Array.isArray(indexPayload) &&
    ('byFingerprint' in indexPayload || 'startingPuzzles' in indexPayload);
  const byFingerprintPayload = isObjectPayload
    ? ((indexPayload as RawStitchingCatalogFile).byFingerprint ?? {})
    : {};
  const startingPayload = isObjectPayload
    ? ((indexPayload as RawStitchingCatalogFile).startingPuzzles ?? [])
    : [];
  debugLog('loaded stitching index payload', {
    fingerprintBuckets: Object.keys(byFingerprintPayload).length,
    startingPuzzles: startingPayload.length,
  });
  if (!isObjectPayload) {
    return buildInfiniteQueensCatalogIndex([]);
  }

  const byLeftFingerprint = new Map<string, InfiniteQueensCatalogIndexEntry[]>();
  const byTopFingerprint = new Map<string, InfiniteQueensCatalogIndexEntry[]>();
  const byFingerprintKey = new Map<string, InfiniteQueensCatalogIndexEntry[]>();
  const seedRecords = startingPayload.map(normalizeRecord);
  const seedEntries = seedRecords.map((record) => ({
    boardSize: record.boardSize,
    orthogonalMinDistance: record.orthogonalMinDistance,
    targetQueenCount: record.targetQueenCount,
    leftBlackoutFingerprint: record.leftBlackoutFingerprint,
    topBlackoutFingerprint: record.topBlackoutFingerprint,
    fingerprintKey: record.fingerprintKey,
    pieceCategory: record.pieceCategory,
    isSeed: true,
    recordId: record.id,
    recordIds: [record.id],
    puzzleCount: 1,
    countsByPieceKind: { [record.pieceKind]: 1 },
    path: INFINITE_QUEENS_INDEX_PATH,
  }));

  const bucketEntries: InfiniteQueensCatalogIndexEntry[] = [];
  const records: InfiniteQueensCatalogRecord[] = [...seedRecords];
  const byId = new Map<string, InfiniteQueensCatalogRecord>(
    seedRecords.map((record) => [record.id, record])
  );

  for (const [fingerprintKey, rawRecords] of Object.entries(byFingerprintPayload)) {
    const normalized = toRecordArray(rawRecords).map(normalizeRecord);
    records.push(...normalized);
    normalized.forEach((record) => byId.set(record.id, record));
    const sample = normalized[0];
    if (!sample) continue;
    const entry: InfiniteQueensCatalogIndexEntry = {
      boardSize: sample.boardSize,
      orthogonalMinDistance: sample.orthogonalMinDistance,
      targetQueenCount: sample.targetQueenCount,
      leftBlackoutFingerprint: sample.leftBlackoutFingerprint,
      topBlackoutFingerprint: sample.topBlackoutFingerprint,
      fingerprintKey,
      pieceCategory: sample.pieceCategory,
      isSeed: false,
      recordIds: normalized.map((record) => record.id),
      puzzleCount: normalized.length,
      countsByPieceKind: normalized.reduce<Record<string, number>>((accumulator, record) => {
        accumulator[record.pieceKind] = (accumulator[record.pieceKind] ?? 0) + 1;
        return accumulator;
      }, {}),
      path: INFINITE_QUEENS_INDEX_PATH,
    };
    bucketEntries.push(entry);
    addToIndex(byLeftFingerprint, sample.leftBlackoutFingerprint, entry);
    addToIndex(byTopFingerprint, sample.topBlackoutFingerprint, entry);
    addToIndex(byFingerprintKey, fingerprintKey, entry);
  }

  debugLog('catalog lookup tables prepared', {
    leftFingerprintBuckets: byLeftFingerprint.size,
    topFingerprintBuckets: byTopFingerprint.size,
    fingerprintKeyBuckets: byFingerprintKey.size,
    seedEntries: seedEntries.length,
  });

  return {
    records,
    seedRecords,
    seedEntries,
    entries: bucketEntries,
    byId,
    byLeftFingerprint,
    byTopFingerprint,
    byFingerprintKey,
  };
}
