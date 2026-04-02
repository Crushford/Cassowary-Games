import { MINING_CAMPAIGN_LEVELS } from '../game/levels';
import { buildMiningAutomationPlan } from '../game/progression/miningAutomationEngine';
import { convertQueensPuzzleToMiningBoard } from '../game/puzzles/convertQueensPuzzleToMiningBoard';
import { loadRandomMiningPuzzle } from '../game/puzzles/loadMiningPuzzle';
import { getFoundGoldPositions } from '../game/selectors/getFoundGoldPositions';
import type {
  MiningCampaignLevel,
  MiningFlagType,
  MiningMagpieSkillId,
  MiningPuzzleRecord,
  PositionRef,
} from '../game/types';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';
import type { MiningStoreState } from './miningState';

const GOLD_REWARD_PER_TILE = 1;

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
    levelIndex: state.run.currentLevelIndex,
    digsUsed: state.run.digsUsed,
    foundGoldCount: state.run.foundGoldCount,
    daysElapsed: state.run.daysElapsed,
    boardSize: state.board.boardSize,
    ...extra,
  });
}

function createFlagGrid(size: number): Array<Array<MiningFlagType | null>> {
  return Array.from({ length: size }, () => Array<MiningFlagType | null>(size).fill(null));
}

function getActiveLevel(state: MiningStoreState): MiningCampaignLevel {
  return MINING_CAMPAIGN_LEVELS[state.run.currentLevelIndex] ?? MINING_CAMPAIGN_LEVELS[0];
}

function sanitizeSystemFlags(state: MiningStoreState): Array<Array<MiningFlagType | null>> {
  return state.board.systemFlags.map((row, rowIndex) =>
    row.map((flag, colIndex) => (state.board.revealed[rowIndex][colIndex] ? null : flag))
  );
}

export function recomputeSystemFlags(state: MiningStoreState) {
  if (state.progression.unlockedRavenSkillIds.length === 0) {
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
    ownedSkillIds: state.progression.unlockedRavenSkillIds as MiningMagpieSkillId[],
    scannerEnabled: state.progression.unlockedToolUpgradeIds.includes('scanner'),
  });
  const nextSystemFlags = seedSystemFlags.map((row) => [...row]);

  for (const action of actions) {
    nextSystemFlags[action.row][action.col] = 'not-gold';
  }

  state.board.systemFlags = nextSystemFlags;
}

function canDigAt(state: MiningStoreState, position: PositionRef): boolean {
  const playerFlag = state.board.playerFlags[position.row]?.[position.col];
  const systemFlag = state.board.systemFlags[position.row]?.[position.col];
  return playerFlag === 'gold-here' || systemFlag === 'gold-here';
}

function setPlayerGoldHereFlag(state: MiningStoreState, position: PositionRef) {
  state.board.playerFlags[position.row][position.col] =
    state.board.playerFlags[position.row][position.col] === 'gold-here' ? null : 'gold-here';
}

export async function loadCurrentLevel(state: MiningStoreState, deps: RunDeps) {
  const level = getActiveLevel(state);

  state.run.phase = 'loading';
  deps.clearError();

  try {
    const puzzle = await _activePuzzleLoader(state.board.currentPuzzleId, level.boardSize);
    const board = convertQueensPuzzleToMiningBoard(puzzle);

    state.board.currentPuzzleId = board.puzzleId;
    state.board.boardSize = board.size;
    state.board.truthGold = board.truthGold;
    state.board.regionIds = board.regionIds;
    state.board.revealed = createBooleanGrid(board.size);
    state.board.playerFlags = createFlagGrid(board.size);
    state.board.systemFlags = createFlagGrid(board.size);
    state.run.foundGoldCount = 0;
    state.run.digsUsed = 0;
    state.run.phase = 'playing';
    state.ui.showLevelIntroModal = true;
    state.ui.showLevelResultModal = false;
    state.ui.levelResult = null;
    state.ui.lastActionMessage = `Level ${level.number}: find all the gold and meet the dig goal.`;
    recomputeSystemFlags(state);
  } catch (error) {
    console.error('[mining] Failed to load a mining board', error);
    state.run.phase = 'idle';
    deps.setError('Unable to load a mining board right now.');
  }
}

