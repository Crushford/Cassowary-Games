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
  FOOD_SHOP_AMOUNT,
  FOOD_SHOP_COST,
  GOLD_EXCHANGE_RATE,
  TOOL_EXPLANATIONS,
} from './miningConfig';
import type { MiningStoreState } from './miningState';
import { recomputeSystemFlags } from './miningRunService';

interface ProgressionDeps {
  setError(message: string): void;
  loadNextLevel(): Promise<void>;
}

export function canBuyFood(state: MiningStoreState): boolean {
  return state.economy.coinsTotal >= FOOD_SHOP_COST;
}

export function buyFood(state: MiningStoreState, deps: Pick<ProgressionDeps, 'setError'>) {
  if (state.economy.coinsTotal < FOOD_SHOP_COST) {
    deps.setError('Not enough coins for food.');
    return;
  }

  state.economy.coinsTotal -= FOOD_SHOP_COST;
  state.economy.foodTotal += FOOD_SHOP_AMOUNT;
  if (state.run.phase === 'out-of-food') {
    state.run.phase = 'playing';
    state.ui.showDeathModal = false;
  }
  state.ui.lastActionMessage = `You bought ${FOOD_SHOP_AMOUNT} food in town.`;
}

export function canExchangeGold(state: MiningStoreState): boolean {
  return state.economy.goldTotal >= GOLD_EXCHANGE_RATE;
}

export function exchangeGoldForCoins(
  state: MiningStoreState,
  deps: Pick<ProgressionDeps, 'setError'>
) {
  if (state.economy.goldTotal < GOLD_EXCHANGE_RATE) {
    deps.setError('You need gold before you can exchange it for coins.');
    return;
  }

  state.economy.goldTotal -= GOLD_EXCHANGE_RATE;
  state.economy.coinsTotal += GOLD_EXCHANGE_RATE;
  state.ui.lastActionMessage = 'You exchanged 1 gold for 1 coin.';
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

  if (skillId !== 'buy-magpie' && !state.progression.magpieSkillIds.includes('buy-magpie')) {
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

  if (!skill.implemented) {
    deps.setError('That magpie lesson is still a prototype placeholder.');
    return;
  }

  if (skillId !== 'buy-magpie' && !state.progression.magpieSkillIds.includes('buy-magpie')) {
    deps.setError('Buy the magpie before purchasing lessons.');
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
