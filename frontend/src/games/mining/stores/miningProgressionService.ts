import { getAutomationOption } from '../game/progression/automation';
import { getFieldOption } from '../game/progression/fields';
import { getPermitOption } from '../game/progression/permits';
import { getToolUpgrade } from '../game/progression/toolUpgrades';
import type {
  MiningFieldId,
  MiningMagpieSkillId,
  MiningPermitTierId,
  MiningToolUpgradeId,
} from '../game/types';
import {
  DEFAULT_LEVEL_RETURN_PERCENT,
  EXCHANGE_LEVELS,
  getExchangeLevelForMonthlyGold,
  getNextExchangeLevel,
  MONTHLY_UPKEEP_COST,
  TOOL_EXPLANATIONS,
} from './miningConfig';
import type { MiningStoreState } from './miningState';
import { recomputeSystemFlags } from './miningRunService';

interface ProgressionDeps {
  setError(message: string): void;
  loadNextLevel(): Promise<void>;
}

export function canBuyFood(state: MiningStoreState): boolean {
  return !state.progression.monthlyUpkeepPaid && state.economy.coinsTotal >= MONTHLY_UPKEEP_COST;
}

export function buyFood(state: MiningStoreState, deps: Pick<ProgressionDeps, 'setError'>) {
  if (state.progression.monthlyUpkeepPaid) {
    return;
  }

  if (state.economy.coinsTotal < MONTHLY_UPKEEP_COST) {
    deps.setError('Not enough coins for food.');
    return;
  }

  state.economy.coinsTotal -= MONTHLY_UPKEEP_COST;
  state.progression.monthlyUpkeepPaid = true;
  state.ui.lastActionMessage = 'You paid the monthly food bill for the next shift underground.';
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
  const baseValue = soldGold;
  const bonus = Math.round((baseValue * returnPercent) / 100);
  const payout = baseValue + bonus;
  const nextLevel = getNextExchangeLevel(soldGold);

  state.exchange.lastSoldGold = soldGold;
  state.exchange.lastBaseValue = baseValue;
  state.exchange.lastReturnPercent = returnPercent;
  state.exchange.lastBonus = bonus;
  state.exchange.lastPayout = payout;
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

  state.economy.goldTotal = 0;
  state.economy.coinsTotal += payout;
  state.run.currentMonthLevel = reachedLevel.level;
  state.run.bestLevel = Math.max(state.run.bestLevel, reachedLevel.level);
  state.progression.exchangeProcessedThisTown = true;
  state.ui.lastActionMessage =
    soldGold > 0
      ? `The exchange closed out ${soldGold} gold for ${payout} coins.`
      : 'The exchange closed out a lean month with no gold to sell.';

  if (state.run.bestLevel > previousBestLevel) {
    state.ui.levelCelebration = {
      level: state.run.bestLevel,
      returnPercent,
      scannerUnlocked: state.run.bestLevel >= 3 && previousBestLevel < 3,
    };
  }
}

export function canBuyField(state: MiningStoreState, fieldId: MiningFieldId): boolean {
  const field = getFieldOption(fieldId);
  return (
    field.implemented &&
    !state.progression.ownedFieldIds.includes(fieldId) &&
    state.economy.coinsTotal >= field.cost
  );
}

export function buyField(state: MiningStoreState, fieldId: MiningFieldId, deps: ProgressionDeps) {
  const field = getFieldOption(fieldId);

  if (state.progression.ownedFieldIds.includes(fieldId)) {
    selectField(state, fieldId, deps);
    return;
  }

  if (!field.implemented) {
    deps.setError('That field profile is visible for testing, but not implemented yet.');
    return;
  }

  if (state.economy.coinsTotal < field.cost) {
    deps.setError('Not enough coins for that field profile.');
    return;
  }

  state.economy.coinsTotal -= field.cost;
  state.progression.ownedFieldIds.push(fieldId);
  state.progression.selectedFieldId = fieldId;
  state.ui.lastActionMessage = `${field.title} unlocked and selected.`;
  void deps.loadNextLevel();
}

export function selectField(
  state: MiningStoreState,
  fieldId: MiningFieldId,
  deps: ProgressionDeps | Pick<ProgressionDeps, 'setError' | 'loadNextLevel'>
) {
  if (!state.progression.ownedFieldIds.includes(fieldId)) {
    deps.setError('Buy that field profile first.');
    return;
  }

  if (state.progression.selectedFieldId === fieldId) {
    return;
  }

  state.progression.selectedFieldId = fieldId;
  state.ui.lastActionMessage = `${getFieldOption(fieldId).title} selected.`;
  void deps.loadNextLevel();
}

