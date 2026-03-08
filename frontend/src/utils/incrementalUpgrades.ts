export type OneOffUpgradeId =
  | 'auto-flag'
  | 'auto-queen-color'
  | 'auto-queen-row'
  | 'auto-queen-column'
  | 'size-up';

export const BASE_TIME_SECONDS = 300;
export const MIN_TIME_SECONDS = 15;

export const RISK_SCORE_FACTOR = 1.5;
export const RISK_BASE_COST = 90;
export const RISK_COST_STEP = 20;

export const TIME_SECONDS_PER_LEVEL = 30;
export const TIME_BASE_COST = 40;
export const TIME_COST_GROWTH = 1.6;

export const AUTO_FLAG_COST = 75;
export const PATTERN_CARD_COST_STEP = 20;
export const AUTO_QUEEN_COLOR_COST = 80;
export const AUTO_QUEEN_ROW_COST = 90;
export const AUTO_QUEEN_COLUMN_COST = 90;
export const SIZE_UP_COST = 150;

export const ONE_OFF_UPGRADE_IDS: OneOffUpgradeId[] = [
  'auto-flag',
  'auto-queen-color',
  'auto-queen-row',
  'auto-queen-column',
  'size-up',
];

export function getOneOffUpgradeCost(id: OneOffUpgradeId): number {
  switch (id) {
    case 'auto-flag':
      return AUTO_FLAG_COST;
    case 'auto-queen-color':
      return AUTO_QUEEN_COLOR_COST;
    case 'auto-queen-row':
      return AUTO_QUEEN_ROW_COST;
    case 'auto-queen-column':
      return AUTO_QUEEN_COLUMN_COST;
    case 'size-up':
      return SIZE_UP_COST;
  }
}

export function getOneOffUpgradeTitle(id: OneOffUpgradeId, currentPuzzleSize: number): string {
  switch (id) {
    case 'auto-flag':
      return 'Auto Flag';
    case 'auto-queen-color':
      return 'Auto Queen: Color Group';
    case 'auto-queen-row':
      return 'Auto Queen: Row';
    case 'auto-queen-column':
      return 'Auto Queen: Column';
    case 'size-up':
      return `Size Up: ${currentPuzzleSize}x${currentPuzzleSize} -> ${currentPuzzleSize + 1}x${currentPuzzleSize + 1}`;
  }
}

export function getOneOffUpgradeDescription(id: OneOffUpgradeId): string {
  switch (id) {
    case 'auto-flag':
      return 'Automatically flags blocked squares after placing a queen.';
    case 'auto-queen-color':
      return 'Auto-place when only one square remains in a color group.';
    case 'auto-queen-row':
      return 'Auto-place when only one square remains in a row.';
    case 'auto-queen-column':
      return 'Auto-place when only one square remains in a column.';
    case 'size-up':
      return 'Move to next board size and reset all upgrades.';
  }
}
