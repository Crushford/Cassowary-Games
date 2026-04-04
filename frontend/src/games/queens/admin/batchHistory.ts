import type { QueensAdminBatchRun, QueensAdminGenerationStrategy } from './types';

const STORAGE_KEY = 'queens-admin-batch-history-v1';

type TerminalRunState = 'COMPLETED' | 'FAILED' | 'CANCELLED';
type PersistenceState = QueensAdminBatchRun['persistenceState'];

interface PersistedBatchRunEvent {
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

interface PersistedBatchHistory {
  version: 1;
  events: PersistedBatchRunEvent[];
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
  sampleCount: number;
  newCount: number;
  duplicateCount: number;
  newPercent: number;
  duplicatePercent: number;
}

export interface BatchHistoryStrategySummaryRow {
  size: number;
  strategy: QueensAdminGenerationStrategy;
  minimumGroupSize: number | null;
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
}

function todayKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function readHistory(): PersistedBatchHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: 1, events: [], processedRunIds: [] };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedBatchHistory>;
    return {
      version: 1,
      events: Array.isArray(parsed.events) ? (parsed.events as PersistedBatchRunEvent[]) : [],
      processedRunIds: Array.isArray(parsed.processedRunIds)
        ? (parsed.processedRunIds as string[])
        : [],
    };
  } catch {
    return { version: 1, events: [], processedRunIds: [] };
  }
}

function writeHistory(history: PersistedBatchHistory): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
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
      minimumGroupSize: run.minimumGroupSize,
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

function summarizeHistory(history: PersistedBatchHistory): BatchHistorySnapshot {
  const today = todayKey(new Date());

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
      .map((event) => event.size)
  );

  const ratiosBySize = Array.from(sizeSet)
    .sort((left, right) => left - right)
    .map((size) => {
      const sample = successfulEvents
        .filter(
          (event) =>
            event.size === size &&
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
      minimumGroupSize: number | null;
      runCount: number;
      successCount: number;
      savedCount: number;
      duplicateCount: number;
      durations: number[];
    }
  >();

  for (const event of history.events) {
    const key = `${event.size}-${event.strategy}-${event.minimumGroupSize ?? 'unknown'}`;
    const group = groupedSummaries.get(key) ?? {
      size: event.size,
      strategy: event.strategy,
      minimumGroupSize: event.minimumGroupSize ?? null,
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
      minimumGroupSize: group.minimumGroupSize,
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

  const fastestBySize = new Map<number, number>();
  const mostUniqueBySize = new Map<number, number>();

  for (const row of preliminarySummaryRows) {
    if (row.averageMs != null) {
      const currentBest = fastestBySize.get(row.size);
      if (currentBest == null || row.averageMs < currentBest) {
        fastestBySize.set(row.size, row.averageMs);
      }
    }

    const currentMostUnique = mostUniqueBySize.get(row.size);
    if (currentMostUnique == null || row.savedCount > currentMostUnique) {
      mostUniqueBySize.set(row.size, row.savedCount);
    }
  }

  const summaryRows = preliminarySummaryRows
    .map((row) => ({
      ...row,
      isFastestForSize: row.averageMs != null && fastestBySize.get(row.size) === row.averageMs,
      isMostUniqueForSize: mostUniqueBySize.get(row.size) === row.savedCount && row.savedCount > 0,
    }))
    .sort((left, right) => {
      if (left.size !== right.size) return left.size - right.size;
      if (left.strategy !== right.strategy) return left.strategy.localeCompare(right.strategy);
      return (
        (left.minimumGroupSize ?? Number.MAX_SAFE_INTEGER) -
        (right.minimumGroupSize ?? Number.MAX_SAFE_INTEGER)
      );
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
  };
}
