export type GroundType = 'dirt' | 'rock' | 'quartz';
export type ToolTier = GroundType;
export type MiningPhase = 'idle' | 'playing' | 'claim-complete';

export interface GroundDeckDefinition {
  id: GroundType;
  label: string;
  cards: number[];
  digTime: number;
  processingTime: number;
}

export interface ClaimDefinition {
  id: string;
  name: string;
  description: string;
  rows: number;
  columns: number;
  depth: number;
  deckMatrix: GroundType[][];
}

export interface GroundTileState {
  id: string;
  row: number;
  col: number;
  layerIndex: number;
  groundType: GroundType;
  goldValue: number;
  digTime: number;
  processingTime: number;
  maxDensity: number;
  currentDensity: number;
  cleared: boolean;
}

export interface GroundStackState {
  row: number;
  col: number;
  tiles: GroundTileState[];
}

export interface ClaimBoardState {
  rows: number;
  columns: number;
  depth: number;
  stacks: GroundStackState[][];
}

export interface PositionRef {
  row: number;
  col: number;
}

export interface ProcessingLoad {
  groundType: GroundType;
  label: string;
  goldValue: number;
  remainingDays: number;
  totalDays: number;
}

export interface DigResult {
  ok: boolean;
  message?: string;
  board?: ClaimBoardState;
  processingLoad?: ProcessingLoad | null;
  goldAwarded?: number;
  tailingsAdded?: number;
  daysSpent?: number;
}

export interface ProcessResult {
  ok: boolean;
  message?: string;
  processingLoad?: ProcessingLoad | null;
  goldAwarded?: number;
  tailingsAdded?: number;
  daysSpent?: number;
}

export interface UpgradeDefinition {
  id: string;
  title: string;
  description: string;
  cost: number;
}

export interface FloatingResult {
  row: number;
  col: number;
  message: string;
  tone: 'neutral' | 'success' | 'warning';
}
