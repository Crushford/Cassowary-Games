import type { GroundDeckDefinition, GroundType, ToolTier } from '../game/types';

export const GROUND_DECKS: Record<GroundType, GroundDeckDefinition> = {
  dirt: {
    id: 'dirt',
    label: 'Dirt',
    cards: [1, 2, 0, 0, 0],
    digTime: 1,
    processingTime: 0,
  },
  rock: {
    id: 'rock',
    label: 'Rock',
    cards: [3, 2, 0, 0, 0],
    digTime: 1,
    processingTime: 1,
  },
  quartz: {
    id: 'quartz',
    label: 'Quartz',
    cards: [5, 5, 0, 0, 0],
    digTime: 3,
    processingTime: 3,
  },
};

const TOOL_TIER_ORDER: Record<ToolTier, number> = {
  dirt: 1,
  rock: 2,
  quartz: 3,
};

export function canMineGroundType(toolTier: ToolTier, groundType: GroundType): boolean {
  return TOOL_TIER_ORDER[toolTier] >= TOOL_TIER_ORDER[groundType];
}

export function getGroundDeck(groundType: GroundType): GroundDeckDefinition {
  return GROUND_DECKS[groundType];
}
