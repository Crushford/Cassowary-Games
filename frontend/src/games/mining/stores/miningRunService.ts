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

export type MiningPuzzleLoader = (
  lastPuzzleId: string | null,
  size: number
) => Promise<MiningPuzzleRecord>;

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
    daysElapsed: state.run.daysElapsed,
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
  const actions = buildMiningAutomationPlan({
    size: state.board.boardSize,
    revealed: state.board.revealed,
    systemFlags: seedSystemFlags,
    revealedGoldPositions: foundGold,
    regionIds: state.board.regionIds,
    ownedSkillIds: state.progression.magpieSkillIds,
    scannerEnabled: state.progression.ownedToolUpgradeIds.includes('scanner'),
  });
  const nextSystemFlags = seedSystemFlags.map((row) => [...row]);

  for (const action of actions) {
    nextSystemFlags[action.row][action.col] = 'not-gold';
  }

  state.board.systemFlags = nextSystemFlags;
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
    const puzzle = await _activePuzzleLoader(
      state.board.currentPuzzleId,
      state.progression.maxPlotSize
    );
    const board = convertQueensPuzzleToMiningBoard(puzzle);

    state.board.currentPuzzleId = board.puzzleId;
    state.board.boardSize = board.size;
    state.board.truthGold = board.truthGold;
    state.board.regionIds = board.regionIds;
    state.board.revealed = createBooleanGrid(board.size);
    state.board.playerFlags = createFlagGrid(board.size);
    state.board.systemFlags = createFlagGrid(board.size);
    state.run.foundGoldCount = 0;
    state.run.currentLevel += 1;
    state.run.phase = 'playing';
    state.ui.lastActionMessage = `Level ${state.run.currentLevel}. Each dig adds 1 day to your run.`;
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
    state.ui.errorMessage = 'Finish town business before returning to the field.';
    state.ui.errorTick += 1;
    return;
  }

  if (state.board.revealed[position.row]?.[position.col]) {
    logMiningInteraction('toggle-flag-blocked', state, position, {
      reason: 'tile-already-revealed',
    });
    return;
  }

  setPlayerGoldHereFlag(state, position);
  state.ui.lastActionMessage =
    state.board.playerFlags[position.row][position.col] === 'gold-here'
      ? 'Gold-here flag placed.'
      : 'Gold-here flag removed.';
  logMiningInteraction('toggle-flag', state, position, {
    overridingSystemNotGold:
      state.board.systemFlags[position.row]?.[position.col] === 'not-gold' &&
      state.board.playerFlags[position.row][position.col] === 'gold-here',
    resultingPlayerFlag: state.board.playerFlags[position.row][position.col],
    systemFlag: state.board.systemFlags[position.row][position.col],
  });
}

export async function goToNextField(
  state: MiningStoreState,
  deps: { setError(message: string): void; loadNextLevel(): Promise<void> },
  { automatic = false }: { automatic?: boolean } = {}
) {
  if (state.run.phase !== 'playing' && state.run.phase !== 'level-complete') {
    return;
  }

  if (state.economy.goldTotal < NEXT_FIELD_COST) {
    deps.setError('You need 1 gold to move to the next field.');
    return;
  }

  if (state.board.pendingLevelTimeout !== null) {
    window.clearTimeout(state.board.pendingLevelTimeout);
    state.board.pendingLevelTimeout = null;
  }

  state.economy.goldTotal -= NEXT_FIELD_COST;
  state.ui.lastActionMessage = automatic
    ? 'The auto hauler spent 1 gold and moved you to the next field.'
    : 'You spent 1 gold and moved to the next field.';
  await deps.loadNextLevel();
}

function applyGoldReward(state: MiningStoreState, position: PositionRef) {
  const reward = GOLD_REWARD_PER_TILE;
  state.economy.goldTotal += reward;
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
    state.economy.goldTotal >= NEXT_FIELD_COST
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
    deps.setError('Finish town business before returning to the field.');
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
  }
}

export function canTravelToNextField(state: MiningStoreState): boolean {
  return (
    (state.run.phase === 'playing' || state.run.phase === 'level-complete') &&
    state.economy.goldTotal >= NEXT_FIELD_COST
  );
}
