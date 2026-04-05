import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'queens-admin-batch-history-v2';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

describe('batch history migration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorage());
    localStorage.clear();
  });

  it('migrates missing minimum group sizes to legacy default 3 and persists v2', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [
          {
            runId: 'legacy-1',
            size: 4,
            strategy: 'baseline',
            minimumGroupSize: null,
            state: 'COMPLETED',
            success: true,
            persistenceState: 'DUPLICATE',
            finishedAt: '2026-04-04T10:00:00.000Z',
            durationMs: 25,
          },
        ],
        processedRunIds: ['legacy-1'],
      })
    );

    const { getBatchHistorySnapshot } = await import('./batchHistory');
    const snapshot = getBatchHistorySnapshot();

    expect(snapshot.hasLegacyAssumedRows).toBe(true);
    expect(snapshot.summaryRows).toHaveLength(1);
    expect(snapshot.summaryRows[0]).toMatchObject({
      size: 4,
      strategy: 'baseline',
      minimumGroupSize: 3,
      minimumGroupSizeSource: 'legacy-assumed',
      duplicateCount: 1,
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(saved).toMatchObject({
      version: 2,
      processedRunIds: ['legacy-1'],
      events: [
        {
          runId: 'legacy-1',
          minimumGroupSize: 3,
          minimumGroupSizeSource: 'legacy-assumed',
        },
      ],
    });
  });

  it('keeps existing numeric minimum group sizes and marks them explicit during migration', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [
          {
            runId: 'legacy-2',
            size: 5,
            strategy: 'marker-guided',
            minimumGroupSize: 4,
            state: 'COMPLETED',
            success: true,
            persistenceState: 'SAVED',
            finishedAt: '2026-04-04T10:00:00.000Z',
            durationMs: 125,
          },
        ],
        processedRunIds: ['legacy-2'],
      })
    );

    const { getBatchHistorySnapshot } = await import('./batchHistory');
    const snapshot = getBatchHistorySnapshot();

    expect(snapshot.summaryRows[0]).toMatchObject({
      minimumGroupSize: 4,
      minimumGroupSizeSource: 'explicit',
      savedCount: 1,
    });
  });

  it('keeps explicit and legacy-assumed min region 3 rows separate in the summary', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [
          {
            runId: 'legacy-3',
            size: 6,
            strategy: 'baseline',
            minimumGroupSize: null,
            state: 'COMPLETED',
            success: true,
            persistenceState: 'DUPLICATE',
            finishedAt: '2026-04-04T10:00:00.000Z',
            durationMs: 90,
          },
        ],
        processedRunIds: ['legacy-3'],
      })
    );

    const { getBatchHistorySnapshot, recordBatchRuns } = await import('./batchHistory');
    recordBatchRuns([
      {
        runId: 'new-1',
        size: 6,
        strategy: 'baseline',
        queenCountMode: 'exact',
        targetQueenCount: 6,
        orthogonalMinDistance: 6,
        minimumGroupSize: 3,
        state: 'COMPLETED',
        coloredCellCount: 36,
        totalCellCount: 36,
        durationMs: 80,
        success: true,
        error: null,
        startedAt: '2026-04-05T10:00:00.000Z',
        finishedAt: '2026-04-05T10:00:10.000Z',
        persistenceState: 'SAVED',
        persistenceMessage: null,
        savedPuzzleId: 'p-1',
        encodedPuzzleLayout: null,
      },
    ]);

    const snapshot = getBatchHistorySnapshot();
    const rows = snapshot.summaryRows.filter(
      (row) => row.size === 6 && row.strategy === 'baseline' && row.minimumGroupSize === 3
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.minimumGroupSizeSource).sort()).toEqual([
      'explicit',
      'legacy-assumed',
    ]);
  });

  it('does not change already migrated history when read multiple times', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [
          {
            runId: 'legacy-4',
            size: 4,
            strategy: 'baseline',
            minimumGroupSize: null,
            state: 'COMPLETED',
            success: true,
            persistenceState: 'DUPLICATE',
            finishedAt: '2026-04-04T10:00:00.000Z',
            durationMs: 20,
          },
        ],
        processedRunIds: ['legacy-4'],
      })
    );

    const { getBatchHistorySnapshot } = await import('./batchHistory');
    getBatchHistorySnapshot();
    const once = localStorage.getItem(STORAGE_KEY);
    getBatchHistorySnapshot();
    const twice = localStorage.getItem(STORAGE_KEY);

    expect(twice).toBe(once);
  });
});
