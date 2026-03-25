export type MiningPhase = 'idle' | 'loading' | 'playing' | 'level-complete' | 'dead';
export type MiningDepthLevel = 1 | 2 | 3 | 4;
export type MiningProgressionTab = 'field' | 'automation' | 'permits' | 'upgrades';
export type MiningFieldId = 'training-field' | 'standard-field' | 'large-field';
export type MiningMagpieSkillId =
  | 'buy-magpie'
  | 'teach-row-rule'
  | 'teach-column-rule'
  | 'teach-diagonal-rule'
  | 'teach-pattern-recognition';
export type MiningPermitTierId = 'basic-permit' | 'better-permit' | 'premium-permit';
export type MiningToolUpgradeId = 'stronger-pick' | 'deeper-digging' | 'drill' | 'scanner';

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
  cost: number;
  effectSummary: string;
  implemented: boolean;
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
  cost: number;
  unlocksDepth?: MiningDepthLevel;
  effectSummary: string;
  implemented: boolean;
}
