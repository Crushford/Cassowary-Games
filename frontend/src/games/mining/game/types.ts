export type MiningPhase = 'idle' | 'loading' | 'playing' | 'level-complete';
export type MiningProgressionTab = 'gold-exchange' | 'animal-trainer' | 'ui-upgrades';
export type MiningTownStep =
  | 'none'
  | 'exchange'
  | 'magpie-trainer'
  | 'tool-store'
  | 'permit-office';
export type MiningUpgradeCategory = 'magpie' | 'flow' | 'scanner' | 'pattern' | 'plot';
export type MiningFlagType = 'gold-here' | 'not-gold';
export type MiningMagpieSkillId =
  | 'buy-magpie'
  | 'auto-flag-row'
  | 'auto-flag-column'
  | 'auto-flag-diagonal'
  | 'pattern-automation-1'
  | 'pattern-automation-2';
export type MiningToolUpgradeId = 'scanner' | 'auto-hauler';
export type MiningPlotPermitId = 'plot-6x6' | 'plot-7x7' | 'plot-8x8' | 'plot-9x9';
export type MiningRavenSkillId = 'auto-flag-row' | 'auto-flag-column' | 'auto-flag-diagonal';

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

export interface MiningLevelWinConditions {
  requireAllGold: true;
  maxDigsExclusive?: number;
}

export interface MiningLevelFailureDefinition {
  title: string;
  body: string;
  clue: string;
}

export interface MiningLevelRewardDefinition {
  id: string;
  title: string;
  body: string;
  unlocksRavenSkills?: MiningRavenSkillId[];
  unlocksToolUpgradeIds?: MiningToolUpgradeId[];
}

export interface MiningCampaignLevel {
  id: string;
  number: number;
  boardSize: 5 | 6 | 7 | 8 | 9;
  goldTarget: number;
  scannerEnabled: boolean;
  introTitle: string;
  introBody: string[];
  winConditions: MiningLevelWinConditions;
  failure: MiningLevelFailureDefinition;
  reward?: MiningLevelRewardDefinition;
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

export interface MiningPlotPermitDefinition {
  id: MiningPlotPermitId;
  title: string;
  description: string;
  category: 'plot';
  requiredLevel: number;
  cost: number;
  size: number;
  effectSummary: string;
}

export interface MiningExchangeLevelDefinition {
  level: number;
  threshold: number;
  returnPercent: number;
}
