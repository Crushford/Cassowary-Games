export type MiningPhase =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'town'
  | 'level-complete'
  | 'out-of-food'
  | 'dead';
export type MiningProgressionTab = 'food-shop' | 'gold-exchange' | 'animal-trainer' | 'ui-upgrades';
export type MiningTownStep = 'none' | 'exchange' | 'food-shop' | 'magpie-trainer' | 'tool-store';
export type MiningUpgradeCategory = 'magpie' | 'flow' | 'scanner' | 'pattern';
export type MiningFlagType = 'gold-here' | 'not-gold';
export type MiningMagpieSkillId =
  | 'buy-magpie'
  | 'auto-flag-row'
  | 'auto-flag-column'
  | 'auto-flag-diagonal'
  | 'pattern-automation-1'
  | 'pattern-automation-2';
export type MiningToolUpgradeId = 'scanner' | 'auto-hauler';

export interface PositionRef {
  row: number;
  col: number;
}

export interface MiningPuzzleRecord {
  id: string;
  name?: string;
  layout: string;
  queens: string;
}

export interface MiningLevelBoard {
  puzzleId: string;
  size: number;
  truthGold: boolean[][];
  regionIds: string[][];
}

export interface MiningAutomationDefinition {
  id: MiningMagpieSkillId;
  title: string;
  description: string;
  category: MiningUpgradeCategory;
  requiredLevel: number;
  cost: number;
  effectSummary: string;
  requires?: MiningMagpieSkillId[];
}

export interface MiningToolUpgradeDefinition {
  id: MiningToolUpgradeId;
  title: string;
  description: string;
  category: Exclude<MiningUpgradeCategory, 'magpie'>;
  requiredLevel: number;
  cost: number;
  effectSummary: string;
}

export interface MiningExchangeLevelDefinition {
  level: number;
  threshold: number;
  returnPercent: number;
}
