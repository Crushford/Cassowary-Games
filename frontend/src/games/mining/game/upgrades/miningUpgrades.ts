import type { MiningDepthLevel, MiningUpgradeDefinition, MiningUpgradeId } from '../types';

export const MINING_UPGRADES: MiningUpgradeDefinition[] = [
  {
    id: 'basic-pick',
    title: 'Magpie Starter Kit',
    description:
      'A heavier pick and a nosy magpie that learns to spot bad ground in the stone layer.',
    cost: 20,
    unlocksDepth: 2,
  },
  {
    id: 'reinforced-pick',
    title: 'Reinforced Magpie Rig',
    description:
      'A sturdier contract rig that helps the magpie read colored claims where each region hides only one seam.',
    cost: 80,
    unlocksDepth: 3,
  },
  {
    id: 'survey-scanner',
    title: 'Magpie Survey Crew',
    description: 'Hire a magpie crew to map region boundaries before the cassowary starts digging.',
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
