import type { QueensAdminBatchRun, QueensAdminGenerationStrategy } from './types';

const STORAGE_KEY = 'queens-admin-batch-history-v3';
const LEGACY_STORAGE_KEY = 'queens-admin-batch-history-v2';
const LEGACY_DEFAULT_MINIMUM_GROUP_SIZE = 3;

type TerminalRunState = 'COMPLETED' | 'FAILED' | 'CANCELLED';
type PersistenceState = QueensAdminBatchRun['persistenceState'];
type MinimumGroupSizeSource = 'explicit' | 'legacy-assumed';

interface PersistedBatchRunEventV1 {
  runId: string;
  size: number;
  strategy: QueensAdminGenerationStrategy;
  minimumGroupSize: number | null;
  state: TerminalRunState;
  success: boolean;
  persistenceState: PersistenceState;
  finishedAt: string;
  durationMs: number | null;
}

interface PersistedBatchRunEventV2 {
  runId: string;
  size: number;
  strategy: QueensAdminGenerationStrategy;
  orthogonalMinDistance?: number;
  minimumGroupSize: number;
  minimumGroupSizeSource: MinimumGroupSizeSource;
  state: TerminalRunState;
  success: boolean;
  persistenceState: PersistenceState;
  finishedAt: string;
  durationMs: number | null;
}

interface PersistedBatchRunEventV3 {
  runId: string;
  size: number;
  strategy: QueensAdminGenerationStrategy;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  minimumGroupSizeSource: MinimumGroupSizeSource;
  state: TerminalRunState;
  success: boolean;
  persistenceState: PersistenceState;
  finishedAt: string;
  durationMs: number | null;
}

interface PersistedBatchHistoryV2 {
  version: 1 | 2;
  events: PersistedBatchRunEventV2[];
  processedRunIds: string[];
}

interface PersistedBatchHistoryV3 {
  version: 3;
  events: PersistedBatchRunEventV3[];
  processedRunIds: string[];
}

export interface BatchHistoryTotals {
  todayValidPuzzles: number;
  todayUniquePuzzles: number;
  todayDuplicates: number;
  totalValidPuzzles: number;
  totalUniquePuzzles: number;
  totalDuplicates: number;
}

export interface BatchHistorySizeRatioRow {
  size: number;
  orthogonalMinDistance: number;
  sampleCount: number;
  newCount: number;
  duplicateCount: number;
  newPercent: number;
  duplicatePercent: number;
}

export interface BatchHistoryStrategySummaryRow {
  size: number;
  strategy: QueensAdminGenerationStrategy;
  orthogonalMinDistance: number;
  minimumGroupSize: number;
  minimumGroupSizeSource: MinimumGroupSizeSource;
  runCount: number;
  successCount: number;
  savedCount: number;
  duplicateCount: number;
  averageMs: number | null;
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  isFastestForSize: boolean;
  isMostUniqueForSize: boolean;
}

export interface BatchHistorySnapshot {
  totals: BatchHistoryTotals;
  ratiosBySize: BatchHistorySizeRatioRow[];
  summaryRows: BatchHistoryStrategySummaryRow[];
  hasLegacyAssumedRows: boolean;
}

function todayKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function migrateHistory(raw: string | null): PersistedBatchHistoryV3 {
  try {
    if (!raw) {
      return { version: 3, events: [], processedRunIds: [] };
    }

    const parsed = JSON.parse(raw) as {
      version?: number;
      events?: unknown;
      processedRunIds?: unknown;
    };
    const processedRunIds = Array.isArray(parsed.processedRunIds)
      ? (parsed.processedRunIds as string[])
      : [];

    if (parsed.version === 3) {
      return {
        version: 3,
        events: Array.isArray(parsed.events)
          ? (parsed.events as PersistedBatchRunEventV3[]).map((event) => ({
              ...event,
              orthogonalMinDistance: isNumber(event.orthogonalMinDistance)
                ? event.orthogonalMinDistance
                : event.size,
              minimumGroupSize: isNumber(event.minimumGroupSize)
                ? event.minimumGroupSize
                : LEGACY_DEFAULT_MINIMUM_GROUP_SIZE,
              minimumGroupSizeSource:
                event.minimumGroupSizeSource === 'legacy-assumed' ? 'legacy-assumed' : 'explicit',
            }))
          : [],
        processedRunIds,
      };
    }

    if (parsed.version === 2) {
      return {
        version: 3,
        events: Array.isArray(parsed.events)
          ? (parsed.events as PersistedBatchRunEventV2[]).map((event) => ({
              ...event,
              orthogonalMinDistance: isNumber(event.orthogonalMinDistance)
                ? event.orthogonalMinDistance
                : event.size,
              minimumGroupSize: isNumber(event.minimumGroupSize)
                ? event.minimumGroupSize
                : LEGACY_DEFAULT_MINIMUM_GROUP_SIZE,
              minimumGroupSizeSource:
                event.minimumGroupSizeSource === 'legacy-assumed' ? 'legacy-assumed' : 'explicit',
            }))
          : [],
        processedRunIds,
      };
    }

    return {
      version: 3,
      events: Array.isArray(parsed.events)
        ? (parsed.events as PersistedBatchRunEventV1[]).map((event) => ({
            ...event,
            orthogonalMinDistance: event.size,
            minimumGroupSize: isNumber(event.minimumGroupSize)
              ? event.minimumGroupSize
              : LEGACY_DEFAULT_MINIMUM_GROUP_SIZE,
            minimumGroupSizeSource: isNumber(event.minimumGroupSize)
              ? 'explicit'
              : 'legacy-assumed',
          }))
        : [],
      processedRunIds,
    };
  } catch {
    return { version: 3, events: [], processedRunIds: [] };
  }
}

