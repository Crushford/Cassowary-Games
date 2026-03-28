import { describe, expect, it } from 'vitest';

import type { MiningFlagType, PositionRef } from '../types';
import { buildMiningAutomationPlan } from './miningAutomationEngine';

function makeFlags(size: number): Array<Array<MiningFlagType | null>> {
  return Array.from({ length: size }, () => Array<MiningFlagType | null>(size).fill(null));
}

function makeRevealed(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(false));
}

function makeRegions(size: number, fill = '.'): string[][] {
  return Array.from({ length: size }, () => Array<string>(size).fill(fill));
}

function plan(opts: {
  revealedGoldPositions?: PositionRef[];
  systemFlags?: Array<Array<MiningFlagType | null>>;
  revealed?: boolean[][];
  skills?: string[];
  scannerEnabled?: boolean;
  regionIds?: string[][];
  size?: number;
}) {
  const size = opts.size ?? 5;
  return buildMiningAutomationPlan({
    size,
    revealed: opts.revealed ?? makeRevealed(size),
    systemFlags: opts.systemFlags ?? makeFlags(size),
    revealedGoldPositions: opts.revealedGoldPositions ?? [],
    regionIds: opts.regionIds ?? makeRegions(size),
    ownedSkillIds: (opts.skills ?? ['buy-magpie']) as any,
    scannerEnabled: opts.scannerEnabled ?? false,
  });
}

describe('buildMiningAutomationPlan — no-op cases', () => {
  it('returns no actions with only buy-magpie and no gold', () => {
    const actions = plan({ skills: ['buy-magpie'] });
    expect(actions).toHaveLength(0);
  });

  it('returns no actions with gold found but no deduction upgrades', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      skills: ['buy-magpie'],
    });
    expect(actions).toHaveLength(0);
  });
});

describe('buildMiningAutomationPlan — row, column, and diagonal lessons', () => {
  it('flags all other cells in the confirmed gold row as not-gold', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      skills: ['buy-magpie', 'auto-flag-row'],
    });
    const notGoldInRow0 = actions.filter((action) => action.row === 0).map((action) => action.col);
    expect(notGoldInRow0.sort()).toEqual([0, 1, 3, 4]);
  });

  it('flags all other cells in the confirmed gold column as not-gold', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 2, col: 3 }],
      skills: ['buy-magpie', 'auto-flag-column'],
    });
    const notGoldInCol3 = actions.filter((action) => action.col === 3).map((action) => action.row);
    expect(notGoldInCol3.sort()).toEqual([0, 1, 3, 4]);
  });

  it('flags touching diagonal cells around confirmed gold', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 2, col: 2 }],
      skills: ['buy-magpie', 'auto-flag-diagonal'],
    });
    expect(actions).toEqual(
      expect.arrayContaining([
        { type: 'placeNotGoldFlag', row: 1, col: 1 },
        { type: 'placeNotGoldFlag', row: 1, col: 3 },
        { type: 'placeNotGoldFlag', row: 3, col: 1 },
        { type: 'placeNotGoldFlag', row: 3, col: 3 },
      ])
    );
  });
});

describe('buildMiningAutomationPlan — scanner deductions', () => {
  it('flags the rest of a color group once gold is revealed there', () => {
    const regionIds = makeRegions(5);
    regionIds[0][0] = 'A';
    regionIds[0][1] = 'A';
    regionIds[1][0] = 'A';

    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 0 }],
      scannerEnabled: true,
      regionIds,
      skills: ['buy-magpie'],
    });

    expect(actions).toEqual(
      expect.arrayContaining([
        { type: 'placeNotGoldFlag', row: 0, col: 1 },
        { type: 'placeNotGoldFlag', row: 1, col: 0 },
      ])
    );
  });

  it('does not do scanner deductions without the scanner upgrade', () => {
    const regionIds = makeRegions(5);
    regionIds[0][0] = 'A';
    regionIds[0][1] = 'A';

    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 0 }],
      scannerEnabled: false,
      regionIds,
      skills: ['buy-magpie'],
    });

    expect(actions).toHaveLength(0);
  });
});

describe('buildMiningAutomationPlan — pattern automations', () => {
  it('pattern automation I uses pc-1 to place fixed not-gold flags', () => {
    const regionIds = makeRegions(5, 'B');
    regionIds[0][1] = 'A';
    regionIds[1][1] = 'A';
    regionIds[1][2] = 'A';

    const actions = plan({
      systemFlags: makeFlags(5),
      regionIds,
      skills: ['buy-magpie', 'pattern-automation-1'],
    });

    expect(actions).toEqual(
      expect.arrayContaining([
        { type: 'placeNotGoldFlag', row: 0, col: 2 },
        { type: 'placeNotGoldFlag', row: 1, col: 0 },
        { type: 'placeNotGoldFlag', row: 2, col: 1 },
      ])
    );
  });

  it('pattern automation II uses pc-2 to place fixed not-gold flags', () => {
    const regionIds = makeRegions(5, 'B');
    regionIds[1][2] = 'A';
    regionIds[2][1] = 'A';

    const actions = plan({
      systemFlags: makeFlags(5),
      regionIds,
      skills: ['buy-magpie', 'pattern-automation-2'],
    });

    expect(actions).toEqual(
      expect.arrayContaining([
        { type: 'placeNotGoldFlag', row: 0, col: 1 },
        { type: 'placeNotGoldFlag', row: 1, col: 0 },
        { type: 'placeNotGoldFlag', row: 1, col: 1 },
        { type: 'placeNotGoldFlag', row: 2, col: 2 },
        { type: 'placeNotGoldFlag', row: 2, col: 3 },
        { type: 'placeNotGoldFlag', row: 3, col: 2 },
      ])
    );
  });
});
