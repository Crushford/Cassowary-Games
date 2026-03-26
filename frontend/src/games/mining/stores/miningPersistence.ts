import type {
  MiningFieldId,
  MiningMagpieSkillId,
  MiningPermitTierId,
  MiningPhase,
  MiningProgressionTab,
  MiningToolUpgradeId,
} from '../game/types';
import { MINING_SAVE_KEY } from './miningConfig';
import { createInitialMiningState, type MiningStoreState } from './miningState';

interface MiningSaveSnapshot {
  board?: Partial<MiningStoreState['board']>;
  run?: Partial<Omit<MiningStoreState['run'], 'phase'>> & {
    phase?: Exclude<MiningPhase, 'loading'>;
  };
  economy?: Partial<MiningStoreState['economy']>;
  progression?: Partial<MiningStoreState['progression']>;
  ui?: Partial<Pick<MiningStoreState['ui'], 'hasSeenIntroThisRun' | 'lastActionMessage'>>;
  [key: string]: unknown;
}

type MiningSaveSource = MiningSaveSnapshot | Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringArray<T extends string>(value: unknown, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value.filter((item): item is T => typeof item === 'string');
}

function readPhase(value: unknown, fallback: MiningStoreState['run']['phase']) {
  if (
    value === 'idle' ||
    value === 'playing' ||
    value === 'level-complete' ||
    value === 'out-of-food' ||
    value === 'dead'
  ) {
    return value;
  }

  return fallback;
}

function readProgressionTab(
  progressionSnapshot: Record<string, unknown>,
  rootSnapshot: Record<string, unknown>,
  fallback: MiningProgressionTab
): MiningProgressionTab {
  const value = progressionSnapshot.selectedTab ?? rootSnapshot.selectedProgressionTab;
  return value === 'food-shop' ||
    value === 'gold-exchange' ||
    value === 'animal-trainer' ||
    value === 'ui-upgrades'
    ? value
    : fallback;
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
    board: {
      ...state.board,
      pendingLevelTimeout: null,
    },
    run: {
      ...state.run,
      phase: state.run.phase === 'loading' ? 'playing' : state.run.phase,
    },
    economy: { ...state.economy },
    progression: {
      ...state.progression,
      ownedFieldIds: [...state.progression.ownedFieldIds],
      magpieSkillIds: [...state.progression.magpieSkillIds],
      ownedPermitTierIds: [...state.progression.ownedPermitTierIds],
      ownedToolUpgradeIds: [...state.progression.ownedToolUpgradeIds],
      selectedTab: state.progression.selectedTab as MiningProgressionTab,
    },
    ui: {
      hasSeenIntroThisRun: state.ui.hasSeenIntroThisRun,
      lastActionMessage: state.ui.lastActionMessage,
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

export function restoreMiningState(target: MiningStoreState, snapshot: MiningSaveSnapshot) {
  const base = createInitialMiningState();
  const rootSnapshot = isRecord(snapshot) ? snapshot : {};
  const boardSnapshot = isRecord(rootSnapshot.board) ? rootSnapshot.board : rootSnapshot;
  const runSnapshot = isRecord(rootSnapshot.run) ? rootSnapshot.run : rootSnapshot;
  const economySnapshot = isRecord(rootSnapshot.economy) ? rootSnapshot.economy : rootSnapshot;
  const progressionSnapshot = isRecord(rootSnapshot.progression)
    ? rootSnapshot.progression
    : rootSnapshot;
  const uiSnapshot = isRecord(rootSnapshot.ui) ? rootSnapshot.ui : rootSnapshot;

  target.board = {
    ...base.board,
    ...boardSnapshot,
    pendingLevelTimeout: null,
  };
  target.run = {
    ...base.run,
    ...runSnapshot,
    phase: readPhase(runSnapshot.phase, base.run.phase),
  };
  target.economy = {
    ...base.economy,
    ...economySnapshot,
  };
  target.progression = {
    ...base.progression,
    ...progressionSnapshot,
    selectedTab: readProgressionTab(
      progressionSnapshot,
      rootSnapshot,
      base.progression.selectedTab
    ),
    ownedFieldIds: readStringArray(
      progressionSnapshot.ownedFieldIds ?? rootSnapshot.ownedFieldIds,
      base.progression.ownedFieldIds
    ) as MiningFieldId[],
    magpieSkillIds: readStringArray(
      progressionSnapshot.magpieSkillIds ?? rootSnapshot.magpieSkillIds,
      base.progression.magpieSkillIds
    ) as MiningMagpieSkillId[],
    ownedPermitTierIds: readStringArray(
      progressionSnapshot.ownedPermitTierIds ?? rootSnapshot.ownedPermitTierIds,
      base.progression.ownedPermitTierIds
    ) as MiningPermitTierId[],
    ownedToolUpgradeIds: readStringArray(
      progressionSnapshot.ownedToolUpgradeIds ?? rootSnapshot.ownedToolUpgradeIds,
      base.progression.ownedToolUpgradeIds
    ) as MiningToolUpgradeId[],
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
    showDeathModal: target.run.phase === 'out-of-food',
  };
  target.system = {
    ...base.system,
    persistenceInitialized: true,
    persistenceHydrating: false,
  };
}
