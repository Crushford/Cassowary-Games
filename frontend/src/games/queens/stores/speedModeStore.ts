import { defineStore } from 'pinia';
import { useQueensStore } from './queensStore';
import router from '@/router';

// LocalStorage keys for speed mode records
const SPEED_MODE_2MIN_SEQUENTIAL_RECORD_KEY = 'queens-speed-mode-2min-sequential-record';
const SPEED_MODE_5MIN_SEQUENTIAL_RECORD_KEY = 'queens-speed-mode-5min-sequential-record';
const SPEED_MODE_2MIN_SIZE_RECORDS_KEY = 'queens-speed-mode-2min-size-records';
const SPEED_MODE_5MIN_SIZE_RECORDS_KEY = 'queens-speed-mode-5min-size-records';
const BEST_TIMES_PER_SIZE_KEY = 'queens-best-times-per-size';
const PUZZLE_PROGRESS_KEY_PREFIX = 'queens-puzzle-progress-';

function getSpeedModeRecord(
  timerDuration: number,
  isSequential: boolean,
  sizeKey?: string
): number {
  try {
    let key: string;
    if (isSequential) {
      key =
        timerDuration === 120
          ? SPEED_MODE_2MIN_SEQUENTIAL_RECORD_KEY
          : SPEED_MODE_5MIN_SEQUENTIAL_RECORD_KEY;
    } else {
      const recordsKey =
        timerDuration === 120 ? SPEED_MODE_2MIN_SIZE_RECORDS_KEY : SPEED_MODE_5MIN_SIZE_RECORDS_KEY;
      const stored = localStorage.getItem(recordsKey);
      if (stored && sizeKey) {
        const records = JSON.parse(stored);
        return records[sizeKey] || 0;
      }
      return 0;
    }
    const stored = localStorage.getItem(key);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (e) {
    console.error('Error reading speed mode record from localStorage:', e);
  }
  return 0;
}

function saveSpeedModeRecord(
  timerDuration: number,
  count: number,
  isSequential: boolean,
  sizeKey?: string
) {
  try {
    if (isSequential) {
      const key =
        timerDuration === 120
          ? SPEED_MODE_2MIN_SEQUENTIAL_RECORD_KEY
          : SPEED_MODE_5MIN_SEQUENTIAL_RECORD_KEY;
      localStorage.setItem(key, String(count));
    } else {
      const recordsKey =
        timerDuration === 120 ? SPEED_MODE_2MIN_SIZE_RECORDS_KEY : SPEED_MODE_5MIN_SIZE_RECORDS_KEY;
      const stored = localStorage.getItem(recordsKey);
      const records = stored ? JSON.parse(stored) : {};
      if (sizeKey) {
        records[sizeKey] = count;
        localStorage.setItem(recordsKey, JSON.stringify(records));
      }
    }
  } catch (e) {
    console.error('Error saving speed mode record to localStorage:', e);
  }
}

function getBestTimesPerSize(): Record<string, number> {
  try {
    const stored = localStorage.getItem(BEST_TIMES_PER_SIZE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading best times per size from localStorage:', e);
  }
  return {};
}

function saveBestTimesPerSize(times: Record<string, number>) {
  try {
    localStorage.setItem(BEST_TIMES_PER_SIZE_KEY, JSON.stringify(times));
  } catch (e) {
    console.error('Error saving best times per size to localStorage:', e);
  }
}

function updateBestTimeForSize(sizeKey: string, timeSeconds: number): boolean {
  const bestTimes = getBestTimesPerSize();
  const currentBest = bestTimes[sizeKey];
  if (currentBest === undefined || timeSeconds < currentBest) {
    bestTimes[sizeKey] = timeSeconds;
    saveBestTimesPerSize(bestTimes);
    return true;
  }
  return false;
}

function loadPuzzleProgressMarks(puzzleId: string | number | null): any | null {
  if (puzzleId === null) return null;
  try {
    const key = `${PUZZLE_PROGRESS_KEY_PREFIX}${puzzleId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return { playerMarks: parsed };
      return parsed;
    }
  } catch (e) {
    console.error('Error loading puzzle progress from localStorage:', e);
  }
  return null;
}

export const useSpeedModeStore = defineStore('speedMode', {
  state: () => ({
    timerDuration: null as number | null,
    timeRemaining: null as number | null,
    size: null as string | null,
    selectedSizes: null as string[] | null, // deprecated, kept for compat
    completedCount: 0,
    completedBySize: {} as Record<string, number>,
    timerInterval: null as number | null,
    currentSizeIndex: 0,
    currentPuzzleIndex: 0,
    isNewRecord: false,
    previousRecord: 0,
    puzzleStartTime: null as number | null,
    timesBySize: {} as Record<string, number[]>,
    showSpeedModeModal: false,
  }),

  getters: {
    getFormattedTimeRemaining: (state): string => {
      if (state.timeRemaining === null) return '0:00';
      const mins = Math.floor(state.timeRemaining / 60);
      const secs = Math.floor(state.timeRemaining % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    getFormattedCompletionTime: (state): string => {
      if (state.timerDuration === null) return '';
      const completionTimeSeconds = state.timerDuration - (state.timeRemaining ?? 0);
      const minutes = Math.floor(completionTimeSeconds / 60);
      const seconds = Math.floor(completionTimeSeconds % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    getBestTimesThisSession: (state): Array<[string, number]> => {
      const bestTimes: Array<[string, number]> = [];
      for (const [size, times] of Object.entries(state.timesBySize)) {
        if (times.length > 0) {
          bestTimes.push([size, Math.min(...times)]);
        }
      }
      return bestTimes.sort((a, b) => {
        const aSize = parseInt(a[0].split('x')[0], 10);
        const bSize = parseInt(b[0].split('x')[0], 10);
        return aSize - bSize;
      });
    },
  },

  actions: {
    start(duration: number, size: string | null) {
      const queensStore = useQueensStore();
      queensStore.setMode('speed');

      this.timerDuration = duration;
      this.timeRemaining = duration;
      this.size = size;
      this.selectedSizes = size ? [size] : null;
      this.completedCount = 0;
      this.completedBySize = {};
      this.currentSizeIndex = 0;
      this.currentPuzzleIndex = 0;

      this.timerInterval = window.setInterval(() => {
        if (this.timeRemaining !== null && this.timeRemaining > 0) {
          this.timeRemaining--;
        } else {
          if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
          this.timeRemaining = 0;
          this.checkAndSaveRecords();
        }
      }, 1000);
    },

    end() {
      if (this.timerInterval !== null) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    reset() {
      this.end();
      const queensStore = useQueensStore();
      queensStore.setMode('standard');

      this.timerDuration = null;
      this.timeRemaining = null;
      this.size = null;
      this.selectedSizes = null;
      this.completedCount = 0;
      this.completedBySize = {};
      this.currentSizeIndex = 0;
      this.currentPuzzleIndex = 0;
      this.isNewRecord = false;
      this.previousRecord = 0;
      this.puzzleStartTime = null;
      this.timesBySize = {};
    },

    checkAndSaveRecords() {
      if (this.timerDuration === null) return;
      const isSequential = this.size === null;
      const currentRecord = getSpeedModeRecord(
        this.timerDuration,
        isSequential,
        this.size || undefined
      );
      this.previousRecord = currentRecord;
      if (this.completedCount > currentRecord) {
        this.isNewRecord = true;
        saveSpeedModeRecord(
          this.timerDuration,
          this.completedCount,
          isSequential,
          this.size || undefined
        );
      } else {
        this.isNewRecord = false;
      }
    },

    async getNextPuzzle(): Promise<any | null> {
      const queensStore = useQueensStore();

      if (!queensStore.puzzleDatabase) {
        const success = await queensStore.loadPuzzleDatabase();
        if (!success) return null;
      }

      const availableSizes = this.size ? [this.size] : queensStore.getAvailableSizes();

      for (let sizeIdx = this.currentSizeIndex; sizeIdx < availableSizes.length; sizeIdx++) {
        const sizeKey = availableSizes[sizeIdx];
        const puzzlesForSize = (queensStore.puzzleDatabase as Record<string, any[]>)[sizeKey] || [];
        const startIndex = sizeIdx === this.currentSizeIndex ? this.currentPuzzleIndex : 0;

        for (let puzzleIdx = startIndex; puzzleIdx < puzzlesForSize.length; puzzleIdx++) {
          const puzzle = puzzlesForSize[puzzleIdx];
          const puzzleId = puzzle.id || puzzle.name;
          if (!puzzleId) continue;

          const normalizedId = String(puzzleId);
          if (queensStore.isPuzzleCompleted(normalizedId)) continue;

          const savedProgress = loadPuzzleProgressMarks(puzzleId);
          if (savedProgress?.playerMarks) {
            const hasMarks = savedProgress.playerMarks.some(
              (row: any) => row && row.some((mark: any) => mark !== null)
            );
            if (hasMarks) continue;
          }

          this.currentSizeIndex = sizeIdx;
          this.currentPuzzleIndex = puzzleIdx;
          return puzzle;
        }

        this.currentSizeIndex = sizeIdx + 1;
        this.currentPuzzleIndex = 0;
      }

      return null;
    },

    async startNextPuzzle() {
      const puzzle = await this.getNextPuzzle();
      if (!puzzle) {
        this.checkAndSaveRecords();
        this.end();
        router.push('/queens');
        return;
      }
      this.puzzleStartTime = Date.now();
      router.push(`/queens/${puzzle.id}`);
    },

    onPuzzleComplete() {
      const queensStore = useQueensStore();

      if (this.puzzleStartTime !== null) {
        const completionTimeSeconds = (Date.now() - this.puzzleStartTime) / 1000;
        const sizeKey = `${queensStore.gridSize}x${queensStore.gridSize}`;

        if (!this.timesBySize[sizeKey]) {
          this.timesBySize[sizeKey] = [];
        }
        this.timesBySize[sizeKey].push(completionTimeSeconds);
        updateBestTimeForSize(sizeKey, completionTimeSeconds);
      }

      this.completedCount++;
      const sizeKey = `${queensStore.gridSize}x${queensStore.gridSize}`;
      this.completedBySize[sizeKey] = (this.completedBySize[sizeKey] || 0) + 1;

      const availableSizes = this.size ? [this.size] : queensStore.getAvailableSizes();
      const currentSizeIndex = availableSizes.indexOf(sizeKey);

      if (currentSizeIndex >= 0 && currentSizeIndex < availableSizes.length - 1) {
        this.currentSizeIndex = currentSizeIndex + 1;
        this.currentPuzzleIndex = 0;
      } else if (currentSizeIndex === availableSizes.length - 1) {
        this.currentSizeIndex = 0;
        this.currentPuzzleIndex = 0;
      }

      this.startNextPuzzle();
    },

    openModal() {
      this.showSpeedModeModal = true;
    },

    closeModal() {
      this.showSpeedModeModal = false;
    },
  },
});
