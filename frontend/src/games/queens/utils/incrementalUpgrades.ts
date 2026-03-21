export type OneOffUpgradeId =
  | 'auto-flag'
  | 'auto-next-puzzle'
  | 'rotate-puzzle'
  | 'auto-queen-color'
  | 'auto-queen-row'
  | 'auto-queen-column'
  | 'size-up';

export const BASE_TIME_SECONDS = 300;
export const MIN_TIME_SECONDS = 15;

export const RISK_SCORE_FACTOR = 3;
export const RISK_BASE_COST = 90;
export const RISK_COST_STEP = 20;

export const TIME_SECONDS_PER_LEVEL = 30;
export const TIME_BASE_COST = 40;
export const TIME_COST_GROWTH = 1.6;

export const AUTO_FLAG_COST = 75;
export const AUTO_NEXT_PUZZLE_COST = 180;
export const ROTATE_PUZZLE_COST = 260;
export const PATTERN_CARD_COST_STEP = 20;
export const AUTO_QUEEN_COLOR_COST = 350;
export const AUTO_QUEEN_ROW_COST = 400;
export const AUTO_QUEEN_COLUMN_COST = 400;
export const SIZE_UP_COST = 5000;

export const TIMER_URGENT_SECONDS = 20;
export const TIMER_WARNING_SECONDS = 60;

// 'size-up' and 'auto-queen-*' are handled via dedicated purchase flows, not rolled as random upgrades
export const ONE_OFF_UPGRADE_IDS: OneOffUpgradeId[] = [
  'auto-flag',
  'auto-next-puzzle',
  'rotate-puzzle',
];

export function getOneOffUpgradeCost(id: OneOffUpgradeId): number {
  switch (id) {
    case 'auto-flag':
      return AUTO_FLAG_COST;
    case 'auto-next-puzzle':
      return AUTO_NEXT_PUZZLE_COST;
    case 'rotate-puzzle':
      return ROTATE_PUZZLE_COST;
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
    case 'auto-next-puzzle':
      return 'Auto Next Puzzle';
    case 'rotate-puzzle':
      return 'Rotate Puzzle';
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
    case 'auto-next-puzzle':
      return 'Unlocks auto-start for the next puzzle after a solve.';
    case 'rotate-puzzle':
      return 'Puzzles rotate after each move and solved puzzles score 3x points.';
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
