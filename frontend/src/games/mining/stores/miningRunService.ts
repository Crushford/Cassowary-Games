import { getPermitOption } from '../game/progression/permits';
import { getFieldOption } from '../game/progression/fields';
import { loadRandomMiningPuzzle } from '../game/puzzles/loadMiningPuzzle';
import { convertQueensPuzzleToMiningBoard } from '../game/puzzles/convertQueensPuzzleToMiningBoard';
import { buildSelectiveAutoFlagGrid } from '../game/rules/autoFlag';
import { buildQuartzTruthGrid } from '../game/rules/quartzTruth';
import { getFoundGoldPositions } from '../game/selectors/getFoundGoldPositions';
import type { MiningDepthLevel, PositionRef } from '../game/types';
import { getGoldRewardForDepth } from '../game/upgrades/miningUpgrades';
import { createBooleanGrid } from '../game/utils/createBooleanGrid';
import { DIG_COST, LEVEL_COMPLETE_DELAY_MS, NEXT_FIELD_COST } from './miningConfig';
import type { MiningStoreState } from './miningState';

interface RunDeps {
  setError(message: string): void;
  clearError(): void;
}

interface DigDeps extends RunDeps {
  goToNextField(options?: { automatic?: boolean }): Promise<void>;
}

export function recomputeSystemFlags(state: MiningStoreState) {
  const hasMagpie = state.progression.magpieSkillIds.includes('buy-magpie');
  if (!hasMagpie) {
    state.board.systemFlags = createBooleanGrid(state.board.boardSize);
    return;
  }

  const foundGold = getFoundGoldPositions(state.board.truthGold, state.board.revealed);
  if (foundGold.length === 0) {
    state.board.systemFlags = createBooleanGrid(state.board.boardSize);
    return;
  }

  const row = state.progression.magpieSkillIds.includes('teach-row-rule');
  const column = state.progression.magpieSkillIds.includes('teach-column-rule');
  const diagonal = state.progression.magpieSkillIds.includes('teach-diagonal-rule');

  if (!row && !column && !diagonal) {
    state.board.systemFlags = createBooleanGrid(state.board.boardSize);
    return;
  }

  state.board.systemFlags = buildSelectiveAutoFlagGrid(
    foundGold,
    state.board.revealed,
    state.board.boardSize,
    { row, column, diagonal }
  );
}

export async function loadNextLevel(state: MiningStoreState, deps: RunDeps) {
  if (state.board.pendingLevelTimeout !== null) {
    window.clearTimeout(state.board.pendingLevelTimeout);
    state.board.pendingLevelTimeout = null;
  }

  state.run.phase = 'loading';
  deps.clearError();

  try {
    const puzzle = await loadRandomMiningPuzzle(
      state.board.currentPuzzleId,
      state.progression.selectedFieldId
    );
    const board = convertQueensPuzzleToMiningBoard(puzzle);

    state.board.currentPuzzleId = board.puzzleId;
    state.board.boardSize = board.size;
    state.board.truthGold = board.truthGold;
    state.board.regionIds = board.regionIds;
    state.board.truthQuartz = buildQuartzTruthGrid(
      getFoundGoldPositions(board.truthGold, board.truthGold),
      board.size
    );
    state.board.revealed = createBooleanGrid(board.size);
    state.board.playerFlags = createBooleanGrid(board.size);
    state.board.systemFlags = createBooleanGrid(board.size);
    state.run.foundGoldCount = 0;
    state.ui.showDeathModal = false;
    state.run.deathMessage = null;
    state.run.currentLevel += 1;
    state.run.phase = 'playing';
    state.ui.lastActionMessage = `Level ${state.run.currentLevel}: ${getFieldOption(state.progression.selectedFieldId).title}. Each dig costs 1 food.`;
    recomputeSystemFlags(state);
  } catch (error) {
    console.error('[mining] Failed to load next level', error);
    state.run.phase = 'idle';
    deps.setError('Unable to load a mining board right now.');
  }
}

