import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInfiniteQueensCatalogIndex,
  findByFingerprintKey,
  findByLeftFingerprint,
  findByTopFingerprint,
  loadInfiniteQueensCatalog,
  loadRecordsForEntries,
  pickCandidate,
  type InfiniteQueensCatalogRecord,
} from './infiniteQueensCatalog';

function makeRecord(
  overrides: Partial<InfiniteQueensCatalogRecord> = {}
): InfiniteQueensCatalogRecord {
  return {
    id: 'seed',
    size: 7,
    layout: 'abcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefg',
    queens: '.................................................',
    pieceKind: 'TOP_LEFT',
    pieceCategory: 'STANDARD',
    boardSize: 7,
    orthogonalMinDistance: 5,
    targetQueenCount: 10,
    queenCount: 0,
    leftBlackoutSignature: Array(7).fill(0),
    topBlackoutSignature: Array(7).fill(0),
    leftBlackoutFingerprint: 'R0000000',
    topBlackoutFingerprint: 'C0000000',
    rightBleedFingerprint: 'R0000000',
    bottomBleedFingerprint: 'C0000000',
    fingerprintKey: 'R0000000C0000000',
    generationStrategy: 'baseline',
    isSeed: false,
    blackoutFillOverrides: [],
    blackoutFillOverrideByIndex: {},
    ...overrides,
  };
}

describe('infiniteQueensCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and indexes seed and adjacency lookup buckets from the new object catalog', async () => {
    const startingPuzzle = makeRecord({
      id: 'seed-a',
      isSeed: true,
      leftBlackoutFingerprint: 'R0000000',
      topBlackoutFingerprint: 'C0000000',
      rightBleedFingerprint: 'R0130405',
      bottomBleedFingerprint: 'C0040103',
      fingerprintKey: 'R0000000C0000000',
    });
    const rightPuzzle = makeRecord({
      id: 'right-a',
      pieceKind: 'TOP_RIGHT',
      pieceCategory: 'LEFT_ONLY',
      leftBlackoutFingerprint: 'R0130405',
      topBlackoutFingerprint: 'C0000000',
      rightBleedFingerprint: 'R1111111',
      bottomBleedFingerprint: 'C0040103',
      fingerprintKey: 'R0130405C0000000',
    });
    const downPuzzle = makeRecord({
      id: 'down-a',
      pieceKind: 'BOTTOM_LEFT',
      pieceCategory: 'TOP_ONLY',
      leftBlackoutFingerprint: 'R0000000',
      topBlackoutFingerprint: 'C0040103',
      rightBleedFingerprint: 'R0130405',
      bottomBleedFingerprint: 'C1111111',
      fingerprintKey: 'R0000000C0040103',
    });
    const bothPuzzle = makeRecord({
      id: 'both-a',
      pieceKind: 'BOTTOM_RIGHT',
      pieceCategory: 'BOTH',
      leftBlackoutFingerprint: 'R0130405',
      topBlackoutFingerprint: 'C0040103',
      rightBleedFingerprint: 'R2222222',
      bottomBleedFingerprint: 'C2222222',
      fingerprintKey: 'R0130405C0040103',
    });

    const indexPayload = {
      byFingerprint: {
        R0130405C0000000: [rightPuzzle],
        R0000000C0040103: [downPuzzle],
        R0130405C0040103: [bothPuzzle],
      },
      startingPuzzles: [startingPuzzle],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/queens/stitching/index.json')) {
        return new Response(JSON.stringify(indexPayload), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const index = await loadInfiniteQueensCatalog();
    expect(index.seedEntries.length).toBe(1);
    const seedRecords = await loadRecordsForEntries(index, index.seedEntries);
    expect(seedRecords).toHaveLength(1);
    expect(seedRecords[0]?.id).toBe('seed-a');
    expect(await findByLeftFingerprint(index, 'R0130405')).toHaveLength(2);
    expect(await findByTopFingerprint(index, 'C0040103')).toHaveLength(2);
    const both = await findByFingerprintKey(index, 'R0130405C0040103');
    expect(both).toHaveLength(1);
    expect(both[0]?.pieceKind).toBe('BOTTOM_RIGHT');
  });

  it('prefers non-recent candidates when available', () => {
    const index = buildInfiniteQueensCatalogIndex([
      makeRecord({ id: 'a', isSeed: true }),
      makeRecord({ id: 'b', isSeed: true }),
    ]);

    const candidate = pickCandidate(index.seedRecords, new Set(['a']));
    expect(candidate?.id).toBe('b');
  });
});