function readHistory(): PersistedBatchHistoryV3 {
  const history = migrateHistory(
    localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
  );
  writeHistory(history);
  return history;
}

function writeHistory(history: PersistedBatchHistoryV3): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function isTerminalRun(
  run: QueensAdminBatchRun
): run is QueensAdminBatchRun & { state: TerminalRunState } {
  return run.state === 'COMPLETED' || run.state === 'FAILED' || run.state === 'CANCELLED';
}

export function recordBatchRuns(runs: QueensAdminBatchRun[]): BatchHistorySnapshot {
  const history = readHistory();
  const processed = new Set(history.processedRunIds);

  for (const run of runs) {
    if (!isTerminalRun(run) || processed.has(run.runId) || run.success == null) {
      continue;
    }

    history.events.push({
      runId: run.runId,
      size: run.size,
      strategy: run.strategy,
      orthogonalMinDistance: run.orthogonalMinDistance,
      minimumGroupSize: run.minimumGroupSize,
      minimumGroupSizeSource: 'explicit',
      state: run.state,
      success: run.success,
      persistenceState: run.persistenceState,
      finishedAt: run.finishedAt ?? new Date().toISOString(),
      durationMs: run.durationMs,
    });
    processed.add(run.runId);
  }

  history.processedRunIds = Array.from(processed);
  writeHistory(history);
  return summarizeHistory(history);
}

export function getBatchHistorySnapshot(): BatchHistorySnapshot {
  return summarizeHistory(readHistory());
}

export function clearBatchHistory(): BatchHistorySnapshot {
  const emptyHistory: PersistedBatchHistoryV3 = {
    version: 3,
    events: [],
    processedRunIds: [],
  };
  writeHistory(emptyHistory);
  return summarizeHistory(emptyHistory);
}

