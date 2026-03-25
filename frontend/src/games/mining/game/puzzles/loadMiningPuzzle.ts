import { keepOnlyOriginalPuzzleVariants } from '@/games/queens/utils/puzzleDiversitySelector';

import type { MiningFieldId, MiningPuzzleRecord } from '../types';

let cachedMiningPuzzlePool: MiningPuzzleRecord[] | null = null;

async function loadPuzzlePool(): Promise<MiningPuzzleRecord[]> {
  if (cachedMiningPuzzlePool) {
    return cachedMiningPuzzlePool;
  }

  const response = await fetch('/queens/puzzles.json', { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load Queens puzzles: ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, MiningPuzzleRecord[]>;
  const pool = payload['5x5'];

  if (!Array.isArray(pool) || pool.length === 0) {
    throw new Error('No 5x5 Queens puzzles available for mining.');
  }

  const originals = keepOnlyOriginalPuzzleVariants(pool);
  cachedMiningPuzzlePool = originals.length > 0 ? originals : pool;
  return cachedMiningPuzzlePool;
}

export async function loadRandomMiningPuzzle(
  previousPuzzleId?: string | null,
  fieldId: MiningFieldId = 'standard-field'
): Promise<MiningPuzzleRecord> {
  const pool = await loadPuzzlePool();
  const scopedPool = fieldId === 'training-field' ? pool.slice(0, Math.min(3, pool.length)) : pool;
  const candidatePool =
    previousPuzzleId && scopedPool.length > 1
      ? scopedPool.filter((puzzle) => puzzle.id !== previousPuzzleId)
      : scopedPool;

  const index = Math.floor(Math.random() * candidatePool.length);
  return candidatePool[index];
}

export function __resetMiningPuzzleCacheForTests(): void {
  cachedMiningPuzzlePool = null;
}
