import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadQueensAdminSolverInputs, saveQueensAdminSolverInputs } from './inputPersistence';

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('inputPersistence solver inputs', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createStorage() });
    vi.stubGlobal('localStorage', window.localStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists solver difficulty settings and run-all threshold', () => {
    saveQueensAdminSolverInputs({
      selectedSize: 7,
      selectedDistance: 5,
      selectedMinimumGroupSize: 3,
      selectedQueenCount: 'any',
      autoRunSingleColorAfterSolverAction: true,
      stepDifficulties: {
        'single-color': 'easy',
        'row-column-sets': 'extra-hard',
      },
      runAllDifficultyThreshold: 'extra-hard',
    });

    expect(loadQueensAdminSolverInputs()).toEqual({
      selectedSize: 7,
      selectedDistance: 5,
      selectedMinimumGroupSize: 3,
      selectedQueenCount: 'any',
      autoRunSingleColorAfterSolverAction: true,
      stepDifficulties: {
        'single-color': 'easy',
        'row-column-sets': 'extra-hard',
      },
      runAllDifficultyThreshold: 'extra-hard',
    });
  });

  it('drops invalid step difficulties and thresholds while keeping valid values', () => {
    localStorage.setItem(
      'queens-admin-solver-inputs-v1',
      JSON.stringify({
        selectedSize: 7,
        autoRunSingleColorAfterSolverAction: false,
        stepDifficulties: {
          'single-color': 'easy',
          'row-column': 'wrong',
        },
        runAllDifficultyThreshold: 'bad',
      })
    );

    expect(loadQueensAdminSolverInputs()).toEqual({
      selectedSize: 7,
      autoRunSingleColorAfterSolverAction: false,
      stepDifficulties: {
        'single-color': 'easy',
      },
    });
  });
});