export function canBuyAutomation(state: MiningStoreState, skillId: MiningMagpieSkillId): boolean {
  const skill = getAutomationOption(skillId);
  if (!skill.implemented) {
    return false;
  }

  if (skill.requiredLevel > state.run.bestLevel) {
    return false;
  }

  if (
    skill.requires?.some((requiredId) => !state.progression.magpieSkillIds.includes(requiredId))
  ) {
    return false;
  }

  if (
    typeof skill.minDepthLevel === 'number' &&
    state.run.highestUnlockedDepthLevel < skill.minDepthLevel
  ) {
    return false;
  }

  return (
    !state.progression.magpieSkillIds.includes(skillId) && state.economy.coinsTotal >= skill.cost
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

  if (!skill.implemented) {
    deps.setError('That magpie lesson is still a prototype placeholder.');
    return;
  }

  if (
    skill.requires?.some((requiredId) => !state.progression.magpieSkillIds.includes(requiredId))
  ) {
    deps.setError('Buy the earlier magpie lesson first.');
    return;
  }

  if (
    typeof skill.minDepthLevel === 'number' &&
    state.run.highestUnlockedDepthLevel < skill.minDepthLevel
  ) {
    deps.setError('Unlock more survey tools before buying that lesson.');
    return;
  }

  if (state.economy.coinsTotal < skill.cost) {
    deps.setError('Not enough coins for that lesson.');
    return;
  }

  state.economy.coinsTotal -= skill.cost;
  state.progression.magpieSkillIds.push(skillId);
  recomputeSystemFlags(state);
  state.ui.lastActionMessage = `${skill.title} purchased. ${skill.effectSummary}`;
}

export function canBuyPermit(state: MiningStoreState, permitId: MiningPermitTierId): boolean {
  const permit = getPermitOption(permitId);
  return (
    !state.progression.ownedPermitTierIds.includes(permitId) &&
    state.economy.coinsTotal >= permit.cost
  );
}

export function buyPermit(
  state: MiningStoreState,
  permitId: MiningPermitTierId,
  deps: Pick<ProgressionDeps, 'setError'>
) {
  const permit = getPermitOption(permitId);

  if (state.progression.ownedPermitTierIds.includes(permitId)) {
    activatePermit(state, permitId, deps);
    return;
  }

  if (state.economy.coinsTotal < permit.cost) {
    deps.setError('Not enough coins for that permit.');
    return;
  }

  state.economy.coinsTotal -= permit.cost;
  state.progression.ownedPermitTierIds.push(permitId);
  state.progression.activePermitTierId = permitId;
  state.ui.lastActionMessage = `${permit.title} activated. Payouts now run at ${permit.payoutMultiplier}x.`;
}

export function activatePermit(
  state: MiningStoreState,
  permitId: MiningPermitTierId,
  deps: Pick<ProgressionDeps, 'setError'>
) {
  if (!state.progression.ownedPermitTierIds.includes(permitId)) {
    deps.setError('Buy that permit first.');
    return;
  }

  state.progression.activePermitTierId = permitId;
  state.ui.lastActionMessage = `${getPermitOption(permitId).title} set as the active permit.`;
}

export function canBuyToolUpgrade(
  state: MiningStoreState,
  upgradeId: MiningToolUpgradeId
): boolean {
  const upgrade = getToolUpgrade(upgradeId);
  return (
    upgrade.implemented &&
    upgrade.requiredLevel <= state.run.bestLevel &&
    !state.progression.ownedToolUpgradeIds.includes(upgradeId) &&
    state.economy.coinsTotal >= upgrade.cost
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

  if (!upgrade.implemented) {
    deps.setError('That tool slot is visible for prototype planning, but not live yet.');
    return;
  }

  if (upgrade.requiredLevel > state.run.bestLevel) {
    deps.setError('Reach a better exchange level before buying that tool.');
    return;
  }

  if (state.economy.coinsTotal < upgrade.cost) {
    deps.setError('Not enough coins for that tool upgrade.');
    return;
  }

  state.economy.coinsTotal -= upgrade.cost;
  state.progression.ownedToolUpgradeIds.push(upgradeId);

  if (upgrade.unlocksDepth) {
    state.run.highestUnlockedDepthLevel = Math.max(
      state.run.highestUnlockedDepthLevel,
      upgrade.unlocksDepth
    ) as typeof state.run.highestUnlockedDepthLevel;
    state.run.currentDepthLevel = upgrade.unlocksDepth;
  }

  if (TOOL_EXPLANATIONS[upgradeId]) {
    state.ui.upgradeExplanationTitle = `${upgrade.title} Purchased`;
    state.ui.upgradeExplanationMessage = TOOL_EXPLANATIONS[upgradeId] ?? '';
    state.ui.showUpgradeExplanation = true;
  }

  state.ui.progressionMenuOpen = false;
  state.ui.lastActionMessage = `${upgrade.title} purchased. ${upgrade.effectSummary}`;

  if (upgrade.unlocksDepth) {
    void deps.loadNextLevel();
  }
}
