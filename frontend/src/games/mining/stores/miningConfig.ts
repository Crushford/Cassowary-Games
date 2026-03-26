import type { MiningDepthLevel, MiningToolUpgradeId } from '../game/types';

export const MINING_SAVE_KEY = 'mining-save-v1';
export const DIG_COST = 1;
export const LEVEL_COMPLETE_DELAY_MS = 700;
export const STARTING_COINS = 20;
export const STARTING_FOOD = 30;
export const FOOD_SHOP_COST = 1;
export const FOOD_SHOP_AMOUNT = 30;
export const GOLD_EXCHANGE_RATE = 1;
export const NEXT_FIELD_COST = 1;

export const TOOL_EXPLANATIONS: Partial<Record<MiningToolUpgradeId, string>> = {
  'stronger-pick':
    'The first equipment step unlocks the stone layer. Depth lives in Tools; field profile stays separate in the new menu.',
  'deeper-digging':
    'The rig now reaches region logic. The board is the same hidden Queens seam, but the layer explains more.',
  scanner:
    'The scanner unlocks the mapped region layer without changing the underlying board model.',
  'auto-hauler':
    'The crew can roll straight into the next field after a clear, as long as 1 coin is available for travel.',
};

export function getDepthTitle(depthLevel: MiningDepthLevel): string {
  switch (depthLevel) {
    case 4:
      return 'Scanner Layer';
    case 3:
      return 'Region Layer';
    case 2:
      return 'Stone Layer';
    default:
      return 'Dirt Layer';
  }
}

export function getDepthSummary(depthLevel: MiningDepthLevel): string {
  switch (depthLevel) {
    case 4:
      return 'Your survey tools expose region borders before the first swing.';
    case 3:
      return 'The earth breaks into colored claims. One seam per region.';
    case 2:
      return 'Stone starts talking. Quartz marks impossible ground.';
    default:
      return 'No hints. Just dirt, cost pressure, and the pattern you can learn.';
  }
}
