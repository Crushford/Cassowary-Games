import type { MiningDepthLevel, MiningUpgradeDefinition, MiningUpgradeId } from '../types';

export const MINING_UPGRADES: MiningUpgradeDefinition[] = [
  {
    id: 'basic-pick',
    title: 'Basic Pick',
    description: 'Unlock the stone layer. Stone reveals quartz impossibilities and neutral rock.',
    cost: 20,
    unlocksDepth: 2,
  },
  {
    id: 'reinforced-pick',
    title: 'Reinforced Pick',
    description: 'Unlock the region layer. Each color region can hold only one gold tile.',
    cost: 80,
    unlocksDepth: 3,
  },
  {
    id: 'survey-scanner',
    title: 'Survey Scanner',
    description: 'Unlock the scanner layer. Region maps are visible before you dig.',
    cost: 320,
    unlocksDepth: 4,
  },
];

export function getMiningUpgrade(upgradeId: MiningUpgradeId): MiningUpgradeDefinition {
  const upgrade = MINING_UPGRADES.find((candidate) => candidate.id === upgradeId);

  if (!upgrade) {
    throw new Error(`Unknown mining upgrade: ${upgradeId}`);
  }

  return upgrade;
}

export function getGoldRewardForDepth(depthLevel: MiningDepthLevel): number {
  switch (depthLevel) {
    case 4:
      return 40;
    case 3:
      return 20;
    case 2:
      return 10;
    default:
      return 5;
  }
}
