import { getAutomationOption } from '../game/progression/automation';
import { getPlotPermit } from '../game/progression/plotPermits';
import { getToolUpgrade } from '../game/progression/toolUpgrades';
import type { MiningMagpieSkillId, MiningPlotPermitId, MiningToolUpgradeId } from '../game/types';
import {
  DEFAULT_LEVEL_RETURN_PERCENT,
  EXCHANGE_LEVELS,
  getExchangeLevelForMonthlyGold,
  getNextExchangeLevel,
} from './miningConfig';
import type { MiningStoreState } from './miningState';
import { recomputeSystemFlags } from './miningRunService';

interface ProgressionDeps {
  setError(message: string): void;
}

export function canExchangeGold(state: MiningStoreState): boolean {
  return !state.progression.exchangeProcessedThisTown;
}

export function exchangeGoldForCoins(
  state: MiningStoreState,
  deps: Pick<ProgressionDeps, 'setError'>
) {
  if (state.progression.exchangeProcessedThisTown) {
    return;
  }

  const soldGold = state.economy.goldTotal;
  const previousBestLevel = state.run.bestLevel;
  const reachedLevel = getExchangeLevelForMonthlyGold(soldGold);
  const returnPercent = reachedLevel.returnPercent ?? DEFAULT_LEVEL_RETURN_PERCENT;
  const nextLevel = getNextExchangeLevel(soldGold);

  state.exchange.lastSoldGold = soldGold;
  state.exchange.lastBaseValue = soldGold;
  state.exchange.lastReturnPercent = returnPercent;
  state.exchange.lastBonus = 0;
  state.exchange.lastPayout = soldGold;
  state.exchange.lastReachedLevel = reachedLevel.level;
  state.exchange.lastBestLevel = Math.max(previousBestLevel, reachedLevel.level);
  state.exchange.nextThreshold = nextLevel?.threshold ?? null;
  if (nextLevel) {
    const previousThreshold = EXCHANGE_LEVELS[Math.max(0, reachedLevel.level)].threshold;
    const span = Math.max(1, nextLevel.threshold - previousThreshold);
    state.exchange.progressRatio = Math.max(0, Math.min(1, (soldGold - previousThreshold) / span));
  } else {
    state.exchange.progressRatio = 1;
  }

  state.run.currentMonthLevel = reachedLevel.level;
  state.run.bestLevel = Math.max(state.run.bestLevel, reachedLevel.level);
  state.progression.exchangeProcessedThisTown = true;
  state.ui.lastActionMessage =
    soldGold > 0
      ? `The exchange graded ${soldGold} gold at level ${reachedLevel.level}.`
      : 'The exchange had no gold to grade this visit.';

  if (state.run.bestLevel > previousBestLevel) {
    state.ui.levelCelebration = {
      level: state.run.bestLevel,
      returnPercent,
      scannerUnlocked: state.run.bestLevel >= 3 && previousBestLevel < 3,
    };
  }
}

export function canBuyAutomation(state: MiningStoreState, skillId: MiningMagpieSkillId): boolean {
  const skill = getAutomationOption(skillId);
  if (skill.requiredLevel > state.run.bestLevel) {
    return false;
  }

  const hasMagpie = state.progression.magpieSkillIds.includes('buy-magpie');
  if (skill.id !== 'buy-magpie' && !hasMagpie) {
    return false;
  }

  if (
    skill.requires?.some((requiredId) => !state.progression.magpieSkillIds.includes(requiredId))
  ) {
    return false;
  }

  return (
    !state.progression.magpieSkillIds.includes(skillId) && state.economy.goldTotal >= skill.cost
  );
}

export function buyAutomation(
  state: MiningStoreState,
  skillId: MiningMagpieSkillId,
  deps: Pick<ProgressionDeps, 'setError'>
) {
  const skill = getAutomationOption(skillId);

  if (state.progression.magpieSkillIds.includes(skillId)) {
    deps.setError('That magpie lesson is already owned.');
    return;
  }

  if (skill.requiredLevel > state.run.bestLevel) {
    deps.setError('Reach a better exchange level before buying that lesson.');
    return;
  }

  if (skill.id !== 'buy-magpie' && !state.progression.magpieSkillIds.includes('buy-magpie')) {
    deps.setError('Requires Magpie.');
    return;
  }

  if (
    skill.requires?.some((requiredId) => !state.progression.magpieSkillIds.includes(requiredId))
  ) {
    deps.setError('Buy the earlier magpie lesson first.');
    return;
  }

  if (state.economy.goldTotal < skill.cost) {
    deps.setError('Not enough gold for that lesson.');
    return;
  }

  state.economy.goldTotal -= skill.cost;
  state.progression.magpieSkillIds.push(skillId);
  recomputeSystemFlags(state);
  state.ui.lastActionMessage = `${skill.title} purchased. ${skill.effectSummary}`;
}

export function canBuyToolUpgrade(
  state: MiningStoreState,
  upgradeId: MiningToolUpgradeId
): boolean {
  const upgrade = getToolUpgrade(upgradeId);
  return (
    upgrade.requiredLevel <= state.run.bestLevel &&
    !state.progression.ownedToolUpgradeIds.includes(upgradeId) &&
    state.economy.goldTotal >= upgrade.cost
  );
}

export function buyToolUpgrade(
  state: MiningStoreState,
  upgradeId: MiningToolUpgradeId,
  deps: ProgressionDeps
) {
  const upgrade = getToolUpgrade(upgradeId);

  if (state.progression.ownedToolUpgradeIds.includes(upgradeId)) {
    deps.setError('That tool upgrade is already owned.');
    return;
  }

  if (upgrade.requiredLevel > state.run.bestLevel) {
    deps.setError('Reach a better exchange level before buying that tool.');
    return;
  }

  if (state.economy.goldTotal < upgrade.cost) {
    deps.setError('Not enough gold for that tool upgrade.');
    return;
  }

  state.economy.goldTotal -= upgrade.cost;
  state.progression.ownedToolUpgradeIds.push(upgradeId);

  state.ui.lastActionMessage = `${upgrade.title} purchased. ${upgrade.effectSummary}`;
}

export function canBuyPlotPermit(state: MiningStoreState, permitId: MiningPlotPermitId): boolean {
  const permit = getPlotPermit(permitId);
  return (
    permit.requiredLevel <= state.run.bestLevel &&
    permit.size === state.progression.maxPlotSize + 1 &&
    state.economy.goldTotal >= permit.cost
  );
}

export function buyPlotPermit(
  state: MiningStoreState,
  permitId: MiningPlotPermitId,
  deps: ProgressionDeps
) {
  const permit = getPlotPermit(permitId);

  if (permit.requiredLevel > state.run.bestLevel) {
    deps.setError('Reach exchange level 4 before filing a larger plot permit.');
    return;
  }

  if (permit.size <= state.progression.maxPlotSize) {
    deps.setError('That plot permit is already filed.');
    return;
  }

  if (permit.size !== state.progression.maxPlotSize + 1) {
    deps.setError('File the next plot size permit before jumping to a larger claim.');
    return;
  }

  if (state.economy.goldTotal < permit.cost) {
    deps.setError('Not enough gold for that plot permit.');
    return;
  }

  state.economy.goldTotal -= permit.cost;
  state.progression.maxPlotSize = permit.size;
  state.ui.lastActionMessage = `${permit.title} purchased. ${permit.effectSummary}`;
}
