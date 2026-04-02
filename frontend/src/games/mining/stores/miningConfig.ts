import type { MiningExchangeLevelDefinition } from '../game/types';

export const MINING_SAVE_KEY = 'mining-save-v1';
export const MINING_SAVE_VERSION = 3;
export const DIG_COST = 1;
export const LEVEL_COMPLETE_DELAY_MS = 700;
export const STARTING_GOLD = 0;
export const GOLD_REWARD_PER_TILE = 1;
export const NEXT_FIELD_COST = 1;
export const DEFAULT_LEVEL_RETURN_PERCENT = 0;

// TODO: all exchange thresholds and upgrade prices need real balancing later.
export const EXCHANGE_LEVELS: MiningExchangeLevelDefinition[] = [
  { level: 1, threshold: 0, returnPercent: 3 },
  { level: 2, threshold: 7, returnPercent: 6 },
  { level: 3, threshold: 14, returnPercent: 9 },
  { level: 4, threshold: 28, returnPercent: 12 },
];

export function getExchangeLevelForMonthlyGold(monthlyGold: number): MiningExchangeLevelDefinition {
  let current = EXCHANGE_LEVELS[0];

  for (const level of EXCHANGE_LEVELS) {
    if (monthlyGold >= level.threshold) {
      current = level;
    }
  }

  return current;
}

export function getNextExchangeLevel(monthlyGold: number): MiningExchangeLevelDefinition | null {
  return EXCHANGE_LEVELS.find((level) => monthlyGold < level.threshold) ?? null;
}
