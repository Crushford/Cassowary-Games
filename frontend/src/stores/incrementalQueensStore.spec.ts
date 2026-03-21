import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useIncrementalQueensStore persistence', () => {
  beforeEach(() => {
    const storage = (() => {
      const values = new Map<string, string>();
      return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      };
    })();

    vi.stubGlobal('localStorage', storage);
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

  it('persists an active run summary to localStorage', async () => {
    const { useIncrementalQueensStore } = await import('./incrementalQueensStore');
    const { useQueensStore } = await import('./queensStore');
    const incrementalStore = useIncrementalQueensStore();
    const queensStore = useQueensStore();

    incrementalStore.initializePersistence();
    incrementalStore.runStatus = 'playing';
    incrementalStore.runBank = 125;
    incrementalStore.puzzlesSolved = 4;
    incrementalStore.currentPuzzleSize = 6;

    queensStore.currentPuzzleId = '6x6-test-0';
    queensStore.currentMode = 'standard';
    queensStore.uiState.placementMode = 'auto';
    queensStore.uiState.autoFlagging = false;
    incrementalStore.persistRunState();

    const saved = JSON.parse(localStorage.getItem('incremental-queens-save-v1') ?? 'null');

    expect(saved).toMatchObject({
      version: 1,
      run: {
        runStatus: 'playing',
        runBank: 125,
        puzzlesSolved: 4,
        currentPuzzleSize: 6,
      },
      board: {
        puzzleId: '6x6-test-0',
        currentMode: 'standard',
      },
    });
  });

  it('loads a saved run summary on startup', async () => {
    localStorage.setItem(
      'incremental-queens-save-v1',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        run: {
          runStatus: 'upgrade-select',
          runScore: 180,
          runBank: 90,
          puzzlesSolved: 3,
          riskLevel: 1,
          autoFlagPurchased: true,
          autoNextPuzzlePurchased: false,
          rotatePuzzlePurchased: false,
          autoNextPuzzleEnabled: false,
          autoQueenByColorPurchased: false,
          autoQueenByRowPurchased: false,
          autoQueenByColumnPurchased: false,
          currentPuzzleSize: 5,
          currentPuzzleTimeLimit: 60,
          timeRemaining: 18,
          lastScoreBreakdown: null,
          lastPuzzleId: '5x5-test-0',
          ownedPatternCardIds: [],
          customPatternCards: [],
          customPatternCardCounter: 1,
          selectedOneOffUpgradeId: null,
          automationEnabled: true,
          previousPlacementMode: 'auto',
          previousAutoFlagging: false,
        },
        board: {
          puzzleId: '5x5-test-0',
          currentMode: 'standard',
          placementMode: 'auto',
          autoFlagging: false,
          playerMarks: [],
          moveHistory: [],
          lastManualInteractionAt: Date.now(),
        },
      })
    );

    const { useIncrementalQueensStore } = await import('./incrementalQueensStore');
    const incrementalStore = useIncrementalQueensStore();
    incrementalStore.initializePersistence();

    expect(incrementalStore.savedRunSummary).toEqual({
      bank: 90,
      puzzlesSolved: 3,
      puzzleSize: 5,
      runStatus: 'upgrade-select',
    });
    expect(incrementalStore.hasSavedRun).toBe(true);
  });
});
