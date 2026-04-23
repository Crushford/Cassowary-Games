import type { CSSProperties } from 'vue';
import type { MarkType } from '../../types/types';

export interface PuzzleBoardCellViewModel {
  rowIndex: number;
  colIndex: number;
  boardSize: number;
  backgroundClass: string;
  frameClass: string;
  overlayClass?: string | null;
  blackoutColorInsetClass?: string | null;
  backgroundStyle?: CSSProperties;
  playerMark: MarkType;
  showSolutionQueen: boolean;
  showSeamFill: boolean;
  seamFillLabel?: string | null;
  showErrorFeedback: boolean;
  isInError: boolean;
  isAutoFlagAnimating: boolean;
  autoFlagAnimationSource: 'blocked' | 'pattern' | null;
  isTutorialTarget: boolean;
  ariaLabel: string;
}

export interface PuzzleBoardAdapter {
  gridSize: number;
  grid: unknown[][];
  playerMarks?: MarkType[][];
  cells: PuzzleBoardCellViewModel[][];
  hintEvidenceCellKeys?: Iterable<string> | null;
  hintOutputCellKeys?: Iterable<string> | null;
  onCellActivate?: ((row: number, col: number) => void) | null;
  placeFlag?: ((row: number, col: number) => void) | null;
}
