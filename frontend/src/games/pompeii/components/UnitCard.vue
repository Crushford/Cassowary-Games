<template>
  <div class="bg-semantic-neutral-700 rounded p-3">
    <div class="flex items-center justify-between mb-2 gap-2 min-w-0">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="text-white font-semibold truncate" :title="unit.type">{{ unit.type }}</span>
        <span
          :class="[
            'px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap flex-shrink-0',
            getRankBadgeClass(unit.rank),
          ]"
        >
          Rank {{ unit.rank }}
        </span>
        <span
          :class="[
            'px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0',
            getDieBadgeClass(unit.rank),
          ]"
        >
          d{{ getDieSize(unit.rank) }}
        </span>
      </div>
    </div>

    <!-- Strength Bar -->
    <div class="mb-3">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-semantic-neutral-400">Strength</span>
        <span class="text-sm font-semibold"> {{ unit.strength }}/{{ unit.maxStrength }} </span>
      </div>
      <div class="flex-1 bg-semantic-neutral-600 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-all"
          :class="getStrengthBarColor(unit.strength, unit.maxStrength)"
          :style="{ width: `${(unit.strength / unit.maxStrength) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Upgrade Buttons -->
    <div class="flex gap-2">
      <button
        :disabled="!canUpgradeRank || gold < rankUpgradeCost || gameOver"
        class="flex-1 bg-semantic-info-600 hover:bg-semantic-info-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white text-xs font-semibold py-1.5 px-2 rounded transition-colors"
        @click="upgradeRank"
      >
        Rank ↑<br />
        <span class="text-xs">{{ rankUpgradeCost }}g</span>
      </button>
      <button
        :disabled="gold < strengthUpgradeCost || gameOver"
        class="flex-1 bg-semantic-success-600 hover:bg-semantic-success-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white text-xs font-semibold py-1.5 px-2 rounded transition-colors"
        @click="upgradeStrength"
      >
        Strength ↑<br />
        <span class="text-xs">{{ strengthUpgradeCost }}g</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '@/games/pompeii/stores/pompeiiStore';
import type { ArmyUnit } from '@/games/pompeii/stores/pompeiiStore';

const props = defineProps<{
  unit: ArmyUnit;
}>();

const store = usePompeiiStore();

const gold = computed(() => store.gold);
const gameOver = computed(() => store.gameOver);
const canUpgradeRank = computed(() => store.canUpgradeUnitRank(props.unit.id));
const rankUpgradeCost = computed(() => store.unitRankUpgradeCost(props.unit.id));
const strengthUpgradeCost = computed(() => store.unitStrengthUpgradeCost(props.unit.id));

function getDieSize(rank: number): number {
  const dieMap: Record<number, number> = {
    1: 4,
    2: 6,
    3: 8,
    4: 10,
    5: 12,
  };
  return dieMap[rank] || 4;
}

function getRankBadgeClass(rank: number): string {
  const classMap: Record<number, string> = {
    1: 'bg-semantic-neutral-500 text-white',
    2: 'bg-semantic-info-500 text-white',
    3: 'bg-semantic-success-500 text-white',
    4: 'bg-semantic-info-500 text-white',
    5: 'bg-semantic-warning-500 text-black',
  };
  return classMap[rank] || 'bg-semantic-neutral-500 text-white';
}

function getDieBadgeClass(rank: number): string {
  const dieSize = getDieSize(rank);
  const classMap: Record<number, string> = {
    4: 'bg-semantic-neutral-600 text-semantic-neutral-200',
    6: 'bg-semantic-info-600 text-semantic-info-200',
    8: 'bg-semantic-success-600 text-semantic-success-200',
    10: 'bg-semantic-info-600 text-semantic-info-200',
    12: 'bg-semantic-warning-600 text-semantic-warning-200',
  };
  return classMap[dieSize] || 'bg-semantic-neutral-600 text-semantic-neutral-200';
}

function getStrengthBarColor(strength: number, maxStrength: number): string {
  const percentage = (strength / maxStrength) * 100;
  if (percentage > 60) return 'bg-semantic-success-500';
  if (percentage > 30) return 'bg-semantic-warning-500';
  return 'bg-semantic-danger-500';
}

function upgradeRank(): void {
  store.upgradeUnitRank(props.unit.id);
}

function upgradeStrength(): void {
  store.upgradeUnitStrength(props.unit.id);
}

defineOptions({
  name: 'UnitCard',
});
</script>
