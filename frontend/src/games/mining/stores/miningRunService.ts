import { buildMiningAutomationPlan } from '../game/progression/miningAutomationEngine';
import { loadRandomMiningPuzzle } from '../game/puzzles/loadMiningPuzzle';
import { convertQueensPuzzleToMiningBoard } from '../game/puzzles/convertQueensPuzzleToMiningBoard';
import { getFoundGoldPositions } from '../game/selectors/getFoundGoldPositions';
import type { MiningFlagType, MiningPuzzleRecord, PositionRef } from '../game/types';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';
import {
  DIG_COST,
  GOLD_REWARD_PER_TILE,
  LEVEL_COMPLETE_DELAY_MS,
  NEXT_FIELD_COST,
} from './miningConfig';
import type { MiningStoreState } from './miningState';

export type MiningPuzzleLoader = (lastPuzzleId: string | null) => Promise<MiningPuzzleRecord>;

let _activePuzzleLoader: MiningPuzzleLoader = loadRandomMiningPuzzle;

export function __setPuzzleLoaderForTests(loader: MiningPuzzleLoader): void {
  _activePuzzleLoader = loader;
}

export function __resetPuzzleLoaderForTests(): void {
  _activePuzzleLoader = loadRandomMiningPuzzle;
}

interface RunDeps {
  setError(message: string): void;
  clearError(): void;
}

interface DigDeps extends RunDeps {
  goToNextField(options?: { automatic?: boolean }): Promise<void>;
}

function logMiningInteraction(
  label: string,
  state: MiningStoreState,
  position?: PositionRef,
  extra?: Record<string, unknown>
) {
  console.log(`[mining][${label}]`, {
    row: position?.row,
    col: position?.col,
    phase: state.run.phase,
    daysLeftInMonth: state.run.daysLeftInMonth,
    foundGoldCount: state.run.foundGoldCount,
    boardSize: state.board.boardSize,
    progressionMenuOpen: state.ui.progressionMenuOpen,
    townStep: state.progression.townStep,
    ...extra,
  });
}

function createFlagGrid(size: number): Array<Array<MiningFlagType | null>> {
  return Array.from({ length: size }, () => Array<MiningFlagType | null>(size).fill(null));
}

function sanitizeSystemFlags(state: MiningStoreState): Array<Array<MiningFlagType | null>> {
  return state.board.systemFlags.map((row, rowIndex) =>
    row.map((flag, colIndex) => (state.board.revealed[rowIndex][colIndex] ? null : flag))
  );
}

export function recomputeSystemFlags(state: MiningStoreState) {
  const hasMagpie = state.progression.magpieSkillIds.includes('buy-magpie');
  if (!hasMagpie) {
    state.board.systemFlags = createFlagGrid(state.board.boardSize);
    return;
  }

  const foundGold = getFoundGoldPositions(state.board.truthGold, state.board.revealed);
  const seedSystemFlags = sanitizeSystemFlags(state);
  const hasSeedFlags = seedSystemFlags.some((row) => row.some((flag) => flag !== null));

  if (foundGold.length === 0 && !hasSeedFlags) {
    state.board.systemFlags = createFlagGrid(state.board.boardSize);
  } else {
    const actions = buildMiningAutomationPlan({
      size: state.board.boardSize,
      revealed: state.board.revealed,
      systemFlags: seedSystemFlags,
      revealedGoldPositions: foundGold,
      regionIds: state.board.regionIds,
      ownedSkillIds: state.progression.magpieSkillIds,
    });
    const nextSystemFlags = seedSystemFlags.map((row) => [...row]);

    for (const action of actions) {
      nextSystemFlags[action.row][action.col] =
        action.type === 'placeGoldHereFlag' ? 'gold-here' : 'not-gold';
    }

    state.board.systemFlags = nextSystemFlags;
  }

  for (let row = 0; row < state.board.boardSize; row += 1) {
    for (let col = 0; col < state.board.boardSize; col += 1) {
      if (
        state.board.playerFlags[row][col] === 'gold-here' &&
        state.board.systemFlags[row][col] === 'not-gold'
      ) {
        state.board.playerFlags[row][col] = null;
      }
    }
  }
}

function canDigAt(state: MiningStoreState, position: PositionRef): boolean {
  if (state.run.foundGoldCount === state.board.boardSize) {
    return true;
  }

  const playerFlag = state.board.playerFlags[position.row]?.[position.col];
  const systemFlag = state.board.systemFlags[position.row]?.[position.col];
  return playerFlag === 'gold-here' || systemFlag === 'gold-here';
}

