import type {
  MiningFlagType,
  MiningLeaderboardEntry,
  MiningPhase,
  MiningRavenSkillId,
  MiningToolUpgradeId,
} from '../game/types';
import { createInitialMiningState, type MiningStoreState } from './miningState';

const MINING_SAVE_KEY = 'mining-save-v1';
const MINING_SAVE_VERSION = 5;
const MINING_LEADERBOARD_KEY = 'mining-leaderboard-v1';

interface MiningSaveSnapshot {
  version?: number;
  board?: Partial<MiningStoreState['board']>;
  run?: Partial<Omit<MiningStoreState['run'], 'phase'>> & {
    phase?: Exclude<MiningPhase, 'loading'>;
  };
  progression?: Partial<MiningStoreState['progression']>;
  ui?: Partial<
    Pick<
      MiningStoreState['ui'],
      'hasSeenIntroThisRun' | 'lastActionMessage' | 'leaderboardName' | 'scoreSubmitted'
    >
  >;
  [key: string]: unknown;
}

interface MiningLeaderboardSnapshot {
  entries?: unknown;
}

export function isSaveCompatible(snapshot: MiningSaveSnapshot): boolean {
  return snapshot.version === MINING_SAVE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringArray<T extends string>(value: unknown, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value.filter((item): item is T => typeof item === 'string');
}

function isMiningFlagType(value: unknown): value is MiningFlagType {
  return value === 'gold-here' || value === 'not-gold';
}

function readFlagGrid(
  value: unknown,
  fallback: Array<Array<MiningFlagType | null>>
): Array<Array<MiningFlagType | null>> {
  if (!Array.isArray(value)) {
    return fallback.map((row) => [...row]);
  }

  return fallback.map((fallbackRow, rowIndex) => {
    const sourceRow = Array.isArray(value[rowIndex]) ? value[rowIndex] : [];
    return fallbackRow.map((fallbackCell, colIndex) => {
      const sourceCell = sourceRow[colIndex];

      if (sourceCell === true) {
        return 'gold-here';
      }

      if (sourceCell === false || sourceCell === null || typeof sourceCell === 'undefined') {
        return null;
      }

      return isMiningFlagType(sourceCell) ? sourceCell : fallbackCell;
    });
  });
}

function readPhase(value: unknown, fallback: MiningStoreState['run']['phase']) {
  if (
    value === 'idle' ||
    value === 'playing' ||
    value === 'level-complete' ||
    value === 'game-complete'
  ) {
    return value;
  }

  return fallback;
}

function isMiningLeaderboardEntry(value: unknown): value is MiningLeaderboardEntry {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.daysElapsed === 'number' &&
    Number.isFinite(value.daysElapsed) &&
    typeof value.completedAt === 'string'
  );
}

function sortLeaderboardEntries(entries: MiningLeaderboardEntry[]): MiningLeaderboardEntry[] {
  return [...entries].sort((left, right) => {
    if (left.daysElapsed !== right.daysElapsed) {
      return left.daysElapsed - right.daysElapsed;
    }

    return left.completedAt.localeCompare(right.completedAt);
  });
}

export function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readMiningSave(): MiningSaveSnapshot | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(MINING_SAVE_KEY);
    return raw ? (JSON.parse(raw) as MiningSaveSnapshot) : null;
  } catch (error) {
    console.error('Error reading mining save from localStorage:', error);
    return null;
  }
}

export function writeMiningSave(state: MiningStoreState) {
  if (!canUseLocalStorage()) {
    return;
  }

  const snapshot: MiningSaveSnapshot = {
    version: MINING_SAVE_VERSION,
    board: {
      ...state.board,
    },
    run: {
      ...state.run,
      phase: state.run.phase === 'loading' ? 'playing' : state.run.phase,
    },
    progression: {
      ...state.progression,
      unlockedRavenSkillIds: [...state.progression.unlockedRavenSkillIds],
      unlockedToolUpgradeIds: [...state.progression.unlockedToolUpgradeIds],
      earnedRewardIds: [...state.progression.earnedRewardIds],
    },
    ui: {
      hasSeenIntroThisRun: state.ui.hasSeenIntroThisRun,
      lastActionMessage: state.ui.lastActionMessage,
      leaderboardName: state.ui.leaderboardName,
      scoreSubmitted: state.ui.scoreSubmitted,
    },
  };

  try {
    window.localStorage.setItem(MINING_SAVE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Error saving mining run to localStorage:', error);
  }
}

export function clearMiningSave() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(MINING_SAVE_KEY);
}

