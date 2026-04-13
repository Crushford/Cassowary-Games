import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridSquare, MarkType } from '../types/types';

function buildGrid(layout: string, queens: string): GridSquare[][] {
  const gridSize = Math.sqrt(layout.length);
  return Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => ({
      position: { row, col },
      groupColor: layout[row * gridSize + col],
      isSolutionQueen: queens[row * gridSize + col] === 'Q',
    }))
  );
}

describe('Queens interactive hint behavior', () => {
  beforeEach(() => {
    const storage = (() => {
      const store = new Map<string, string>();
      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      };
    })();

    const location = {
      pathname: '/',
      search: '',
      hash: '',
      host: 'localhost',
      protocol: 'http:',
    };
    const history = {
      state: null,
      replaceState: () => undefined,
      pushState: () => undefined,
    };

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('location', location);
    vi.stubGlobal('history', history);
    vi.stubGlobal('window', {
      localStorage: storage,
      location,
      history,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    });

    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('applies pattern hints one output cell at a time', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();

    store.grid = buildGrid('HAHHAAHHH', '.........');
    store.gridSize = 3;
    store.targetQueenCount = 3;
    store.orthogonalMinDistance = 3;
    store.playerMarks = Array.from({ length: 3 }, () => Array<MarkType>(3).fill(null));
    store.currentPuzzle = {
      id: 'pattern-hint-test',
      layout: 'HAHHAAHHH',
      queens: '.........',
      difficulty: 'extra-easy',
    };

    const firstHint = await store.requestHint();

    expect(firstHint).not.toBeNull();
    expect(firstHint?.stepId).toBe('pc-1');
    expect(firstHint?.patternPreview).not.toBeUndefined();
    expect(firstHint?.outputCells).toHaveLength(1);
    expect(firstHint?.changes).toHaveLength(1);

    const firstOutput = firstHint!.outputCells[0]!;
    expect(store.playerMarks[firstOutput.row][firstOutput.col]).toBe('flag');

    const flaggedAfterFirstHint = store.playerMarks.flat().filter((mark) => mark === 'flag').length;
    expect(flaggedAfterFirstHint).toBe(1);

    const secondHint = await store.requestHint();
    expect(secondHint).not.toBeNull();
    expect(secondHint?.stepId).toBe('pc-1');
    expect(secondHint?.outputCells).toHaveLength(1);

    const flaggedAfterSecondHint = store.playerMarks
      .flat()
      .filter((mark) => mark === 'flag').length;
    expect(flaggedAfterSecondHint).toBe(2);
  });

  it('logs a full debug payload whenever no hint is available', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    store.grid = buildGrid('AAAA', '....');
    store.gridSize = 2;
    store.targetQueenCount = 2;
    store.orthogonalMinDistance = 2;
    store.playerMarks = [
      ['flag', 'flag'],
      ['flag', 'flag'],
    ] as MarkType[][];
    store.currentPuzzle = {
      id: 'no-hint-debug-test',
      layout: 'AAAA',
      queens: '....',
      difficulty: 'tutorial',
    };
    store.currentPuzzleId = 'no-hint-debug-test';

    const hint = await store.requestHint();

    expect(hint).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[queensStore] No hint available',
      expect.objectContaining({
        puzzleId: 'no-hint-debug-test',
        puzzleDifficulty: 'tutorial',
        gridSize: 2,
        targetQueenCount: 2,
        orthogonalMinDistance: 2,
        boardGroups: ['AA', 'AA'],
        boardMarks: ['FF', 'FF'],
        placedQueens: [],
        flaggedSquares: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 },
          { row: 1, col: 1 },
        ],
        orderedApplicableSteps: [],
        route: expect.objectContaining({
          pathname: '/',
          search: '',
          hash: '',
        }),
      })
    );
  });

  it('finds solver-pattern-3 for the reported 4x4 top-edge extra-easy state', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    store.grid = buildGrid('0011002200323332', '..Q.Q......Q.Q..');
    store.gridSize = 4;
    store.targetQueenCount = 4;
    store.orthogonalMinDistance = 4;
    store.playerMarks = [
      ['flag', 'flag', null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ] as MarkType[][];
    store.currentPuzzle = {
      id: 'd41c41bf-a97a-4758-89fe-b3585286d9e0',
      layout: '0011002200323332',
      queens: '..Q.Q......Q.Q..',
      difficulty: 'extra-easy',
    };
    store.currentPuzzleId = 'd41c41bf-a97a-4758-89fe-b3585286d9e0';

    const hint = await store.requestHint();

    expect(hint).not.toBeNull();
    expect(hint?.stepId).toBe('solver-pattern-3');
    expect(hint?.difficultyTier).toBe('extra-easy');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('finds solver-pattern-3 for the second reported 4x4 extra-easy state', async () => {
    const { useQueensStore } = await import('./queensStore');
    const store = useQueensStore();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    store.grid = buildGrid('0111002100232223', '.Q....Q..Q.Q....');
    store.gridSize = 4;
    store.targetQueenCount = 4;
    store.orthogonalMinDistance = 4;
    store.playerMarks = [
      ['flag', null, null, 'flag'],
      [null, null, null, 'flag'],
      [null, null, 'flag', null],
      [null, null, 'flag', null],
    ] as MarkType[][];
    store.currentPuzzle = {
      id: '6370bbac-a2eb-4338-b3db-3090d5a76a23',
      layout: '0111002100232223',
      queens: '.Q....Q..Q.Q....',
      difficulty: 'extra-easy',
    };
    store.currentPuzzleId = '6370bbac-a2eb-4338-b3db-3090d5a76a23';

    const hint = await store.requestHint();

    expect(hint).not.toBeNull();
    expect(hint?.stepId).toBe('solver-pattern-3');
    expect(hint?.difficultyTier).toBe('extra-easy');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
