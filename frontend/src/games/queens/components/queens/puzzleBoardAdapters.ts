import type { GridSquare } from '../../types/types';
import type {
  InfiniteQueensStore,
  InfiniteQueensWorldCell,
} from '../../stores/infiniteQueensStore';
import type { ScrollingQueensStore } from '../../stores/scrollingQueensStore';
import type { useQueensStore } from '../../stores/queensStore';
import {
  getRegionAppearanceBackgroundClass,
  getRegionAppearanceTokens,
} from '../../utils/colorPalette';
import { assignRegionPaletteColors } from '../../utils/regionDisplay';
import type { PuzzleBoardAdapter, PuzzleBoardCellViewModel } from './puzzleBoardTypes';
import type { RegionAppearance } from '../../types/types';

type QueensStoreInstance = ReturnType<typeof useQueensStore>;

function toCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

const CLASSIC_REGION_TOKENS = getRegionAppearanceTokens('repeat-base-colors');

function backgroundClassForSlot(slot: number | null): string {
  const index = slot == null ? 0 : Math.abs(slot) % CLASSIC_REGION_TOKENS.length;
  const token = CLASSIC_REGION_TOKENS[index];
  return `bg-group-${token.color}-${token.shade}`;
}

function overlayClassForAppearance(appearance: RegionAppearance | undefined): string | null {
  if (!appearance || appearance.pattern === 'solid') return null;
  return {
    diagonal: 'region-pattern-diagonal',
    dots: 'region-pattern-dots',
    crosshatch: 'region-pattern-crosshatch',
  }[appearance.pattern];
}

function buildClassicCellView(
  store: QueensStoreInstance,
  rowIndex: number,
  colIndex: number
): PuzzleBoardCellViewModel {
  const gridCell = store.grid[rowIndex]?.[colIndex] as GridSquare | undefined;
  const playerMark = store.playerMarks[rowIndex]?.[colIndex] ?? null;
  const appearance = gridCell?.groupAppearance;
  const isBlackout = gridCell?.isBlackout === true;
  const hasColor = !!gridCell?.groupColor;
  const blackoutColorInsetClass =
    isBlackout && hasColor
      ? appearance
        ? getRegionAppearanceBackgroundClass(appearance)
        : 'bg-semantic-primary-500'
      : null;
  const color = gridCell?.groupColor ?? 'unknown';
  const rowLabel = String.fromCharCode(65 + rowIndex);
  const colLabel = colIndex + 1;

  let ariaLabel = isBlackout
    ? `Square at row ${rowLabel}, column ${colLabel}, blacked out`
    : `Square at row ${rowLabel}, column ${colLabel}, color ${color}`;
  if (playerMark === 'queen') {
    ariaLabel += ', contains queen';
  } else if (playerMark === 'flag') {
    ariaLabel += ', flagged';
  } else {
    ariaLabel += ', empty';
  }

  if (
    store.isTutorialMode &&
    store.currentTutorialTarget &&
    store.currentTutorialTarget.row === rowIndex &&
    store.currentTutorialTarget.col === colIndex
  ) {
    ariaLabel += ', this is the target square for the current tutorial step';
  }

  const overlayClass =
    appearance?.pattern && appearance.pattern !== 'solid'
      ? {
          diagonal: 'region-pattern-diagonal',
          dots: 'region-pattern-dots',
          crosshatch: 'region-pattern-crosshatch',
        }[appearance.pattern]
      : null;

  return {
    rowIndex,
    colIndex,
    boardSize: store.gridSize,
    backgroundClass: isBlackout
      ? 'bg-semantic-neutral-900'
      : appearance
        ? getRegionAppearanceBackgroundClass(appearance)
        : 'bg-semantic-neutral-700',
    frameClass: 'border border-queens-gridLine',
    overlayClass,
    blackoutColorInsetClass,
    backgroundStyle: undefined,
    playerMark,
    showSolutionQueen: store.showSolution && gridCell?.isSolutionQueen === true,
    showSeamFill: false,
    seamFillLabel: null,
    showErrorFeedback:
      store.showErrorFeedback &&
      !!store.errorFeedbackSquare &&
      store.errorFeedbackSquare.row === rowIndex &&
      store.errorFeedbackSquare.col === colIndex,
    isInError: store.isSquareInError(rowIndex, colIndex),
    isAutoFlagAnimating: store.isAutoFlagAnimating(rowIndex, colIndex),
    autoFlagAnimationSource: store.getAutoFlagAnimationSource(rowIndex, colIndex),
    isTutorialTarget:
      store.isTutorialMode &&
      !!store.currentTutorialTarget &&
      store.currentTutorialTarget.row === rowIndex &&
      store.currentTutorialTarget.col === colIndex,
    ariaLabel,
  };
}

export function buildClassicPuzzleBoardAdapter(
  store: QueensStoreInstance,
  options?: {
    onCellActivate?: ((row: number, col: number) => void) | null;
  }
): PuzzleBoardAdapter {
  return {
    gridSize: store.gridSize,
    grid: store.grid,
    playerMarks: store.playerMarks,
    cells: Array.from({ length: store.gridSize }, (_, rowIndex) =>
      Array.from({ length: store.gridSize }, (_, colIndex) =>
        buildClassicCellView(store, rowIndex, colIndex)
      )
    ),
    hintEvidenceCellKeys: store.hintEvidenceCellKeys,
    hintOutputCellKeys: store.hintOutputCellKeys,
    onCellActivate: options?.onCellActivate ?? store.handleSquareClick.bind(store),
    placeFlag: store.placeFlag.bind(store),
  };
}

