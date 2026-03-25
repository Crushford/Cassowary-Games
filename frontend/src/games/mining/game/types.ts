export type MiningPhase = 'idle' | 'loading' | 'playing' | 'level-complete' | 'dead';
export type MiningDepthLevel = 1 | 2 | 3 | 4;
export type MiningUpgradeId = 'basic-pick' | 'reinforced-pick' | 'survey-scanner';

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

export interface MiningUpgradeDefinition {
  id: MiningUpgradeId;
  title: string;
  description: string;
  cost: number;
  unlocksDepth: MiningDepthLevel;
}
