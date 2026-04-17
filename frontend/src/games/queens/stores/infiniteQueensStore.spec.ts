import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInfiniteQueensStore } from './infiniteQueensStore';
import type { InfiniteQueensCatalogRecord } from '../utils/infiniteQueensCatalog';

function makeLinkedRecord(x: number, y: number): InfiniteQueensCatalogRecord {
  const leftFingerprints = ['R0000000', 'R0130405', 'R1111111'];
  const topFingerprints = ['C0000000', 'C0040103', 'C2222222'];
  const rightFingerprints = ['R0130405', 'R1111111', 'R2222222'];
  const bottomFingerprints = ['C0040103', 'C2222222', 'C3333333'];
  const left = leftFingerprints[x] ?? `R${x}${y}${x}${y}${x}${y}${x}`;
  const top = topFingerprints[y] ?? `C${x}${y}${x}${y}${x}${y}${x}`;
  const right = rightFingerprints[x] ?? `R${x}${y}${x}${y}${x}${y}${x}`;
  const bottom = bottomFingerprints[y] ?? `C${x}${y}${x}${y}${x}${y}${x}`;
  const pieceKind =
    x === 0 && y === 0
      ? 'TOP_LEFT'
      : x === 0
        ? 'BOTTOM_LEFT'
        : y === 0
          ? 'TOP_RIGHT'
          : 'BOTTOM_RIGHT';
  const pieceCategory =
    x === 0 && y === 0
      ? 'STANDARD'
      : left !== 'R0000000' && top !== 'C0000000'
        ? 'BOTH'
        : left !== 'R0000000'
          ? 'LEFT_ONLY'
          : 'TOP_ONLY';

  return {
    id: `${x},${y}`,
    size: 7,
    layout: 'abcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefg',
    queens: '.................................................',
    pieceKind,
    pieceCategory,
    boardSize: 7,
    orthogonalMinDistance: 5,
    targetQueenCount: 10,
    queenCount: 0,
    leftBlackoutSignature: Array(7).fill(0),
    topBlackoutSignature: Array(7).fill(0),
    leftBlackoutFingerprint: left,
    topBlackoutFingerprint: top,
    rightBleedFingerprint: right,
    bottomBleedFingerprint: bottom,
    fingerprintKey: `${left}${top}`,
    generationStrategy: 'baseline',
    isSeed: x === 0 && y === 0,
  };
}

function buildStitchingCatalog(): InfiniteQueensCatalogRecord[] {
  return Array.from({ length: 3 }, (_, y) =>
    Array.from({ length: 3 }, (_, x) => makeLinkedRecord(x, y))
  ).flat();
}

describe('useInfiniteQueensStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('boots from a stitched 2x2 seed world and expands right/down on demand', async () => {
    const records = buildStitchingCatalog();
    const startingPuzzle = records.find((record) => record.isSeed);
    const byFingerprint = Object.fromEntries(
      records
        .filter((record) => !record.isSeed)
        .reduce<Array<[string, InfiniteQueensCatalogRecord[]]>>((accumulator, record) => {
          const existing = accumulator.find(([key]) => key === record.fingerprintKey);
          if (existing) {
            existing[1].push(record);
          } else {
            accumulator.push([record.fingerprintKey, [record]]);
          }
          return accumulator;
        }, [])
    );

    const indexPayload = {
      byFingerprint,
      startingPuzzles: startingPuzzle ? [startingPuzzle] : [],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/queens/stitching/index.json')) {
          return new Response(JSON.stringify(indexPayload), { status: 200 });
        }
        return new Response('not found', { status: 404 });
      })
    );

    const store = useInfiniteQueensStore();
    await store.startGame();

    expect(store.isReady).toBe(true);
    expect(store.chunks.size).toBe(4);
    expect(store.worldBounds.maxX).toBe(1);
    expect(store.worldBounds.maxY).toBe(1);
    expect(store.viewport.row).toBe(0);
    expect(store.viewport.col).toBe(0);
    expect(store.visibleCells).toHaveLength(store.viewport.height);
    expect(store.visibleCells[0]).toHaveLength(store.viewport.width);

    const expandedRight = await store.moveViewport(0, 7);
    expect(expandedRight).toBe(true);
    expect(store.worldBounds.maxX).toBe(2);
    expect(store.chunks.size).toBe(6);

    const expandedDown = await store.moveViewport(7, 0);
    expect(expandedDown).toBe(true);
    expect(store.worldBounds.maxY).toBe(2);
    expect(store.chunks.size).toBe(9);
  });
});
