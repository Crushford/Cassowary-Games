<template>
  <div v-if="diceRoll" class="flex items-center justify-center gap-8 py-4">
    <!-- Player Dice -->
    <div
      :class="[
        'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
        getDiceClass(diceRoll.winner, 'player'),
      ]"
    >
      <div class="text-sm text-semantic-neutral-400 mb-1">Player</div>
      <div :class="['text-2xl font-bold mb-2', getDieColorClass(diceRoll.playerDieSize)]">
        d{{ diceRoll.playerDieSize }}
      </div>
      <div
        v-if="!isRolling"
        :class="[
          'text-4xl font-bold',
          diceRoll.winner === 'player' ? 'text-semantic-success-400' : 'text-white',
        ]"
      >
        {{ diceRoll.playerBaseRoll }}
      </div>
      <div v-else class="text-4xl font-bold text-semantic-neutral-500 animate-pulse">?</div>
      <div
        v-if="diceRoll.playerBonus > 0 && !isRolling"
        class="text-sm text-semantic-warning-400 mt-1"
      >
        +{{ diceRoll.playerBonus }} wall
      </div>
      <div
        v-if="!isRolling"
        class="text-lg font-semibold mt-2"
        :class="
          diceRoll.winner === 'player' ? 'text-semantic-success-400' : 'text-semantic-neutral-400'
        "
      >
        Total: {{ diceRoll.playerRoll }}
      </div>
    </div>

    <!-- VS -->
    <div class="text-2xl font-bold text-semantic-neutral-500">VS</div>

    <!-- Enemy Dice -->
    <div
      :class="[
        'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
        getDiceClass(diceRoll.winner, 'enemy'),
      ]"
    >
      <div class="text-sm text-semantic-neutral-400 mb-1">Enemy</div>
      <div :class="['text-2xl font-bold mb-2', getDieColorClass(diceRoll.enemyDieSize)]">
        d{{ diceRoll.enemyDieSize }}
      </div>
      <div
        v-if="!isRolling"
        :class="[
          'text-4xl font-bold',
          diceRoll.winner === 'enemy' ? 'text-semantic-danger-400' : 'text-white',
        ]"
      >
        {{ diceRoll.enemyRoll }}
      </div>
      <div v-else class="text-4xl font-bold text-semantic-neutral-500 animate-pulse">?</div>
      <div
        v-if="!isRolling"
        class="text-lg font-semibold mt-2"
        :class="
          diceRoll.winner === 'enemy' ? 'text-semantic-danger-400' : 'text-semantic-neutral-400'
        "
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
    return 'border-semantic-neutral-600 bg-semantic-neutral-800';
  }
  if (winner === 'tie') {
    return 'border-semantic-neutral-500 bg-semantic-neutral-800';
  }
  if (winner === side) {
    return side === 'player'
      ? 'border-semantic-success-500 bg-feedback-successSubtle'
      : 'border-semantic-danger-500 bg-feedback-dangerSubtle';
  }
  return 'border-semantic-neutral-600 bg-semantic-neutral-800';
}

function getDieColorClass(dieSize: number): string {
  const colorMap: Record<number, string> = {
    4: 'text-semantic-neutral-400',
    6: 'text-semantic-info-400',
    8: 'text-semantic-success-400',
    10: 'text-semantic-info-400',
    12: 'text-semantic-warning-400',
  };
  return colorMap[dieSize] || 'text-semantic-neutral-400';
}

defineOptions({
  name: 'BattleDice',
});
</script>