export function readMiningLeaderboard(): MiningLeaderboardEntry[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(MINING_LEADERBOARD_KEY);
    if (!raw) {
      return [];
    }

    const snapshot = JSON.parse(raw) as MiningLeaderboardSnapshot;
    const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];

    return sortLeaderboardEntries(entries.filter(isMiningLeaderboardEntry)).slice(0, 10);
  } catch (error) {
    console.error('Error reading mining leaderboard from localStorage:', error);
    return [];
  }
}

export function writeMiningLeaderboardEntry(
  entry: MiningLeaderboardEntry
): MiningLeaderboardEntry[] {
  const nextEntries = sortLeaderboardEntries([...readMiningLeaderboard(), entry]).slice(0, 10);

  if (!canUseLocalStorage()) {
    return nextEntries;
  }

  try {
    window.localStorage.setItem(
      MINING_LEADERBOARD_KEY,
      JSON.stringify({
        entries: nextEntries,
      })
    );
  } catch (error) {
    console.error('Error saving mining leaderboard to localStorage:', error);
  }

  return nextEntries;
}

export function restoreMiningState(target: MiningStoreState, snapshot: MiningSaveSnapshot) {
  const validRavenSkillIds = new Set<MiningRavenSkillId>([
    'auto-flag-row',
    'auto-flag-column',
    'auto-flag-diagonal',
  ]);
  const validToolUpgradeIds = new Set<MiningToolUpgradeId>(['scanner', 'auto-hauler']);
  const base = createInitialMiningState();
  const rootSnapshot = isRecord(snapshot) ? snapshot : {};
  const boardSnapshot = isRecord(rootSnapshot.board) ? rootSnapshot.board : rootSnapshot;
  const runSnapshot = isRecord(rootSnapshot.run) ? rootSnapshot.run : rootSnapshot;
  const progressionSnapshot = isRecord(rootSnapshot.progression)
    ? rootSnapshot.progression
    : rootSnapshot;
  const uiSnapshot = isRecord(rootSnapshot.ui) ? rootSnapshot.ui : rootSnapshot;

  target.board = {
    ...base.board,
    ...boardSnapshot,
    playerFlags: readFlagGrid(boardSnapshot.playerFlags, base.board.playerFlags),
    systemFlags: readFlagGrid(boardSnapshot.systemFlags, base.board.systemFlags),
  };
  target.run = {
    ...base.run,
    ...runSnapshot,
    phase: readPhase(runSnapshot.phase, base.run.phase),
  };
  target.progression = {
    ...base.progression,
    ...progressionSnapshot,
    unlockedRavenSkillIds: readStringArray(
      progressionSnapshot.unlockedRavenSkillIds ?? rootSnapshot.unlockedRavenSkillIds,
      base.progression.unlockedRavenSkillIds
    ).filter((skillId): skillId is MiningRavenSkillId => validRavenSkillIds.has(skillId)),
    unlockedToolUpgradeIds: readStringArray(
      progressionSnapshot.unlockedToolUpgradeIds ?? rootSnapshot.unlockedToolUpgradeIds,
      base.progression.unlockedToolUpgradeIds
    ).filter((upgradeId): upgradeId is MiningToolUpgradeId => validToolUpgradeIds.has(upgradeId)),
    earnedRewardIds: readStringArray(
      progressionSnapshot.earnedRewardIds ?? rootSnapshot.earnedRewardIds,
      base.progression.earnedRewardIds
    ),
  };
  target.ui = {
    ...base.ui,
    hasSeenIntroThisRun:
      typeof uiSnapshot.hasSeenIntroThisRun === 'boolean'
        ? uiSnapshot.hasSeenIntroThisRun
        : base.ui.hasSeenIntroThisRun,
    lastActionMessage:
      typeof uiSnapshot.lastActionMessage === 'string'
        ? uiSnapshot.lastActionMessage
        : base.ui.lastActionMessage,
    leaderboardName:
      typeof uiSnapshot.leaderboardName === 'string'
        ? uiSnapshot.leaderboardName
        : base.ui.leaderboardName,
    scoreSubmitted:
      typeof uiSnapshot.scoreSubmitted === 'boolean'
        ? uiSnapshot.scoreSubmitted
        : base.ui.scoreSubmitted,
  };
  target.leaderboard = {
    entries: [...target.leaderboard.entries],
  };
  target.system = {
    ...base.system,
    persistenceInitialized: true,
    persistenceHydrating: false,
  };
}