export function setDepthLevel(
  state: MiningStoreState,
  depthLevel: MiningDepthLevel,
  deps: { setError(message: string): void; loadNextLevel(): Promise<void> }
) {
  if (depthLevel > state.run.highestUnlockedDepthLevel) {
    deps.setError('That depth has not been unlocked yet.');
    return;
  }

  if (state.run.currentDepthLevel === depthLevel) {
    return;
  }

  state.run.currentDepthLevel = depthLevel;
  void deps.loadNextLevel();
}

export function toggleFlag(state: MiningStoreState, position: PositionRef) {
  if (state.run.phase !== 'playing') {
    return;
  }

  if (state.board.revealed[position.row]?.[position.col]) {
    return;
  }

  state.board.playerFlags[position.row][position.col] =
    !state.board.playerFlags[position.row][position.col];
  state.ui.lastActionMessage = state.board.playerFlags[position.row][position.col]
    ? 'Flag placed.'
    : 'Flag removed.';
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
  state.run.deathMessage =
    'When you run out of food, you must go into town and buy more food.\n\nWhile you are there, you can also convert your gold into coins and purchase upgrades.';
  state.ui.lastActionMessage = 'Out of food. Go to town for supplies, exchange, and upgrades.';
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

export async function dig(state: MiningStoreState, position: PositionRef, deps: DigDeps) {
  if (state.run.phase !== 'playing') {
    return;
  }

  if (state.board.revealed[position.row]?.[position.col]) {
    return;
  }

  if (state.economy.foodTotal < DIG_COST) {
    deps.clearError();
    triggerOutOfFood(state);
    return;
  }

  state.board.playerFlags[position.row][position.col] = false;
  state.board.revealed[position.row][position.col] = true;
  state.economy.foodTotal -= DIG_COST;
  state.run.daysElapsed += 1;
  deps.clearError();

  if (state.board.truthGold[position.row][position.col]) {
    const permitMultiplier = state.progression.activePermitTierId
      ? getPermitOption(state.progression.activePermitTierId).payoutMultiplier
      : 1;
    const reward = Math.round(
      getGoldRewardForDepth(state.run.currentDepthLevel) * permitMultiplier
    );
    state.economy.goldTotal += reward;
    state.run.foundGoldCount += 1;
    state.ui.lastActionMessage = `Day ${state.run.daysElapsed}: You spent 1 food and found ${reward} gold.`;
    recomputeSystemFlags(state);

    if (state.run.foundGoldCount === state.board.boardSize) {
      state.run.phase = 'level-complete';
      state.ui.lastActionMessage = `Level ${state.run.currentLevel} cleared. Pay 1 coin when you want to move to the next field.`;

      if (
        state.progression.ownedToolUpgradeIds.includes('auto-hauler') &&
        state.economy.coinsTotal >= NEXT_FIELD_COST
      ) {
        state.ui.lastActionMessage = `Level ${state.run.currentLevel} cleared. Auto hauler is lining up the next field.`;
        state.board.pendingLevelTimeout = window.setTimeout(() => {
          state.board.pendingLevelTimeout = null;
          void deps.goToNextField({ automatic: true });
        }, LEVEL_COMPLETE_DELAY_MS);
      } else if (
        state.progression.ownedToolUpgradeIds.includes('auto-hauler') &&
        state.economy.coinsTotal < NEXT_FIELD_COST
      ) {
        state.ui.lastActionMessage =
          'Level cleared, but the auto hauler needs 1 coin before it can move you to the next field.';
      }
    }

    return;
  }

  if (state.run.currentDepthLevel === 2 && state.board.truthQuartz[position.row][position.col]) {
    state.ui.lastActionMessage = `Day ${state.run.daysElapsed}: You spent 1 food and uncovered quartz.`;
  } else if (state.run.currentDepthLevel >= 3) {
    state.ui.lastActionMessage = `Day ${state.run.daysElapsed}: You spent 1 food and exposed the region rock.`;
  } else {
    state.ui.lastActionMessage = `Day ${state.run.daysElapsed}: You spent 1 food and dug an empty tile.`;
  }

  if (state.economy.foodTotal <= 0) {
    triggerOutOfFood(state);
  }
}

export function canTravelToNextField(state: MiningStoreState): boolean {
  return (
    (state.run.phase === 'playing' || state.run.phase === 'level-complete') &&
    state.economy.coinsTotal >= NEXT_FIELD_COST
  );
}
