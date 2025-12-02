<template>
  <div v-if="diceRoll" class="flex items-center justify-center gap-8 py-4">
    <!-- Player Dice -->
    <div
      :class="[
        'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
        getDiceClass(diceRoll.winner, 'player'),
      ]"
    >
      <div class="text-sm text-gray-400 mb-1">Player</div>
      <div :class="['text-2xl font-bold mb-2', getDieColorClass(diceRoll.playerDieSize)]">
        d{{ diceRoll.playerDieSize }}
      </div>
      <div
        v-if="!isRolling"
        :class="[
          'text-4xl font-bold',
          diceRoll.winner === 'player' ? 'text-green-400' : 'text-white',
        ]"
      >
        {{ diceRoll.playerBaseRoll }}
      </div>
      <div v-else class="text-4xl font-bold text-gray-500 animate-pulse">?</div>
      <div v-if="diceRoll.playerBonus > 0 && !isRolling" class="text-sm text-yellow-400 mt-1">
        +{{ diceRoll.playerBonus }} wall
      </div>
      <div
        v-if="!isRolling"
        class="text-lg font-semibold mt-2"
        :class="diceRoll.winner === 'player' ? 'text-green-400' : 'text-gray-400'"
      >
        Total: {{ diceRoll.playerRoll }}
      </div>
    </div>

    <!-- VS -->
    <div class="text-2xl font-bold text-gray-500">VS</div>

    <!-- Enemy Dice -->
    <div
      :class="[
        'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
        getDiceClass(diceRoll.winner, 'enemy'),
      ]"
    >
      <div class="text-sm text-gray-400 mb-1">Enemy</div>
      <div :class="['text-2xl font-bold mb-2', getDieColorClass(diceRoll.enemyDieSize)]">
        d{{ diceRoll.enemyDieSize }}
      </div>
      <div
        v-if="!isRolling"
        :class="['text-4xl font-bold', diceRoll.winner === 'enemy' ? 'text-red-400' : 'text-white']"
      >
        {{ diceRoll.enemyRoll }}
      </div>
      <div v-else class="text-4xl font-bold text-gray-500 animate-pulse">?</div>
      <div
        v-if="!isRolling"
        class="text-lg font-semibold mt-2"
        :class="diceRoll.winner === 'enemy' ? 'text-red-400' : 'text-gray-400'"
      >
        Total: {{ diceRoll.enemyRoll }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DiceRoll } from '../../stores/pompeiiStore';

const props = defineProps<{
  diceRoll: DiceRoll | null;
  isRolling: boolean;
}>();

function getDiceClass(winner: 'player' | 'enemy' | 'tie', side: 'player' | 'enemy'): string {
  if (props.isRolling) {
    return 'border-gray-600 bg-gray-800';
  }
  if (winner === 'tie') {
    return 'border-gray-500 bg-gray-800';
  }
  if (winner === side) {
    return side === 'player' ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20';
  }
  return 'border-gray-600 bg-gray-800';
}

function getDieColorClass(dieSize: number): string {
  const colorMap: Record<number, string> = {
    4: 'text-gray-400',
    6: 'text-blue-400',
    8: 'text-green-400',
    10: 'text-purple-400',
    12: 'text-yellow-400',
  };
  return colorMap[dieSize] || 'text-gray-400';
}

defineOptions({
  name: 'BattleDice',
});
</script>
