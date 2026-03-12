<template>
  <Modal :is-visible="isVisible" @close="handleClose">
    <div class="text-white">
      <h2 class="text-2xl font-bold mb-4">Battle in Progress</h2>

      <!-- Battle Info -->
      <div class="mb-4 space-y-2">
        <div class="flex justify-between">
          <span class="text-semantic-neutral-400">Round:</span>
          <span class="font-semibold">{{ roundNumber }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-semantic-neutral-400">Battle Type:</span>
          <span class="font-semibold capitalize">{{ battleType }}</span>
          <span v-if="battleType === 'wall'" class="text-sm text-semantic-warning-400 ml-2">
            (+{{ wallDefenseBonus }} wall bonus)
          </span>
        </div>
      </div>

      <!-- Army Status Grid -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- Player Army -->
        <div class="bg-feedback-infoSoft rounded p-3">
          <div class="text-sm text-semantic-neutral-300 mb-2 font-semibold">Your Army</div>
          <div v-if="army.length === 0" class="text-semantic-danger-400 font-semibold">
            No units remaining!
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="unit in army"
              :key="unit.id"
              class="text-sm bg-semantic-neutral-800 rounded p-2"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ unit.type }}</span>
                <span class="text-xs text-semantic-neutral-400">Rank {{ unit.rank }}</span>
              </div>
              <div class="mt-1">
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-semantic-neutral-700 rounded-full h-2">
                    <div
                      class="bg-semantic-success-500 h-2 rounded-full transition-all"
                      :style="{ width: `${(unit.strength / unit.maxStrength) * 100}%` }"
                    ></div>
                  </div>
                  <span class="text-xs font-semibold">
                    {{ unit.strength }}/{{ unit.maxStrength }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Enemy Force -->
        <div class="bg-feedback-dangerSoft rounded p-3">
          <div class="text-sm text-semantic-neutral-300 mb-2 font-semibold">Enemy Force</div>
          <div v-if="enemyForce.length === 0" class="text-semantic-success-400 font-semibold">
            Defeated!
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="enemy in enemyForce"
              :key="enemy.id"
              class="text-sm bg-semantic-neutral-800 rounded p-2"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ enemy.type }}</span>
                <span class="text-xs text-semantic-neutral-400">Rank {{ enemy.rank }}</span>
              </div>
              <div class="mt-1">
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-semantic-neutral-700 rounded-full h-2">
                    <div
                      class="bg-semantic-danger-500 h-2 rounded-full transition-all"
                      :style="{ width: `${(enemy.strength / enemy.maxStrength) * 100}%` }"
                    ></div>
                  </div>
                  <span class="text-xs font-semibold">
                    {{ enemy.strength }}/{{ enemy.maxStrength }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dice Area -->
      <div class="mb-4">
        <div class="text-sm text-semantic-neutral-300 mb-2 text-center">
          Round {{ roundNumber }} Results
        </div>
        <BattleDice :dice-roll="lastDiceRoll" :is-rolling="isRolling" />
      </div>

      <!-- Battle Log -->
      <div class="bg-semantic-neutral-700 rounded p-3 mb-4 max-h-48 overflow-y-auto">
        <div class="text-sm text-semantic-neutral-300 mb-2">Battle Log</div>
        <div class="space-y-1 text-sm">
          <div v-for="(log, index) in battleLog" :key="index" class="text-semantic-neutral-200">
            {{ log }}
          </div>
          <div v-if="battleLog.length === 0" class="text-semantic-neutral-400 italic">
            Battle hasn't started yet...
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          v-if="!isBattleOver"
          :disabled="isRolling"
          class="flex-1 bg-semantic-info-600 hover:bg-semantic-info-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 rounded transition-colors"
          @click="autoResolve"
        >
          Auto-Resolve Battle
        </button>
        <button
          v-if="!isBattleOver"
          :disabled="isRolling"
          class="flex-1 bg-semantic-danger-600 hover:bg-semantic-danger-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 rounded transition-colors"
          @click="executeRound"
        >
          {{ isRolling ? 'Rolling...' : 'Step Through Rounds' }}
        </button>
        <button
          v-if="isBattleOver"
          class="flex-1 bg-semantic-success-600 hover:bg-semantic-success-700 text-white font-semibold py-2 px-4 rounded transition-colors"
          @click="endBattle"
        >
          View Results
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Modal from '../shared/Modal.vue';
import BattleDice from './BattleDice.vue';

const store = usePompeiiStore();

const isVisible = computed(() => {
  return store.currentBattle !== null && store.currentBattle.isActive === true;
});

const roundNumber = computed(() => store.currentBattle?.roundNumber || 0);
const battleType = computed(() => store.currentBattle?.battleType || null);
const battleLog = computed(() => store.currentBattle?.battleLog || []);
const army = computed(() => store.army);
const enemyForce = computed(() => store.currentBattle?.enemyForce || []);
const wallDefenseBonus = computed(() => store.wallDefenseBonus);
const lastDiceRoll = computed(() => store.currentBattle?.lastDiceRoll || null);
const isRolling = computed(() => store.currentBattle?.isRolling || false);

const isBattleOver = computed(() => {
  if (!store.currentBattle || !store.currentBattle.isActive) return false;
  const hasAlivePlayerUnits = store.army.some((u) => u.strength > 0);
  const hasAliveEnemyUnits = store.currentBattle.enemyForce.some((u) => u.strength > 0);
  return !hasAlivePlayerUnits || !hasAliveEnemyUnits;
});

function executeRound(): void {
  store.executeBattleRound();
}

function autoResolve(): void {
  store.autoResolveBattle();
}

function endBattle(): void {
  store.endBattle();
}

function handleClose(): void {
  // Don't allow closing during active battle
  if (!isBattleOver.value) return;
  endBattle();
}

defineOptions({
  name: 'BattleVisualization',
});
</script>
