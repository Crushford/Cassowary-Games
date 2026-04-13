import { describe, expect, it } from 'vitest';
import type { GridSquare, MarkType } from '../types/types';
import {
  applyQueensSolverStep,
  compareConfiguredStepOrder,
  getNextQueensSolverStep,
  getOrderedApplicableQueensSolverSteps,
  runQueensSolverUntilStuck,
  type QueensSolverState,
} from './stagedSolver';
import type { SharedBuiltInSolverStepConfig } from './sharedSolverConfig';

function buildState(layout: string, queens: string, marks?: MarkType[][]): QueensSolverState {
  const gridSize = Math.sqrt(layout.length);
  const grid: GridSquare[][] = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => ({
      position: { row, col },
      groupColor: layout[row * gridSize + col],
      isSolutionQueen: queens[row * gridSize + col] === 'Q',
    }))
  );
  return {
    grid,
    gridSize,
    targetQueenCount: gridSize,
    orthogonalMinDistance: gridSize,
    playerMarks:
      marks ??
      Array.from({ length: gridSize }, () => Array<MarkType>(gridSize).fill(null)),
  };
}

describe('stagedSolver', () => {
  it('returns a single-color step when a group has one candidate', () => {
    const state = buildState('AAAB', '...Q', [
      ['flag', 'flag'],
      ['flag', null],
    ]);
    const step = getNextQueensSolverStep(state);
    expect(step?.stepId).toBe('single-color');
    expect(step?.outputCells).toEqual([{ row: 1, col: 1 }]);
  });

  it('applies exactly one step at a time', () => {
    const state = buildState('AAAB', '...Q', [
      ['flag', 'flag'],
      ['flag', null],
    ]);
    const step = getNextQueensSolverStep(state);
    expect(step).not.toBeNull();
    const nextMarks = applyQueensSolverStep(state, step!);
    expect(nextMarks[1][1]).toBe('queen');
  });

  it('can solve a simple puzzle through repeated steps', () => {
    const state = buildState('AAAB', '...Q', [
      ['flag', 'flag'],
      ['flag', null],
    ]);
    const steps = runQueensSolverUntilStuck(state);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].stepId).toBe('single-color');
  });

  it('orders configured steps by difficulty before sort order', () => {
    const ordered: SharedBuiltInSolverStepConfig[] = [
      {
        id: 'hard-step',
        label: 'Hard Step',
        description: '',
        difficultyTier: 'hard' as const,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'easy-step',
        label: 'Easy Step',
        description: '',
        difficultyTier: 'easy' as const,
        enabled: true,
        sortOrder: 999,
      },
    ].sort(compareConfiguredStepOrder);

    expect(ordered.map((step) => step.id)).toEqual(['easy-step', 'hard-step']);
  });

  it('returns the first applicable configured step in solver order', () => {
    const state = buildState('AABCABBCDDDCEEFF', '....Q......Q....', [
      [null, null, null, null],
      ['queen', 'flag', 'flag', 'flag'],
      ['flag', null, null, null],
      [null, null, 'queen', 'flag'],
    ]);

    const applicable = getOrderedApplicableQueensSolverSteps(state, 'unsolvable');
    const next = getNextQueensSolverStep(state, 'unsolvable');

    expect(applicable.length).toBeGreaterThan(0);
    expect(next).not.toBeNull();
    expect(next?.stepId).toBe(applicable[0]?.stepId);
    expect(next?.difficultyTier).toBe(applicable[0]?.difficultyTier);
  });

  it('returns persisted pattern metadata when a pattern hint applies', () => {
    const state = buildState('HAHHAAHHH', '.........');

    const step = getNextQueensSolverStep(state, 'extra-easy');

    expect(step).not.toBeNull();
    expect(step?.stepId).toBe('pc-1');
    expect(step?.difficultyTier).toBe('extra-easy');
    expect(step?.outputCells).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 1 },
    ]);
    expect(step?.patternPreview).toEqual({
      id: 'pc-1',
      name: 'pc-1',
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
    });
  });

});
