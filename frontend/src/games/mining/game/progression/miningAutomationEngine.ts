import type { GridSquare, MarkType } from '@/games/queens/types/types';
import {
  collectPatternFlagPlacements,
  getPatternCardById,
  type PatternCardDefinition,
} from '@/games/queens/utils/incrementalPatternCards';

import { buildSelectiveAutoFlagGrid } from '../rules/autoFlag';
import type { MiningFlagType, MiningMagpieSkillId, PositionRef } from '../types';

export interface MiningAutomationAction {
  type: 'placeNotGoldFlag';
  row: number;
  col: number;
}

interface MiningAutomationOptions {
  size: number;
  revealed: boolean[][];
  systemFlags: Array<Array<MiningFlagType | null>>;
  revealedGoldPositions: PositionRef[];
  regionIds: string[][];
  ownedSkillIds: MiningMagpieSkillId[];
  scannerEnabled: boolean;
  maxIterations?: number;
}

const PATTERN_CARD_BY_SKILL: Partial<Record<MiningMagpieSkillId, string>> = {
  'pattern-automation-1': 'pc-1',
  'pattern-automation-2': 'pc-2',
};

function cloneFlagGrid(
  flags: Array<Array<MiningFlagType | null>>
): Array<Array<MiningFlagType | null>> {
  return flags.map((row) => [...row]);
}

function buildQueensGrid(size: number, regionIds: string[][]): GridSquare[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      position: { row, col },
      groupColor: regionIds[row]?.[col] ?? undefined,
    }))
  );
}

function buildQueensMarks(
  flags: Array<Array<MiningFlagType | null>>,
  revealed: boolean[][]
): MarkType[][] {
  return flags.map((row, rowIndex) =>
    row.map((flag, colIndex) => {
      if (revealed[rowIndex][colIndex]) {
        return 'invalid';
      }

      if (flag === 'not-gold') {
        return 'flag';
      }

      if (flag === 'gold-here') {
        return 'queen';
      }

      return null;
    })
  );
}

function collectAutoFlagActions(
  size: number,
  revealed: boolean[][],
  currentFlags: Array<Array<MiningFlagType | null>>,
  confirmedGoldPositions: PositionRef[],
  ownedSkillIds: MiningMagpieSkillId[]
): MiningAutomationAction[] {
  const autoFlagGrid = buildSelectiveAutoFlagGrid(confirmedGoldPositions, revealed, size, {
    row: ownedSkillIds.includes('auto-flag-row'),
    column: ownedSkillIds.includes('auto-flag-column'),
    diagonal: ownedSkillIds.includes('auto-flag-diagonal'),
  });
  const actions: MiningAutomationAction[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!autoFlagGrid[row][col]) {
        continue;
      }

      if (revealed[row][col] || currentFlags[row][col] !== null) {
        continue;
      }

      actions.push({
        type: 'placeNotGoldFlag',
        row,
        col,
      });
    }
  }

  return actions;
}

function collectScannerActions(options: {
  size: number;
  revealed: boolean[][];
  currentFlags: Array<Array<MiningFlagType | null>>;
  confirmedGoldPositions: PositionRef[];
  regionIds: string[][];
  scannerEnabled: boolean;
}): MiningAutomationAction[] {
  const { size, revealed, currentFlags, confirmedGoldPositions, regionIds, scannerEnabled } =
    options;
  if (!scannerEnabled) {
    return [];
  }

  const confirmedRegions = new Set<string>();
  for (const position of confirmedGoldPositions) {
    const regionId = regionIds[position.row]?.[position.col];
    if (regionId && regionId !== '.') {
      confirmedRegions.add(regionId);
    }
  }

  if (confirmedRegions.size === 0) {
    return [];
  }

  const actions: MiningAutomationAction[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const regionId = regionIds[row]?.[col];
      if (!regionId || regionId === '.' || !confirmedRegions.has(regionId)) {
        continue;
      }

      const isConfirmedGold = confirmedGoldPositions.some(
        (position) => position.row === row && position.col === col
      );
      if (isConfirmedGold || revealed[row][col] || currentFlags[row][col] !== null) {
        continue;
      }

      actions.push({
        type: 'placeNotGoldFlag',
        row,
        col,
      });
    }
  }

  return actions;
}