function buildInfiniteCellView(
  store: InfiniteQueensStore,
  cell: InfiniteQueensWorldCell,
  appearance: RegionAppearance | undefined
): PuzzleBoardCellViewModel {
  const key = toCellKey(cell.worldRow, cell.worldCol);
  const overlayClass = overlayClassForAppearance(appearance);

  return {
    rowIndex: cell.worldRow,
    colIndex: cell.worldCol,
    boardSize: store.visibleCells.length,
    backgroundClass: cell.isBlackout
      ? 'bg-semantic-neutral-700'
      : appearance
        ? getRegionAppearanceBackgroundClass({
            ...appearance,
            mode: 'pattern-variants',
          })
        : backgroundClassForSlot(cell.displayGroupSlot),
    frameClass: 'border border-queens-gridLine',
    overlayClass,
    blackoutColorInsetClass: null,
    backgroundStyle: undefined,
    playerMark: cell.playerMark,
    showSolutionQueen: false,
    showSeamFill: false,
    seamFillLabel: null,
    showErrorFeedback: false,
    isInError: store.errorCellKeys.has(key),
    isAutoFlagAnimating: false,
    autoFlagAnimationSource: null,
    isTutorialTarget: false,
    ariaLabel: `World row ${cell.worldRow + 1}, column ${cell.worldCol + 1}`,
  };
}

export function buildInfinitePuzzleBoardAdapter(
  store: InfiniteQueensStore,
  options?: {
    onCellActivate?: ((row: number, col: number) => void) | null;
  }
): PuzzleBoardAdapter {
  const visibleRows = store.visibleCells;
  const gridSize = visibleRows.length;
  const dummyGrid = Array.from({ length: store.viewport.height }, () =>
    Array.from({ length: store.viewport.width }, () => null)
  );
  const appearanceGrid = assignRegionPaletteColors(
    visibleRows.map((row) =>
      row.map((cell) => ({
        position: { row: cell.worldRow, col: cell.worldCol },
        groupColor: cell.isBlackout ? undefined : (cell.displayGroupId ?? undefined),
        isSolutionQueen: cell.isSolutionQueen,
      }))
    ),
    'pattern-variants'
  );

  return {
    gridSize,
    grid: dummyGrid,
    playerMarks: Array.from({ length: gridSize }, (_, rowIndex) =>
      Array.from(
        { length: gridSize },
        (_, colIndex) => visibleRows[rowIndex]?.[colIndex]?.playerMark ?? null
      )
    ),
    cells: visibleRows.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        buildInfiniteCellView(store, cell, appearanceGrid[rowIndex]?.[colIndex]?.groupAppearance)
      )
    ),
    hintEvidenceCellKeys: [],
    hintOutputCellKeys: [],
    onCellActivate: options?.onCellActivate ?? store.handleCellClick.bind(store),
    placeFlag: null,
  };
}

function buildScrollingCellView(
  store: ScrollingQueensStore,
  rowIndex: number,
  colIndex: number
): PuzzleBoardCellViewModel {
  const gridCell = store.grid[rowIndex]?.[colIndex] as GridSquare | undefined;
  const playerMark = store.playerMarks[rowIndex]?.[colIndex] ?? null;
  const appearance = gridCell?.groupAppearance;
  const isBlackout = gridCell?.isBlackout === true;
  const color = gridCell?.groupColor ?? 'unknown';

  let ariaLabel = `Row ${rowIndex + 1}, column ${colIndex + 1}, color ${color}`;
  if (isBlackout) {
    ariaLabel = `Row ${rowIndex + 1}, column ${colIndex + 1}, blacked out`;
  }
  if (playerMark === 'queen') {
    ariaLabel += ', contains queen';
  } else if (playerMark === 'flag') {
    ariaLabel += ', flagged';
  } else {
    ariaLabel += ', empty';
  }

  return {
    rowIndex,
    colIndex,
    boardSize: store.colCount,
    backgroundClass: isBlackout
      ? 'bg-semantic-neutral-900'
      : appearance
        ? getRegionAppearanceBackgroundClass(appearance)
        : 'bg-semantic-neutral-700',
    frameClass: 'border border-queens-gridLine',
    overlayClass: overlayClassForAppearance(appearance),
    blackoutColorInsetClass: null,
    backgroundStyle: undefined,
    playerMark,
    showSolutionQueen: store.showSolution && gridCell?.isSolutionQueen === true,
    showSeamFill: false,
    seamFillLabel: null,
    showErrorFeedback: false,
    isInError: store.isSquareInError(rowIndex, colIndex),
    isAutoFlagAnimating: store.isAutoFlagAnimating(rowIndex, colIndex),
    autoFlagAnimationSource: store.getAutoFlagAnimationSource(rowIndex, colIndex),
    isTutorialTarget: store.hintOutputCellKeys.has(toCellKey(rowIndex, colIndex)),
    ariaLabel,
  };
}

export function buildScrollingPuzzleBoardAdapter(store: ScrollingQueensStore): {
  rowCount: number;
  colCount: number;
  cells: PuzzleBoardCellViewModel[][];
  onCellActivate: (row: number, col: number) => void;
} {
  return {
    rowCount: store.rowCount,
    colCount: store.colCount,
    cells: store.grid.map((row, rowIndex) =>
      row.map((_, colIndex) => buildScrollingCellView(store, rowIndex, colIndex))
    ),
    onCellActivate: store.handleSquareClick,
  };
}
