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

type FlipMode = 'none' | 'horizontal' | 'vertical';

interface TransformSpec {
  rotationsCW: 0 | 1 | 2 | 3;
  flipMode: FlipMode;
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

function keyForPos(pos: Pos): string {
  return keyForCell(pos.row, pos.col);
}

function sortedPositions(positions: Pos[]): Pos[] {
  return [...positions].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

function serializePositions(positions: Pos[]): string {
  return sortedPositions(positions)
    .map(keyForPos)
    .join('|');
}

function rotateCoord(pos: Pos, size: number, rotationsCW: number): Pos {
  switch (rotationsCW % 4) {
    case 0:
      return { row: pos.row, col: pos.col };
    case 1:
      return { row: pos.col, col: size - 1 - pos.row };
    case 2:
      return { row: size - 1 - pos.row, col: size - 1 - pos.col };
    case 3:
      return { row: size - 1 - pos.col, col: pos.row };
    default:
      return { row: pos.row, col: pos.col };
  }
}

function flipHorizontally(pos: Pos, size: number): Pos {
  return {
    row: pos.row,
    col: size - 1 - pos.col,
  };
}

function flipVertically(pos: Pos, size: number): Pos {
  return {
    row: size - 1 - pos.row,
    col: pos.col,
  };
}

function transformCoord(pos: Pos, size: number, rotationsCW: number, flipMode: FlipMode): Pos {
  const rotated = rotateCoord(pos, size, rotationsCW);
  if (flipMode === 'horizontal') {
    return flipHorizontally(rotated, size);
  }
  if (flipMode === 'vertical') {
    return flipVertically(rotated, size);
  }
  return rotated;
}

function buildVariantSignature(activeCells: Pos[], outputFlags: Pos[]): string {
  const activePart = serializePositions(activeCells);
  const outputPart = serializePositions(outputFlags);
  return `A:${activePart};F:${outputPart}`;
}

const patternVariantCache = new Map<string, PatternCardVariant[]>();

const TRANSFORM_SPECS: TransformSpec[] = (['none', 'horizontal', 'vertical'] as const).flatMap(
  (flipMode) =>
    ([0, 1, 2, 3] as const).map((rotationsCW) => ({
      rotationsCW,
      flipMode,
    }))
);

function extractActiveCells(card: PatternCardDefinition): Pos[] {
  return card.cells
    .filter((cell) => cell.activeSquare === true)
    .map((cell) => ({ row: cell.row, col: cell.col }));
}

function buildVariant(
  card: PatternCardDefinition,
  activeCells: Pos[],
  transform: TransformSpec
): PatternCardVariant {
  const transformedActive = activeCells.map((pos) =>
    transformCoord(pos, card.size, transform.rotationsCW, transform.flipMode)
  );
  const transformedFlags = card.outputFlags.map((pos) =>
    transformCoord(pos, card.size, transform.rotationsCW, transform.flipMode)
  );
  const sortedActive = sortedPositions(transformedActive);

  return {
    size: card.size,
    activeCells: sortedActive,
    activeSet: new Set(sortedActive.map(keyForPos)),
    outputFlags: sortedPositions(transformedFlags),
  };
}

function getPatternCardVariants(card: PatternCardDefinition): PatternCardVariant[] {
  const cached = patternVariantCache.get(card.id);
  if (cached) {
    return cached;
  }

  const activeCells = extractActiveCells(card);

  const uniqueVariants = new Map<string, PatternCardVariant>();

  for (const transform of TRANSFORM_SPECS) {
    const variant = buildVariant(card, activeCells, transform);
    const signature = buildVariantSignature(variant.activeCells, variant.outputFlags);
    if (!uniqueVariants.has(signature)) {
      uniqueVariants.set(signature, variant);
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

  // Non-active cells are implicitly "other" in this 3..9 square window.
  for (let relRow = 0; relRow < variant.size; relRow++) {
    for (let relCol = 0; relCol < variant.size; relCol++) {
      const square = grid[baseRow + relRow]?.[baseCol + relCol];
      const isActive = variant.activeSet.has(keyForCell(relRow, relCol));

      if (isActive) {
        if (!square?.groupColor) {
          return false;
        }
        if (square.groupColor !== focusColor) {
          return false;
        }
      } else {
        if (!square?.groupColor) {
          continue;
        }
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
  canPlaceFlagAt: (row: number, col: number) => boolean = () => true
): Pos[] {
  const placements: Pos[] = [];
  const seen = new Set<string>();
  const gridSize = grid.length;
  const variants = getPatternCardVariants(card);

  for (const variant of variants) {
    for (let baseRow = -(variant.size - 1); baseRow <= gridSize - 1; baseRow++) {
      for (let baseCol = -(variant.size - 1); baseCol <= gridSize - 1; baseCol++) {
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
