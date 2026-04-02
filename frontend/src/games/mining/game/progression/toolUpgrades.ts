import type { MiningToolUpgradeDefinition, MiningToolUpgradeId } from '../types';

export const TOOL_UPGRADES: MiningToolUpgradeDefinition[] = [
  {
    id: 'scanner',
    title: 'Scanner',
    description: 'Reveals color groups and enables one-gold-per-group deduction across the board.',
    category: 'scanner',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Reveals color groups and powers scanner deductions.',
  },
  {
    id: 'auto-hauler',
    title: 'Auto Next Field',
    description:
      'Preps the wagon to roll you to the next field automatically after the whole field is dug.',
    category: 'flow',
    requiredLevel: 1,
    cost: 1,
    effectSummary: 'Automatically spends the 1 gold next-field cost after the whole field is dug.',
  },
];

export function getToolUpgrade(upgradeId: MiningToolUpgradeId): MiningToolUpgradeDefinition {
  const upgrade = TOOL_UPGRADES.find((candidate) => candidate.id === upgradeId);

  if (!upgrade) {
    throw new Error(`Unknown tool upgrade: ${upgradeId}`);
  }

  return upgrade;
}
