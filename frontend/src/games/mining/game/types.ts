export type MiningPhase =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'town'
  | 'level-complete'
  | 'out-of-food'
  | 'dead';
export type MiningDepthLevel = 1 | 2 | 3 | 4;
export type MiningProgressionTab = 'food-shop' | 'gold-exchange' | 'animal-trainer' | 'ui-upgrades';
export type MiningTownStep = 'none' | 'exchange' | 'food-shop' | 'magpie-trainer' | 'tool-store';
export type MiningUpgradeCategory = 'magpie' | 'flow' | 'scanner' | 'pattern';
export type MiningFieldId = 'training-field' | 'standard-field' | 'large-field';
export type MiningFlagType = 'gold-here' | 'not-gold';
export type MiningMagpieSkillId =
  | 'buy-magpie'
  | 'auto-flag-row'
  | 'auto-flag-column'
  | 'auto-flag-diagonal'
  | 'gold-here-row'
  | 'gold-here-column'
  | 'gold-here-region'
  | 'pattern-automation-1'
  | 'pattern-automation-2';
export type MiningPermitTierId = 'basic-permit' | 'better-permit' | 'premium-permit';
export type MiningToolUpgradeId =
  | 'stronger-pick'
  | 'deeper-digging'
  | 'drill'
  | 'scanner'
  | 'auto-hauler';

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

export interface MiningFieldDefinition {
  id: MiningFieldId;
  title: string;
  description: string;
  cost: number;
  boardSize: number;
  implemented: boolean;
}

export interface MiningAutomationDefinition {
  id: MiningMagpieSkillId;
  title: string;
  description: string;
  category: MiningUpgradeCategory;
  requiredLevel: number;
  cost: number;
  effectSummary: string;
  implemented: boolean;
  requires?: MiningMagpieSkillId[];
  minDepthLevel?: MiningDepthLevel;
}

export interface MiningPermitDefinition {
  id: MiningPermitTierId;
  title: string;
  description: string;
  cost: number;
  payoutMultiplier: number;
}

export interface MiningToolUpgradeDefinition {
  id: MiningToolUpgradeId;
  title: string;
  description: string;
  category: Exclude<MiningUpgradeCategory, 'magpie'>;
  requiredLevel: number;
  cost: number;
  unlocksDepth?: MiningDepthLevel;
  effectSummary: string;
  implemented: boolean;
}

export interface MiningExchangeLevelDefinition {
  level: number;
  threshold: number;
  returnPercent: number;
  title: string;
}
