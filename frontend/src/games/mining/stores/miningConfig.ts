import type { MiningExchangeLevelDefinition, MiningToolUpgradeId } from '../game/types';

export const MINING_SAVE_KEY = 'mining-save-v1';
export const MINING_SAVE_VERSION = 1;
export const DIG_COST = 1;
export const LEVEL_COMPLETE_DELAY_MS = 700;
export const DAYS_PER_MONTH = 28;
export const STARTING_COINS = 20;
export const STARTING_FOOD = 0;
export const MONTHLY_UPKEEP_COST = 1;
export const GOLD_EXCHANGE_RATE = 100;
export const GOLD_REWARD_PER_TILE = 1;
export const NEXT_FIELD_COST = 1;
export const DEFAULT_LEVEL_RETURN_PERCENT = 0;

// TODO: all exchange thresholds and upgrade prices need real balancing later.
export const EXCHANGE_LEVELS: MiningExchangeLevelDefinition[] = [
  { level: 1, threshold: 0, returnPercent: 3 },
  { level: 2, threshold: 14, returnPercent: 6 },
  { level: 3, threshold: 28, returnPercent: 10 },
];

export const TOOL_EXPLANATIONS: Partial<Record<MiningToolUpgradeId, string>> = {
  scanner:
    'The scanner reveals region groups and teaches the crew to rule out the rest of a group once a gold seam there is confirmed.',
  'auto-hauler':
    'Once the whole field is dug out, the crew can roll straight into the next field if 1 coin is available for travel.',
};

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
