import { keepOnlyOriginalPuzzleVariants } from '@/games/queens/utils/puzzleDiversitySelector';
import { loadQueensPuzzleCatalogForSize } from '@/games/queens/utils/puzzleCatalog';

import type { MiningPuzzleRecord } from '../types';

const cachedMiningPuzzlePools = new Map<number, MiningPuzzleRecord[]>();

async function loadPuzzlePool(size: number): Promise<MiningPuzzleRecord[]> {
  const cachedPool = cachedMiningPuzzlePools.get(size);
  if (cachedPool) {
    return cachedPool;
  }

  const payload = (await loadQueensPuzzleCatalogForSize(`${size}x${size}`)) as Record<
    string,
    MiningPuzzleRecord[]
  >;
  const sizeKey = `${size}x${size}`;
  const pool = payload[sizeKey];

  if (!Array.isArray(pool) || pool.length === 0) {
    throw new Error(`No ${sizeKey} Queens puzzles available for mining.`);
  }

  const originals = keepOnlyOriginalPuzzleVariants(pool);
  const dedupedPool = originals.length > 0 ? originals : pool;
  cachedMiningPuzzlePools.set(size, dedupedPool);
  return dedupedPool;
}

export async function loadRandomMiningPuzzle(
  previousPuzzleId?: string | null,
  size = 5
): Promise<MiningPuzzleRecord> {
  const pool = await loadPuzzlePool(size);
  const candidatePool =
    previousPuzzleId && pool.length > 1
      ? pool.filter((puzzle) => puzzle.id !== previousPuzzleId)
      : pool;

  const index = Math.floor(Math.random() * candidatePool.length);
  return candidatePool[index];
}

export function __resetMiningPuzzleCacheForTests(): void {
  cachedMiningPuzzlePools.clear();
}
