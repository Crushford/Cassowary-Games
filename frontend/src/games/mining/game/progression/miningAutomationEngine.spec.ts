import { describe, expect, it } from 'vitest';

import type { MiningFlagType, PositionRef } from '../types';
import { buildMiningAutomationPlan } from './miningAutomationEngine';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  size?: number;
}) {
  const size = opts.size ?? 5;
  return buildMiningAutomationPlan({
    size,
    revealed: opts.revealed ?? makeRevealed(size),
    systemFlags: opts.systemFlags ?? makeFlags(size),
    revealedGoldPositions: opts.revealedGoldPositions ?? [],
    regionIds: makeRegions(size),
    ownedSkillIds: (opts.skills ?? ['buy-magpie']) as any,
    depthLevel: 1,
  });
}

// ─── No-op cases ────────────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — no-op cases', () => {
  it('returns no actions with only buy-magpie and no gold', () => {
    const actions = plan({ skills: ['buy-magpie'] });
    expect(actions).toHaveLength(0);
  });

  it('returns no actions with gold found but no auto-flag skills', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      skills: ['buy-magpie'],
    });
    expect(actions).toHaveLength(0);
  });
});

// ─── auto-flag-row ──────────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — auto-flag-row', () => {
  it('flags all other cells in the confirmed gold row as not-gold', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      skills: ['buy-magpie', 'auto-flag-row'],
    });
    const notGoldInRow0 = actions.filter((a) => a.type === 'placeNotGoldFlag' && a.row === 0);
    expect(notGoldInRow0.map((a) => a.col).sort()).toEqual([0, 1, 3, 4]);
  });

  it('does not flag the gold tile itself', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      skills: ['buy-magpie', 'auto-flag-row'],
    });
    expect(actions.find((a) => a.row === 0 && a.col === 2)).toBeUndefined();
  });

  it('skips already-revealed tiles', () => {
    const revealed = makeRevealed(5);
    revealed[0][0] = true;
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      revealed,
      skills: ['buy-magpie', 'auto-flag-row'],
    });
    expect(actions.find((a) => a.row === 0 && a.col === 0)).toBeUndefined();
  });

  it('skips tiles that already have a flag', () => {
    const flags = makeFlags(5);
    flags[0][1] = 'not-gold';
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 2 }],
      systemFlags: flags,
      skills: ['buy-magpie', 'auto-flag-row'],
    });
    // (0,1) should not appear in actions since it already has a flag
    expect(actions.find((a) => a.row === 0 && a.col === 1)).toBeUndefined();
  });
});

// ─── auto-flag-column ───────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — auto-flag-column', () => {
  it('flags all other cells in the confirmed gold column as not-gold', () => {
    const actions = plan({
      revealedGoldPositions: [{ row: 2, col: 3 }],
      skills: ['buy-magpie', 'auto-flag-column'],
    });
    const notGoldInCol3 = actions.filter((a) => a.type === 'placeNotGoldFlag' && a.col === 3);
    expect(notGoldInCol3.map((a) => a.row).sort()).toEqual([0, 1, 3, 4]);
  });
});

// ─── gold-here-row ──────────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — gold-here-row', () => {
  it('places a gold-here flag when only one candidate remains in a row', () => {
    const flags = makeFlags(5);
    flags[1][0] = 'not-gold';
    flags[1][1] = 'not-gold';
    flags[1][2] = 'not-gold';
    flags[1][3] = 'not-gold';
    const actions = plan({
      systemFlags: flags,
      skills: ['buy-magpie', 'auto-flag-row', 'gold-here-row'],
    });
    expect(actions).toContainEqual({ type: 'placeGoldHereFlag', row: 1, col: 4 });
  });

  it('does not place gold-here in a row that already has confirmed gold', () => {
    const flags = makeFlags(5);
    flags[0][1] = 'not-gold';
    flags[0][2] = 'not-gold';
    flags[0][3] = 'not-gold';
    // row 0 has confirmed gold at col 4 — only (0,0) is a candidate but row is already satisfied
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 4 }],
      systemFlags: flags,
      skills: ['buy-magpie', 'auto-flag-row', 'gold-here-row'],
    });
    expect(actions.filter((a) => a.type === 'placeGoldHereFlag' && a.row === 0)).toHaveLength(0);
  });
});

// ─── gold-here-column ───────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — gold-here-column', () => {
  it('places a gold-here flag when only one candidate remains in a column', () => {
    const flags = makeFlags(5);
    flags[0][3] = 'not-gold';
    flags[1][3] = 'not-gold';
    flags[2][3] = 'not-gold';
    flags[3][3] = 'not-gold';
    const actions = plan({
      systemFlags: flags,
      skills: ['buy-magpie', 'auto-flag-column', 'gold-here-column'],
    });
    expect(actions).toContainEqual({ type: 'placeGoldHereFlag', row: 4, col: 3 });
  });
});

// ─── Cascading deductions ────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — cascading deductions', () => {
  it('cascades: auto-flag-column triggers gold-here-row in a subsequent wave', () => {
    // Gold confirmed at (0,0).
    // auto-flag-column → marks (1,0),(2,0),(3,0),(4,0) not-gold.
    // Row 1 already has (1,1),(1,2),(1,3) not-gold, so after column flags cascade:
    //   row 1 has not-gold at cols 0,1,2,3 → col 4 is the sole candidate → gold-here-row fires.
    const flags = makeFlags(5);
    flags[1][1] = 'not-gold';
    flags[1][2] = 'not-gold';
    flags[1][3] = 'not-gold';
    const actions = plan({
      revealedGoldPositions: [{ row: 0, col: 0 }],
      systemFlags: flags,
      skills: ['buy-magpie', 'auto-flag-row', 'auto-flag-column', 'gold-here-row'],
    });
    const goldHere = actions.filter((a) => a.type === 'placeGoldHereFlag');
    expect(goldHere).toContainEqual({ type: 'placeGoldHereFlag', row: 1, col: 4 });
  });

  it('does not produce duplicate actions for the same cell across waves', () => {
    const flags = makeFlags(5);
    flags[1][0] = 'not-gold';
    flags[1][1] = 'not-gold';
    flags[1][2] = 'not-gold';
    flags[1][3] = 'not-gold';
    const actions = plan({
      systemFlags: flags,
      skills: ['buy-magpie', 'auto-flag-row', 'gold-here-row'],
    });
    const forCell = actions.filter((a) => a.row === 1 && a.col === 4);
    expect(forCell).toHaveLength(1);
  });
});

// ─── Iteration cap ──────────────────────────────────────────────────────────

describe('buildMiningAutomationPlan — iteration cap', () => {
  it('respects maxIterations and does not infinite loop', () => {
    const actions = buildMiningAutomationPlan({
      size: 5,
      revealed: makeRevealed(5),
      systemFlags: makeFlags(5),
      revealedGoldPositions: [
        { row: 0, col: 0 },
        { row: 1, col: 2 },
      ],
      regionIds: makeRegions(5),
      ownedSkillIds: [
        'buy-magpie',
        'auto-flag-row',
        'auto-flag-column',
        'auto-flag-diagonal',
        'gold-here-row',
        'gold-here-column',
      ] as any,
      depthLevel: 1,
      maxIterations: 1,
    });
    expect(Array.isArray(actions)).toBe(true);
  });
});
