import type { MiningExchangeLevelDefinition, MiningToolUpgradeId } from '../game/types';

export const MINING_SAVE_KEY = 'mining-save-v1';
export const DIG_COST = 1;
export const LEVEL_COMPLETE_DELAY_MS = 700;
export const DAYS_PER_MONTH = 28;
export const STARTING_COINS = 20;
export const STARTING_FOOD = 0;
export const MONTHLY_UPKEEP_COST = 1;
export const GOLD_EXCHANGE_RATE = 1;
export const NEXT_FIELD_COST = 1;
export const DEFAULT_LEVEL_RETURN_PERCENT = 0;

// TODO: all exchange thresholds and upgrade prices need real balancing later.
export const EXCHANGE_LEVELS: MiningExchangeLevelDefinition[] = [
  { level: 0, threshold: 0, returnPercent: 0, title: 'Prospector' },
  { level: 1, threshold: 100, returnPercent: 3, title: 'Level 1' },
  { level: 2, threshold: 200, returnPercent: 6, title: 'Level 2' },
  { level: 3, threshold: 300, returnPercent: 10, title: 'Level 3' },
];

export const TOOL_EXPLANATIONS: Partial<Record<MiningToolUpgradeId, string>> = {
  'stronger-pick':
    'The crew now earns better gold payouts and can buy the next wave of survey upgrades.',
  'deeper-digging':
    'Surveying now supports region-based lessons without changing the underlying hidden seam layout.',
  scanner: 'The scanner finishes the current survey ladder and raises the value of a good strike.',
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