function summarizeHistory(history: PersistedBatchHistoryV3): BatchHistorySnapshot {
  const today = todayKey(new Date());
  const hasLegacyAssumedRows = history.events.some(
    (event) => event.minimumGroupSizeSource === 'legacy-assumed'
  );

  const successfulEvents = history.events.filter((event) => event.success);
  const todaySuccessfulEvents = successfulEvents.filter(
    (event) => todayKey(new Date(event.finishedAt)) === today
  );

  const totalUniquePuzzles = successfulEvents.filter(
    (event) => event.persistenceState === 'SAVED'
  ).length;
  const totalDuplicates = successfulEvents.filter(
    (event) => event.persistenceState === 'DUPLICATE'
  ).length;
  const todayUniquePuzzles = todaySuccessfulEvents.filter(
    (event) => event.persistenceState === 'SAVED'
  ).length;
  const todayDuplicates = todaySuccessfulEvents.filter(
    (event) => event.persistenceState === 'DUPLICATE'
  ).length;

  const sizeSet = new Set(
    successfulEvents
      .filter(
        (event) => event.persistenceState === 'SAVED' || event.persistenceState === 'DUPLICATE'
      )
      .map((event) => `${event.size}|${event.orthogonalMinDistance}`)
  );

  const ratiosBySize = Array.from(sizeSet)
    .sort((left, right) => {
      const [leftSizeText, leftDistanceText] = left.split('|');
      const [rightSizeText, rightDistanceText] = right.split('|');
      const leftSize = Number.parseInt(leftSizeText, 10);
      const rightSize = Number.parseInt(rightSizeText, 10);
      if (leftSize !== rightSize) return leftSize - rightSize;
      return Number.parseInt(leftDistanceText, 10) - Number.parseInt(rightDistanceText, 10);
    })
    .map((key) => {
      const [sizeText, distanceText] = key.split('|');
      const size = Number.parseInt(sizeText, 10);
      const orthogonalMinDistance = Number.parseInt(distanceText, 10);
      const sample = successfulEvents
        .filter(
          (event) =>
            event.size === size &&
            event.orthogonalMinDistance === orthogonalMinDistance &&
            (event.persistenceState === 'SAVED' || event.persistenceState === 'DUPLICATE')
        )
        .sort(
          (left, right) =>
            new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime()
        )
        .slice(0, 100);

      const newCount = sample.filter((event) => event.persistenceState === 'SAVED').length;
      const duplicateCount = sample.filter(
        (event) => event.persistenceState === 'DUPLICATE'
      ).length;
      const sampleCount = sample.length;

      return {
        size,
        orthogonalMinDistance,
        sampleCount,
        newCount,
        duplicateCount,
        newPercent: sampleCount > 0 ? (newCount / sampleCount) * 100 : 0,
        duplicatePercent: sampleCount > 0 ? (duplicateCount / sampleCount) * 100 : 0,
      };
    });

  const groupedSummaries = new Map<
    string,
    {
      size: number;
      strategy: QueensAdminGenerationStrategy;
      orthogonalMinDistance: number;
      minimumGroupSize: number;
      minimumGroupSizeSource: MinimumGroupSizeSource;
      runCount: number;
      successCount: number;
      savedCount: number;
      duplicateCount: number;
      durations: number[];
    }
  >();

  for (const event of history.events) {
    const key = `${event.size}-${event.orthogonalMinDistance}-${event.strategy}-${event.minimumGroupSize}-${event.minimumGroupSizeSource}`;
    const group = groupedSummaries.get(key) ?? {
      size: event.size,
      strategy: event.strategy,
      orthogonalMinDistance: event.orthogonalMinDistance,
      minimumGroupSize: event.minimumGroupSize,
      minimumGroupSizeSource: event.minimumGroupSizeSource,
      runCount: 0,
      successCount: 0,
      savedCount: 0,
      duplicateCount: 0,
      durations: [],
    };

    group.runCount += 1;

    if (event.success) {
      group.successCount += 1;
      if (event.durationMs != null) {
        group.durations.push(event.durationMs);
      }
      if (event.persistenceState === 'SAVED') {
        group.savedCount += 1;
      }
      if (event.persistenceState === 'DUPLICATE') {
        group.duplicateCount += 1;
      }
    }

    groupedSummaries.set(key, group);
  }

  const preliminarySummaryRows = Array.from(groupedSummaries.values()).map((group) => {
    const ordered = [...group.durations].sort((left, right) => left - right);
    const averageMs =
      ordered.length > 0 ? ordered.reduce((sum, value) => sum + value, 0) / ordered.length : null;
    const medianMs =
      ordered.length === 0
        ? null
        : ordered.length % 2 === 1
          ? ordered[(ordered.length - 1) / 2]
          : (ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2;

    return {
      size: group.size,
      strategy: group.strategy,
      orthogonalMinDistance: group.orthogonalMinDistance,
      minimumGroupSize: group.minimumGroupSize,
      minimumGroupSizeSource: group.minimumGroupSizeSource,
      runCount: group.runCount,
      successCount: group.successCount,
      savedCount: group.savedCount,
      duplicateCount: group.duplicateCount,
      averageMs,
      medianMs,
      minMs: ordered[0] ?? null,
      maxMs: ordered[ordered.length - 1] ?? null,
      isFastestForSize: false,
      isMostUniqueForSize: false,
    };
  });

  const fastestByBucket = new Map<string, number>();
  const mostUniqueByBucket = new Map<string, number>();

  for (const row of preliminarySummaryRows) {
    const bucketKey = `${row.size}-${row.orthogonalMinDistance}`;
    if (row.averageMs != null) {
      const currentBest = fastestByBucket.get(bucketKey);
      if (currentBest == null || row.averageMs < currentBest) {
        fastestByBucket.set(bucketKey, row.averageMs);
      }
    }

    const currentMostUnique = mostUniqueByBucket.get(bucketKey);
    if (currentMostUnique == null || row.savedCount > currentMostUnique) {
      mostUniqueByBucket.set(bucketKey, row.savedCount);
    }
  }

  const summaryRows = preliminarySummaryRows
    .map((row) => ({
      ...row,
      isFastestForSize:
        row.averageMs != null &&
        fastestByBucket.get(`${row.size}-${row.orthogonalMinDistance}`) === row.averageMs,
      isMostUniqueForSize:
        mostUniqueByBucket.get(`${row.size}-${row.orthogonalMinDistance}`) === row.savedCount &&
        row.savedCount > 0,
    }))
    .sort((left, right) => {
      if (left.size !== right.size) return left.size - right.size;
      if (left.orthogonalMinDistance !== right.orthogonalMinDistance) {
        return left.orthogonalMinDistance - right.orthogonalMinDistance;
      }
      if (left.strategy !== right.strategy) return left.strategy.localeCompare(right.strategy);
      if (left.minimumGroupSize !== right.minimumGroupSize) {
        return left.minimumGroupSize - right.minimumGroupSize;
      }
      return left.minimumGroupSizeSource.localeCompare(right.minimumGroupSizeSource);
    });

  return {
    totals: {
      todayValidPuzzles: todaySuccessfulEvents.length,
      todayUniquePuzzles,
      todayDuplicates,
      totalValidPuzzles: successfulEvents.length,
      totalUniquePuzzles,
      totalDuplicates,
    },
    ratiosBySize,
    summaryRows,
    hasLegacyAssumedRows,
  };
}