function setPlayerGoldHereFlag(state: MiningStoreState, position: PositionRef) {
  if (state.board.systemFlags[position.row]?.[position.col] === 'not-gold') {
    return;
  }

  state.board.playerFlags[position.row][position.col] =
    state.board.playerFlags[position.row][position.col] === 'gold-here' ? null : 'gold-here';
}

export async function loadNextLevel(state: MiningStoreState, deps: RunDeps) {
  if (state.board.pendingLevelTimeout !== null) {
    window.clearTimeout(state.board.pendingLevelTimeout);
    state.board.pendingLevelTimeout = null;
  }

  state.run.phase = 'loading';
  deps.clearError();

  try {
    const puzzle = await _activePuzzleLoader(state.board.currentPuzzleId);
    const board = convertQueensPuzzleToMiningBoard(puzzle);

    state.board.currentPuzzleId = board.puzzleId;
    state.board.boardSize = board.size;
    state.board.truthGold = board.truthGold;
    state.board.regionIds = board.regionIds;
    state.board.revealed = createBooleanGrid(board.size);
    state.board.playerFlags = createFlagGrid(board.size);
    state.board.systemFlags = createFlagGrid(board.size);
    state.run.foundGoldCount = 0;
    state.ui.showDeathModal = false;
    state.run.deathMessage = null;
    state.run.currentLevel += 1;
    state.run.phase = 'playing';
    state.ui.lastActionMessage = `Level ${state.run.currentLevel}. Each dig uses 1 day this month.`;
    recomputeSystemFlags(state);
  } catch (error) {
    console.error('[mining] Failed to load next level', error);
    state.run.phase = 'idle';
    deps.setError('Unable to load a mining board right now.');
  }
}

export function toggleFlag(state: MiningStoreState, position: PositionRef) {
  if (state.run.phase !== 'playing') {
    logMiningInteraction('toggle-flag-blocked', state, position, {
      reason: 'phase-not-playing',
    });
    return;
  }

  if (state.board.revealed[position.row]?.[position.col]) {
    logMiningInteraction('toggle-flag-blocked', state, position, {
      reason: 'tile-already-revealed',
    });
    return;
  }

  const blockedBySystemNotGold =
    state.board.systemFlags[position.row]?.[position.col] === 'not-gold';
  setPlayerGoldHereFlag(state, position);
  state.ui.lastActionMessage =
    state.board.playerFlags[position.row][position.col] === 'gold-here'
      ? 'Gold-here flag placed.'
      : 'Gold-here flag removed.';
  logMiningInteraction('toggle-flag', state, position, {
    blockedBySystemNotGold,
    resultingPlayerFlag: state.board.playerFlags[position.row][position.col],
    systemFlag: state.board.systemFlags[position.row][position.col],
  });
}

export function triggerOutOfFood(state: MiningStoreState) {
  if (state.board.pendingLevelTimeout !== null) {
    window.clearTimeout(state.board.pendingLevelTimeout);
    state.board.pendingLevelTimeout = null;
  }

  state.run.phase = 'out-of-food';
  state.economy.foodTotal = 0;
  state.ui.showHintModal = false;
  state.ui.showUpgradeExplanation = false;
  state.ui.showDeathModal = true;
  state.ui.showFieldExhaustedModal = false;
  state.run.deathMessage =
    'When you run out of food, you must go into town and buy more food.\n\nWhile you are there, you can also convert your gold into coins and purchase upgrades.';
  state.ui.lastActionMessage = 'Out of food. Go to town for supplies, exchange, and upgrades.';
}

export function endMonthAndGoToTown(state: MiningStoreState) {
  state.run.phase = 'town';
  state.progression.townStep = 'exchange';
  state.progression.exchangeProcessedThisTown = false;
  state.progression.monthlyUpkeepPaid = false;
  state.ui.progressionMenuOpen = false;
  state.ui.showMonthOverModal = true;
  state.ui.lastActionMessage = 'The month is over. Time to head into town.';
}

