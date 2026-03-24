import type { ToolTier, UpgradeDefinition } from '../types';

export const ROCK_TOOL_UPGRADE: UpgradeDefinition = {
  id: 'rock-tool',
  title: 'Stronger Shovel',
  description: 'Lets you work rock squares and send them to processing.',
  cost: 6,
};

export const QUARTZ_TOOL_UPGRADE: UpgradeDefinition = {
  id: 'quartz-tool',
  title: 'Quartz Pick',
  description: 'Lets you work quartz seams.',
  cost: 14,
};

export function getPowerUpgrade(power: number): UpgradeDefinition {
  const nextPower = power + 1;

  return {
    id: `power-${nextPower}`,
    title: `Shovel Power ${nextPower}`,
    description: `Increase digging power from ${power} to ${nextPower}.`,
    cost: nextPower * 8,
  };
}

export function getToolTierLabel(toolTier: ToolTier): string {
  switch (toolTier) {
    case 'quartz':
      return 'Quartz Pick';
    case 'rock':
      return 'Rock Shovel';
    default:
      return 'Dirt Shovel';
  }
}
