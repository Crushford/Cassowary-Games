export type DepthPhase =
  | 'idle'
  | 'preview'
  | 'playing'
  | 'round-complete'
  | 'level-complete'
  | 'game-over'
  | 'game-complete';

export type RiskProfile = 'forty' | 'twenty' | 'single';

export type TurnRuleType =
  | 'basic-reveal'
  | 'column-reveal'
  | 'column-choice-reveal'
  | 'dealer-follow-up';

export type SupportMode = 'exact' | 'row-summary' | 'board-summary' | 'debug';

export type RevealActor = 'player' | 'dealer' | 'effect';

export type DeckAssignmentMode = 'uniform' | 'by-depth' | 'by-row' | 'row-depth-matrix';

export interface DeckArchetype {
  id: string;
  name: string;
  cards: number[];
  backingColor: string;
  riskProfile: RiskProfile;
}

export interface LevelMetadataInput {
  id: number;
  name: string;
  description?: string;
  tags?: string[];
  draft?: boolean;
}

export interface LevelEconomyInput {
  startingBank: number;
  rounds: number;
  minBet: number;
  maxBet: number;
}

export interface LevelBoardInput {
  rows: number;
  columns: number;
  depth: number;
}

export interface UniformDeckAssignmentInput {
  mode: 'uniform';
  deckId: string;
}

export interface ByDepthDeckAssignmentInput {
  mode: 'by-depth';
  depthDeckIds: string[];
}

export interface ByRowDeckAssignmentInput {
  mode: 'by-row';
  rowDeckIds: string[];
}

export interface RowDepthMatrixDeckAssignmentInput {
  mode: 'row-depth-matrix';
  matrix: string[][];
}

export type LevelDeckAssignmentInput =
  | UniformDeckAssignmentInput
  | ByDepthDeckAssignmentInput
  | ByRowDeckAssignmentInput
  | RowDepthMatrixDeckAssignmentInput;

export interface LevelRuleInput {
  turnRule: TurnRuleType;
  dealerEnabled?: boolean;
  dealerAfterPlayer?: boolean;
}

export interface LevelSupportInput {
  supportMode?: SupportMode;
  showExactRemainingValues?: boolean;
  showRowAverages?: boolean;
  showBoardAverage?: boolean;
}

export interface LevelTestingInput {
  shuffleSeed?: string;
  debugLogging?: boolean;
  allowLevelInspector?: boolean;
  forcedDeckOrder?: number[];
}

export interface LevelInput {
  metadata: LevelMetadataInput;
  economy: LevelEconomyInput;
  board: LevelBoardInput;
  decks: LevelDeckAssignmentInput;
  rules: LevelRuleInput;
  support: LevelSupportInput;
  testing?: LevelTestingInput;
}

export interface BuiltLevelDefinition {
  id: number;
  name: string;
  description?: string;
  tags: string[];
  draft: boolean;
  startingBank: number;
  rounds: number;
  minBet: number;
  maxBet: number;
  rows: number;
  columns: number;
  depth: number;
  turnRule: TurnRuleType;
  supportMode: SupportMode;
  showExactRemainingValues: boolean;
  showRowAverages: boolean;
  showBoardAverage: boolean;
  dealerEnabled: boolean;
  dealerAfterPlayer: boolean;
  deckMatrix: string[][];
  testing?: LevelTestingInput;
}

export interface CardState {
  value: number;
  backingColor: string;
  archetypeId: string;
  layerIndex: number;
  revealed: boolean;
  revealedBy: RevealActor | null;
}

export interface StackState {
  row: number;
  col: number;
  cards: CardState[];
}

export interface BoardState {
  rows: number;
  columns: number;
  depth: number;
  stacks: StackState[][];
}

export interface PositionRef {
  row: number;
  col: number;
}

export interface RevealRecord {
  row: number;
  col: number;
  layerIndex: number;
  cardValue: number;
  bet: number;
  payout: number;
  net: number;
  revealedBy: RevealActor;
}

export interface TurnResolution {
  board: BoardState;
  playerReveals: RevealRecord[];
  dealerReveals: RevealRecord[];
  totalPayout: number;
  totalNet: number;
  nextBank: number;
}

export interface GameRunState {
  phase: DepthPhase;
  bank: number;
  currentLevel: number;
  currentRound: number;
}

export interface RoundState {
  board: BoardState | null;
  pendingBet: number;
  selectedPosition: PositionRef | null;
  roundStartBank: number;
  history: RevealRecord[];
  lastResolution: TurnResolution | null;
}