export async function goToNextField(
  state: MiningStoreState,
  deps: { setError(message: string): void; loadNextLevel(): Promise<void> },
  { automatic = false }: { automatic?: boolean } = {}
) {
  if (state.run.phase !== 'playing' && state.run.phase !== 'level-complete') {
    return;
  }

  if (state.economy.coinsTotal < NEXT_FIELD_COST) {
    deps.setError('You need 1 coin to move to the next field.');
    return;
  }

  if (state.board.pendingLevelTimeout !== null) {
    window.clearTimeout(state.board.pendingLevelTimeout);
    state.board.pendingLevelTimeout = null;
  }

  state.economy.coinsTotal -= NEXT_FIELD_COST;
  state.ui.lastActionMessage = automatic
    ? 'The auto hauler paid 1 coin and moved you to the next field.'
    : 'You paid 1 coin and moved to the next field.';
  await deps.loadNextLevel();
}

function applyGoldReward(state: MiningStoreState, position: PositionRef) {
  const reward = GOLD_REWARD_PER_TILE;
  state.economy.goldTotal += reward;
  state.run.goldCollectedThisMonth += reward;
  state.run.foundGoldCount += 1;
  state.ui.lastActionMessage = `Day ${state.run.daysElapsed}: You found ${reward} gold.`;
  logMiningInteraction('dig-success', state, position, { result: 'gold', reward });

  if (state.run.foundGoldCount === state.board.boardSize) {
    state.ui.lastActionMessage =
      'You found all the gold in this field. You can keep digging out the rest of it.';
  }
}

function handleFieldComplete(state: MiningStoreState, deps: DigDeps) {
  state.run.phase = 'level-complete';

  if (
    state.progression.ownedToolUpgradeIds.includes('auto-hauler') &&
    state.economy.coinsTotal >= NEXT_FIELD_COST
  ) {
    state.ui.lastActionMessage =
      'You cleared the whole field. Auto hauler is lining up the next one.';
    state.board.pendingLevelTimeout = window.setTimeout(() => {
      state.board.pendingLevelTimeout = null;
      void deps.goToNextField({ automatic: true });
    }, LEVEL_COMPLETE_DELAY_MS);
  } else {
    state.ui.showFieldExhaustedModal = true;
    state.ui.lastActionMessage =
      'You dug this entire field. You can move to the next field whenever you are ready.';
  }
}

export async function dig(state: MiningStoreState, position: PositionRef, deps: DigDeps) {
  logMiningInteraction('dig-attempt', state, position, {
    revealed: state.board.revealed[position.row]?.[position.col] ?? null,
    playerFlag: state.board.playerFlags[position.row]?.[position.col] ?? null,
    systemFlag: state.board.systemFlags[position.row]?.[position.col] ?? null,
    canDigAt: canDigAt(state, position),
  });

  if (state.run.phase !== 'playing') {
    logMiningInteraction('dig-blocked', state, position, { reason: 'phase-not-playing' });
    return;
  }

  if (state.board.revealed[position.row]?.[position.col]) {
    logMiningInteraction('dig-blocked', state, position, { reason: 'tile-already-revealed' });
    return;
  }

  if (!canDigAt(state, position)) {
    logMiningInteraction('dig-blocked', state, position, {
      reason: 'missing-gold-here-flag',
      playerFlag: state.board.playerFlags[position.row]?.[position.col] ?? null,
      systemFlag: state.board.systemFlags[position.row]?.[position.col] ?? null,
    });
    return;
  }

  state.board.playerFlags[position.row][position.col] = null;
  state.board.revealed[position.row][position.col] = true;
  state.run.daysLeftInMonth = Math.max(0, state.run.daysLeftInMonth - 1);
  state.run.daysElapsed += 1;
  deps.clearError();

  const allTilesRevealed = state.board.revealed.every((row) => row.every(Boolean));

  if (state.board.truthGold[position.row][position.col]) {
    applyGoldReward(state, position);
    recomputeSystemFlags(state);
  } else {
    state.ui.lastActionMessage = `Day ${state.run.daysElapsed}: You dug an empty tile.`;
    logMiningInteraction('dig-success', state, position, { result: 'empty' });
  }

  if (allTilesRevealed) {
    handleFieldComplete(state, deps);
    return;
  }

  if (state.run.daysLeftInMonth === 0) {
    endMonthAndGoToTown(state);
  }
}

export function canTravelToNextField(state: MiningStoreState): boolean {
  return (
    (state.run.phase === 'playing' || state.run.phase === 'level-complete') &&
    state.economy.coinsTotal >= NEXT_FIELD_COST
  );
}
