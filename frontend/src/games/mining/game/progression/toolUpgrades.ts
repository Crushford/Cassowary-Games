import type { MiningToolUpgradeDefinition, MiningToolUpgradeId } from '../types';

export const TOOL_UPGRADES: MiningToolUpgradeDefinition[] = [
  {
    id: 'stronger-pick',
    title: 'Stronger Pick',
    description: 'A sturdier pick improves the crew and unlocks more training options.',
    category: 'scanner',
    requiredLevel: 4,
    cost: 1,
    effectSummary: 'Unlocks the next survey tier.',
    implemented: false,
  },
  {
    id: 'deeper-digging',
    title: 'Deeper Digging',
    description: 'Better surveying opens up claim-based lessons for the magpie.',
    category: 'scanner',
    requiredLevel: 4,
    cost: 1,
    effectSummary: 'Unlocks region-based lessons.',
    implemented: false,
  },
  {
    id: 'drill',
    title: 'Drill',
    description:
      'A prototype heavy tool slot for later expansion. Included now to test category shape.',
    category: 'scanner',
    requiredLevel: 4,
    cost: 1,
    effectSummary: 'Prototype only for now.',
    implemented: false,
  },
  {
    id: 'scanner',
    title: 'Scanner',
    description: 'Adds a more reliable survey pass before the crew starts digging.',
    category: 'scanner',
    requiredLevel: 3,
    cost: 1,
    effectSummary: 'Reveals region groups on the board.',
    implemented: true,
  },
  {
    id: 'auto-hauler',
    title: 'Auto Next Field',
    description:
      'Preps the wagon to roll you to the next field automatically after the whole field is dug.',
    category: 'flow',
    requiredLevel: 1,
    cost: 1,
    effectSummary: 'Automatically pays the 1 coin next-field cost after the whole field is dug.',
    implemented: true,
  },
];

export function getToolUpgrade(upgradeId: MiningToolUpgradeId): MiningToolUpgradeDefinition {
  const upgrade = TOOL_UPGRADES.find((candidate) => candidate.id === upgradeId);

  if (!upgrade) {
    throw new Error(`Unknown tool upgrade: ${upgradeId}`);
  }

  return upgrade;
}
