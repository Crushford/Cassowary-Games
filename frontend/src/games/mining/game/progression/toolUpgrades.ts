import type { MiningToolUpgradeDefinition, MiningToolUpgradeId } from '../types';

export const TOOL_UPGRADES: MiningToolUpgradeDefinition[] = [
  {
    id: 'stronger-pick',
    title: 'Stronger Pick',
    description:
      'Pushes the contract from dirt into stone and unlocks the first clearer rule layer.',
    cost: 1,
    unlocksDepth: 2,
    effectSummary: 'Unlocks depth 2.',
    implemented: true,
  },
  {
    id: 'deeper-digging',
    title: 'Deeper Digging',
    description: 'Lets the cassowary cut into colored claims instead of simple stone.',
    cost: 1,
    unlocksDepth: 3,
    effectSummary: 'Unlocks depth 3.',
    implemented: true,
  },
  {
    id: 'drill',
    title: 'Drill',
    description:
      'A prototype heavy tool slot for later expansion. Included now to test category shape.',
    cost: 1,
    effectSummary: 'Prototype only for now.',
    implemented: false,
  },
  {
    id: 'scanner',
    title: 'Scanner',
    description:
      'Maps region boundaries before the first dig and unlocks the current scanner layer.',
    cost: 1,
    unlocksDepth: 4,
    effectSummary: 'Unlocks depth 4.',
    implemented: true,
  },
  {
    id: 'auto-hauler',
    title: 'Auto Hauler',
    description:
      'Moves you to the next field after a full clear instead of waiting for a manual trip.',
    cost: 1,
    effectSummary: 'Automatically pays the 1 coin next-field cost after a full clear.',
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
