<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div class="text-white">
      <h2 class="text-2xl font-bold mb-4 block">Raid Alert!</h2>
      <div class="space-y-3 mb-6">
        <div>
          <span class="text-semantic-neutral-400">Year:</span>
          <span class="ml-2 font-semibold">{{ turnCounter }}</span>
        </div>
        <div>
          <span class="text-semantic-neutral-400">Raid Number:</span>
          <span class="ml-2 font-semibold">#{{ raidNumber }}</span>
        </div>
        <div class="bg-semantic-danger-900 bg-feedback-dangerSoft rounded p-3 mt-4">
          <div class="text-sm text-semantic-neutral-300 mb-2">Enemy Force:</div>
          <div v-for="enemy in enemyForce" :key="enemy.id" class="text-white font-semibold">
            {{ enemy.type }} - Strength: {{ enemy.strength }}, Rank: {{ enemy.rank }} (d{{
              getDieSize(enemy.rank)
            }})
          </div>
        </div>
        <div class="bg-feedback-infoSoft rounded p-3 mt-4">
          <div class="text-sm text-semantic-neutral-300 mb-2">Your Army:</div>
          <div class="text-white">
            {{ armyCount }} units, {{ totalArmyStrength }} total strength
          </div>
          <div class="text-sm text-semantic-neutral-400 mt-1">
            Average rank: {{ averageArmyRank }} (d{{ getAverageDieSize() }})
          </div>
          <div class="text-sm text-semantic-neutral-400 mt-1">
            Wall defense bonus: +{{ wallDefenseBonus }}
          </div>
        </div>

        <!-- Win Chance Forecast -->
        <div class="bg-semantic-neutral-700 rounded p-3 mt-4">
          <div class="text-sm text-semantic-neutral-300 mb-2">Win Chance Forecast:</div>
          <div class="text-lg font-semibold" :class="winChanceClass">
            {{ winChance }}
          </div>
          <div class="text-xs text-semantic-neutral-400 mt-1">
            Based on total strength comparison
          </div>
        </div>
      </div>
      <div class="border-t border-semantic-neutral-600 pt-4 mb-4">
        <div class="text-lg font-semibold mb-3">Choose your defense:</div>
        <div class="space-y-3">
          <button
            class="w-full bg-semantic-success-700 hover:bg-semantic-success-600 text-white font-semibold py-3 px-4 rounded transition-colors"
            @click="chooseBattle('countryside')"
          >
            Fight in Countryside
            <div class="text-sm font-normal mt-1 text-semantic-neutral-200">
              Protect farms • No wall bonus • Countryside damaged if defeated
            </div>
          </button>
          <button
            class="w-full bg-semantic-warning-700 hover:bg-semantic-warning-600 text-white font-semibold py-3 px-4 rounded transition-colors"
            @click="chooseBattle('wall')"
          >
            Defend at Wall
            <div class="text-sm font-normal mt-1 text-semantic-neutral-200">
              Use wall defense (+{{ wallDefenseBonus }}) • Lose all units if defeated
            </div>
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Modal from '../shared/Modal.vue';

const store = usePompeiiStore();

const isVisible = computed(() => {
  return (
    store.currentBattle !== null &&
    !store.currentBattle.isActive &&
    store.currentBattle.battleType === null
  );
});

const turnCounter = computed(() => store.turnCounter);
const raidNumber = computed(() => store.raidNumber);
const enemyForce = computed(() => store.currentBattle?.enemyForce || []);
const armyCount = computed(() => store.armyCount);
const totalArmyStrength = computed(() => store.totalArmyStrength);
const averageArmyRank = computed(() => store.averageArmyRank);
const wallDefenseBonus = computed(() => store.wallDefenseBonus);

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

function getAverageDieSize(): number {
  if (store.army.length === 0) return 4;
  const avgRank = Math.round(store.averageArmyRank);
  return getDieSize(avgRank);
}

const winChance = computed(() => {
  if (enemyForce.value.length === 0 || totalArmyStrength.value === 0) return 'Unknown';

  const enemyStrength = enemyForce.value.reduce((sum, e) => sum + e.strength, 0);
  const playerStrength = totalArmyStrength.value;
  const wallBonus = wallDefenseBonus.value;

  // Rough estimate: compare total strengths
  const totalPlayerStrength = playerStrength + wallBonus;
  const ratio = totalPlayerStrength / enemyStrength;

  if (ratio >= 1.5) return 'High';
  if (ratio >= 1.0) return 'Medium';
  if (ratio >= 0.7) return 'Low';
  return 'Very Low';
});

const winChanceClass = computed(() => {
  const chance = winChance.value;
  if (chance === 'High') return 'text-semantic-success-400';
  if (chance === 'Medium') return 'text-semantic-warning-400';
  if (chance === 'Low' || chance === 'Very Low') return 'text-semantic-danger-400';
  return 'text-semantic-neutral-400';
});

function chooseBattle(location: 'countryside' | 'wall'): void {
  store.chooseBattleLocation(location);
}

function handleClose(): void {
  // Don't allow closing - player must choose
}

defineOptions({
  name: 'RaidModal',
});
</script>
