import { buildSelectiveAutoFlagGrid } from '../rules/autoFlag';
import type { MiningDepthLevel, MiningFlagType, MiningMagpieSkillId, PositionRef } from '../types';

export interface MiningAutomationAction {
  type: 'placeNotGoldFlag' | 'placeGoldHereFlag';
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
  depthLevel: MiningDepthLevel;
  maxIterations?: number;
}

function cloneFlagGrid(
  flags: Array<Array<MiningFlagType | null>>
): Array<Array<MiningFlagType | null>> {
  return flags.map((row) => [...row]);
}

function collectConfirmedGoldPositions(
  revealedGoldPositions: PositionRef[],
  flags: Array<Array<MiningFlagType | null>>
): PositionRef[] {
  const positions = [...revealedGoldPositions];
  const seen = new Set(positions.map((position) => `${position.row},${position.col}`));

  for (let row = 0; row < flags.length; row += 1) {
    for (let col = 0; col < flags[row].length; col += 1) {
      if (flags[row][col] !== 'gold-here') {
        continue;
      }

      const key = `${row},${col}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      positions.push({ row, col });
    }
  }

  return positions;
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

function collectSingleCandidateActions(options: {
  size: number;
  revealed: boolean[][];
  currentFlags: Array<Array<MiningFlagType | null>>;
  confirmedGoldPositions: PositionRef[];
  regionIds: string[][];
  ownedSkillIds: MiningMagpieSkillId[];
  depthLevel: MiningDepthLevel;
}): MiningAutomationAction[] {
  const {
    size,
    revealed,
    currentFlags,
    confirmedGoldPositions,
    regionIds,
    ownedSkillIds,
    depthLevel,
  } = options;
  const actions: MiningAutomationAction[] = [];
  const seen = new Set<string>();
  const confirmedByRow = new Set<number>();
  const confirmedByColumn = new Set<number>();
  const confirmedByRegion = new Set<string>();

  for (const position of confirmedGoldPositions) {
    confirmedByRow.add(position.row);
    confirmedByColumn.add(position.col);
    const regionId = regionIds[position.row]?.[position.col];
    if (regionId && regionId !== '.') {
      confirmedByRegion.add(regionId);
    }
  }

  const tryAdd = (row: number, col: number) => {
    if (revealed[row][col] || currentFlags[row][col] !== null) {
      return;
    }

    const key = `${row},${col}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    actions.push({
      type: 'placeGoldHereFlag',
      row,
      col,
    });
  };

  const isCandidate = (row: number, col: number) =>
    !revealed[row][col] &&
    currentFlags[row][col] !== 'not-gold' &&
    currentFlags[row][col] !== 'gold-here';

  if (ownedSkillIds.includes('gold-here-row')) {
    for (let row = 0; row < size; row += 1) {
      if (confirmedByRow.has(row)) {
        continue;
      }

      const candidates: PositionRef[] = [];
      for (let col = 0; col < size; col += 1) {
        if (isCandidate(row, col)) {
          candidates.push({ row, col });
        }
      }

      if (candidates.length === 1) {
        tryAdd(candidates[0].row, candidates[0].col);
      }
    }
  }

  if (ownedSkillIds.includes('gold-here-column')) {
    for (let col = 0; col < size; col += 1) {
      if (confirmedByColumn.has(col)) {
        continue;
      }

      const candidates: PositionRef[] = [];
      for (let row = 0; row < size; row += 1) {
        if (isCandidate(row, col)) {
          candidates.push({ row, col });
        }
      }

      if (candidates.length === 1) {
        tryAdd(candidates[0].row, candidates[0].col);
      }
    }
  }

  if (depthLevel >= 3 && ownedSkillIds.includes('gold-here-region')) {
    const regionCandidates = new Map<string, PositionRef[]>();

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const regionId = regionIds[row]?.[col];
        if (!regionId || regionId === '.' || confirmedByRegion.has(regionId)) {
          continue;
        }

        if (!regionCandidates.has(regionId)) {
          regionCandidates.set(regionId, []);
        }

        if (isCandidate(row, col)) {
          regionCandidates.get(regionId)!.push({ row, col });
        }
      }
    }

    for (const candidates of regionCandidates.values()) {
      if (candidates.length === 1) {
        tryAdd(candidates[0].row, candidates[0].col);
      }
    }
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
  depthLevel,
  maxIterations = 100,
}: MiningAutomationOptions): MiningAutomationAction[] {
  const actions: MiningAutomationAction[] = [];
  const workingFlags = cloneFlagGrid(systemFlags);

  for (let wave = 0; wave < maxIterations; wave += 1) {
    let changed = false;
    const confirmedGoldPositions = collectConfirmedGoldPositions(
      revealedGoldPositions,
      workingFlags
    );

    for (const action of collectAutoFlagActions(
      size,
      revealed,
      workingFlags,
      confirmedGoldPositions,
      ownedSkillIds
    )) {
      if (workingFlags[action.row][action.col] !== null) {
        continue;
      }

      workingFlags[action.row][action.col] = 'not-gold';
      actions.push(action);
      changed = true;
    }

    const updatedConfirmedGoldPositions = collectConfirmedGoldPositions(
      revealedGoldPositions,
      workingFlags
    );

    for (const action of collectSingleCandidateActions({
      size,
      revealed,
      currentFlags: workingFlags,
      confirmedGoldPositions: updatedConfirmedGoldPositions,
      regionIds,
      ownedSkillIds,
      depthLevel,
    })) {
      if (workingFlags[action.row][action.col] !== null) {
        continue;
      }

      workingFlags[action.row][action.col] = 'gold-here';
      actions.push(action);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  return actions;
}