export function toggleFlag(state: MiningStoreState, position: PositionRef) {
  if (state.run.phase !== 'playing') {
    logMiningInteraction('toggle-flag-blocked', state, position, {
      reason: 'phase-not-playing',
    });
    state.ui.errorMessage = 'Finish this level screen before returning to the board.';
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
      ? 'Gold flag placed.'
      : 'Gold flag removed.';
  logMiningInteraction('toggle-flag', state, position, {
    overridingSystemNotGold:
      state.board.systemFlags[position.row]?.[position.col] === 'not-gold' &&
      state.board.playerFlags[position.row][position.col] === 'gold-here',
    resultingPlayerFlag: state.board.playerFlags[position.row][position.col],
    systemFlag: state.board.systemFlags[position.row][position.col],
  });
}

function applyGoldReward(state: MiningStoreState, position: PositionRef) {
  state.run.foundGoldCount += 1;
  state.ui.lastActionMessage = `Dig ${state.run.digsUsed}: You found ${GOLD_REWARD_PER_TILE} gold.`;
  logMiningInteraction('dig-success', state, position, { result: 'gold' });
}

function didPassLevel(state: MiningStoreState, level: MiningCampaignLevel): boolean {
  if (level.winConditions.requireAllGold && state.run.foundGoldCount < level.goldTarget) {
    return false;
  }

  if (
    typeof level.winConditions.maxDigsExclusive === 'number' &&
    state.run.digsUsed >= level.winConditions.maxDigsExclusive
  ) {
    return false;
  }

  return true;
}

function applyLevelReward(state: MiningStoreState, level: MiningCampaignLevel) {
  const reward = level.reward;
  if (!reward || state.progression.earnedRewardIds.includes(reward.id)) {
    return;
  }

  state.progression.earnedRewardIds.push(reward.id);

  for (const skillId of reward.unlocksRavenSkills ?? []) {
    if (!state.progression.unlockedRavenSkillIds.includes(skillId)) {
      state.progression.unlockedRavenSkillIds.push(skillId);
    }
  }

  for (const upgradeId of reward.unlocksToolUpgradeIds ?? []) {
    if (!state.progression.unlockedToolUpgradeIds.includes(upgradeId)) {
      state.progression.unlockedToolUpgradeIds.push(upgradeId);
    }
  }
}

function completeLevel(state: MiningStoreState) {
  const level = getActiveLevel(state);
  const passed = didPassLevel(state, level);

  state.run.phase = 'level-complete';
  state.ui.showLevelIntroModal = false;
  state.ui.showLevelResultModal = true;
  state.ui.levelResult = {
    passed,
    clueRevealed: false,
  };

  if (passed) {
    applyLevelReward(state, level);

    if (state.run.currentLevelIndex === state.run.highestUnlockedLevelIndex) {
      state.run.highestUnlockedLevelIndex = Math.min(
        MINING_CAMPAIGN_LEVELS.length - 1,
        state.run.highestUnlockedLevelIndex + 1
      );
    }

    state.ui.lastActionMessage = `Level ${level.number} complete in ${state.run.digsUsed} digs.`;
  } else {
    state.ui.lastActionMessage = `Level ${level.number} complete, but the goal was missed.`;
  }
}

export async function dig(state: MiningStoreState, position: PositionRef, deps: RunDeps) {
  logMiningInteraction('dig-attempt', state, position, {
    revealed: state.board.revealed[position.row]?.[position.col] ?? null,
    playerFlag: state.board.playerFlags[position.row]?.[position.col] ?? null,
    systemFlag: state.board.systemFlags[position.row]?.[position.col] ?? null,
    canDigAt: canDigAt(state, position),
  });

  if (state.run.phase !== 'playing') {
    logMiningInteraction('dig-blocked', state, position, { reason: 'phase-not-playing' });
    deps.setError('Finish this level screen before returning to the board.');
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
  state.run.digsUsed += 1;
  state.run.daysElapsed += 1;
  deps.clearError();

  if (state.board.truthGold[position.row][position.col]) {
    applyGoldReward(state, position);
    recomputeSystemFlags(state);

    if (state.run.foundGoldCount === getActiveLevel(state).goldTarget) {
      completeLevel(state);
    }
  } else {
    state.ui.lastActionMessage = `Dig ${state.run.digsUsed}: That square was empty.`;
    logMiningInteraction('dig-success', state, position, { result: 'empty' });
  }
}
