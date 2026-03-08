import type { GridSquare, MarkType, Pos } from '../types/types';

export interface PatternCell {
  row: number;
  col: number;
  activeSquare?: boolean;
}

export interface PatternCardDefinition {
  id: string;
  cost: number;
  size: 3 | 4 | 5 | 6 | 7 | 8 | 9;
  cells: PatternCell[];
  outputFlags: Pos[];
}

interface PatternCardVariant {
  size: number;
  activeCells: Pos[];
  activeSet: Set<string>;
  outputFlags: Pos[];
}

export const PATTERN_CARD_DEFINITIONS: PatternCardDefinition[] = [
  {
    id: 'pattern-new-card',
    cost: 60,
    size: 3,
    cells: [
      { row: 0, col: 1, activeSquare: true },
      { row: 1, col: 1, activeSquare: true },
      { row: 1, col: 2, activeSquare: true },
    ],
    outputFlags: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 1 },
    ],
  },
];

export function getPatternCardById(id: string): PatternCardDefinition | null {
  return PATTERN_CARD_DEFINITIONS.find((card) => card.id === id) || null;
}

function keyForCell(row: number, col: number): string {
  return `${row},${col}`;
}

function sortedPositions(positions: Pos[]): Pos[] {
  return [...positions].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

function rotateCoord(pos: Pos, size: number, rotationsCW: number): Pos {
  let row = pos.row;
  let col = pos.col;

  for (let i = 0; i < rotationsCW; i++) {
    const nextRow = col;
    const nextCol = size - 1 - row;
    row = nextRow;
    col = nextCol;
  }

  return { row, col };
}

function flipHorizontally(pos: Pos, size: number): Pos {
  return {
    row: pos.row,
    col: size - 1 - pos.col,
  };
}

function transformCoord(pos: Pos, size: number, rotationsCW: number, mirrorH: boolean): Pos {
  const rotated = rotateCoord(pos, size, rotationsCW);
  return mirrorH ? flipHorizontally(rotated, size) : rotated;
}

function buildVariantSignature(activeCells: Pos[], outputFlags: Pos[]): string {
  const activePart = sortedPositions(activeCells)
    .map((pos) => `${pos.row},${pos.col}`)
    .join('|');
  const outputPart = sortedPositions(outputFlags)
    .map((pos) => `${pos.row},${pos.col}`)
    .join('|');
  return `A:${activePart};F:${outputPart}`;
}

const patternVariantCache = new Map<string, PatternCardVariant[]>();

function getPatternCardVariants(card: PatternCardDefinition): PatternCardVariant[] {
  const cached = patternVariantCache.get(card.id);
  if (cached) {
    return cached;
  }

  const activeCells = card.cells
    .filter((cell) => cell.activeSquare === true)
    .map((cell) => ({ row: cell.row, col: cell.col }));

  const uniqueVariants = new Map<string, PatternCardVariant>();

  for (const mirrorH of [false, true]) {
    for (let rotationsCW = 0; rotationsCW < 4; rotationsCW++) {
      const transformedActive = activeCells.map((pos) =>
        transformCoord(pos, card.size, rotationsCW, mirrorH)
      );
      const transformedFlags = card.outputFlags.map((pos) =>
        transformCoord(pos, card.size, rotationsCW, mirrorH)
      );

      const signature = buildVariantSignature(transformedActive, transformedFlags);
      if (uniqueVariants.has(signature)) {
        continue;
      }

      const sortedActive = sortedPositions(transformedActive);
      uniqueVariants.set(signature, {
        size: card.size,
        activeCells: sortedActive,
        activeSet: new Set(sortedActive.map((pos) => keyForCell(pos.row, pos.col))),
        outputFlags: sortedPositions(transformedFlags),
      });
    }
  }

  const variants = Array.from(uniqueVariants.values());
  patternVariantCache.set(card.id, variants);
  return variants;
}

function hasRequiredStructureAt(
  grid: GridSquare[][],
  baseRow: number,
  baseCol: number,
  variant: PatternCardVariant
): boolean {
  if (variant.activeCells.length === 0) {
    return false;
  }

  const anchor = variant.activeCells[0];
  const anchorRow = anchor.row;
  const anchorCol = anchor.col;

  const anchorSquare = grid[baseRow + anchorRow]?.[baseCol + anchorCol];
  const focusColor = anchorSquare?.groupColor;
  if (!focusColor) {
    return false;
  }

  // "Other" is default for every non-active cell in the card window.
  for (let relRow = 0; relRow < variant.size; relRow++) {
    for (let relCol = 0; relCol < variant.size; relCol++) {
      const square = grid[baseRow + relRow]?.[baseCol + relCol];
      if (!square?.groupColor) {
        return false;
      }

      const isActive = variant.activeSet.has(keyForCell(relRow, relCol));
      if (isActive) {
        if (square.groupColor !== focusColor) {
          return false;
        }
      } else {
        if (square.groupColor === focusColor) {
          return false;
        }
      }
    }
  }

  return true;
}

export function collectPatternFlagPlacements(
  grid: GridSquare[][],
  playerMarks: MarkType[][],
  card: PatternCardDefinition,
  canPlaceFlagAt: (row: number, col: number) => boolean
): Pos[] {
  const placements: Pos[] = [];
  const seen = new Set<string>();
  const gridSize = grid.length;
  const variants = getPatternCardVariants(card);

  for (const variant of variants) {
    for (let baseRow = 0; baseRow <= gridSize - variant.size; baseRow++) {
      for (let baseCol = 0; baseCol <= gridSize - variant.size; baseCol++) {
        if (!hasRequiredStructureAt(grid, baseRow, baseCol, variant)) {
          continue;
        }

        for (const output of variant.outputFlags) {
          const row = baseRow + output.row;
          const col = baseCol + output.col;

          if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
            continue;
          }

          if (playerMarks[row][col] !== null) {
            continue;
          }

          if (!canPlaceFlagAt(row, col)) {
            continue;
          }

          const key = keyForCell(row, col);
          if (seen.has(key)) {
            continue;
          }

          seen.add(key);
          placements.push({ row, col });
        }
      }
    }
  }

  return placements;
}
