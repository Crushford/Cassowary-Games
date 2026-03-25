export type MiningPhase = 'idle' | 'loading' | 'playing' | 'level-complete';

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
}

export interface MiningUpgradeDefinition {
  id: 'auto-flag';
  title: string;
  description: string;
  cost: number;
}
