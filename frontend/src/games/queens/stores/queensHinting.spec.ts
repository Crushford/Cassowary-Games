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
});