function getOwnedPatternCards(ownedSkillIds: MiningMagpieSkillId[]): PatternCardDefinition[] {
  return ownedSkillIds
    .map((skillId) => PATTERN_CARD_BY_SKILL[skillId])
    .filter((cardId): cardId is string => Boolean(cardId))
    .map((cardId) => getPatternCardById(cardId))
    .filter((card): card is PatternCardDefinition => card !== null);
}

function summarizeMarks(marks: MarkType[][]) {
  let open = 0;
  let flagged = 0;
  let blocked = 0;
  let queens = 0;

  for (const row of marks) {
    for (const mark of row) {
      if (mark === null) {
        open += 1;
      } else if (mark === 'flag') {
        flagged += 1;
      } else if (mark === 'queen') {
        queens += 1;
      } else {
        blocked += 1;
      }
    }
  }

  return { open, flagged, queens, blocked };
}

function collectPatternActions(options: {
  size: number;
  revealed: boolean[][];
  currentFlags: Array<Array<MiningFlagType | null>>;
  regionIds: string[][];
  ownedSkillIds: MiningMagpieSkillId[];
}): MiningAutomationAction[] {
  const { size, revealed, currentFlags, regionIds, ownedSkillIds } = options;
  const patternCards = getOwnedPatternCards(ownedSkillIds);
  if (patternCards.length === 0) {
    return [];
  }

  const grid = buildQueensGrid(size, regionIds);
  const marks = buildQueensMarks(currentFlags, revealed);
  const workingMarks = marks.map((row) => [...row]);
  const actions: MiningAutomationAction[] = [];
  const seen = new Set<string>();

  console.log('[mining][pattern-automation] starting pass', {
    ownedCards: patternCards.map((card) => card.id),
    markSummary: summarizeMarks(workingMarks),
  });

  for (let wave = 0; wave < size * size; wave += 1) {
    let addedAny = false;

    for (const card of patternCards) {
      const matches = collectPatternFlagPlacements(grid, workingMarks, card);

      console.log('[mining][pattern-automation] card evaluation', {
        cardId: card.id,
        wave,
        matches,
        markSummary: summarizeMarks(workingMarks),
      });

      if (matches.length === 0) {
        continue;
      }

      for (const match of matches) {
        const key = `${match.row},${match.col}`;
        if (workingMarks[match.row][match.col] !== null || seen.has(key)) {
          continue;
        }

        workingMarks[match.row][match.col] = 'flag';
        seen.add(key);
        actions.push({
          type: 'placeNotGoldFlag',
          row: match.row,
          col: match.col,
        });
        addedAny = true;
      }
    }

    if (!addedAny) {
      console.log('[mining][pattern-automation] no further placements', {
        wave,
        totalPlacements: actions,
      });
      break;
    }
  }

  if (actions.length > 0) {
    console.log('[mining][pattern-automation] placements applied', {
      placements: actions,
    });
  }

  return actions;
}

export function buildMiningAutomationPlan({
  size,
  revealed,
  systemFlags,
  revealedGoldPositions,
  regionIds,
  ownedSkillIds,
  scannerEnabled,
  maxIterations = 100,
}: MiningAutomationOptions): MiningAutomationAction[] {
  const actions: MiningAutomationAction[] = [];
  const workingFlags = cloneFlagGrid(systemFlags);

  for (let wave = 0; wave < maxIterations; wave += 1) {
    let changed = false;

    const waveActions = [
      ...collectAutoFlagActions(size, revealed, workingFlags, revealedGoldPositions, ownedSkillIds),
      ...collectScannerActions({
        size,
        revealed,
        currentFlags: workingFlags,
        confirmedGoldPositions: revealedGoldPositions,
        regionIds,
        scannerEnabled,
      }),
      ...collectPatternActions({
        size,
        revealed,
        currentFlags: workingFlags,
        regionIds,
        ownedSkillIds,
      }),
    ];

    for (const action of waveActions) {
      if (workingFlags[action.row][action.col] !== null) {
        continue;
      }

      workingFlags[action.row][action.col] = 'not-gold';
      actions.push(action);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  return actions;
}
