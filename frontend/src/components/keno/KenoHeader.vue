<template>
  <!-- KenoHeader -->
  <div class="space-y-1 mb-3 max-w-md">
    <!-- summary row -->
    <div class="flex items-center justify-between text-sm">
      <div>
        Turn <span class="font-semibold">{{ turn }}/5</span>
      </div>
      <div>
        Coins <span class="font-semibold" aria-live="polite">{{ coins }}</span>
      </div>
      <div>
        Selected <span class="font-semibold">{{ g }}/5</span>
      </div>
    </div>

    <!-- payout chips row -->
    <div class="grid grid-cols-5 gap-2 h-10">
      <PayoutChip v-for="k in 5" :key="k" :k="k" :payout="payoutRow[k - 1]" :disabled="k > g" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useKenoStore } from '../../stores/kenoStore';
import { buildIntegerPayoutRowOfFive } from '../../lib/kenoOdds';
import PayoutChip from './PayoutChip.vue';

const store = useKenoStore();
const turn = computed(() => store.currentTurn);
const coins = computed(() => store.coins);
const g = computed(() => store.selectedSquares.size);

const payoutRow = computed(() => {
  const count = g.value;
  return count === 0 ? [0, 0, 0, 0, 0] : buildIntegerPayoutRowOfFive(count);
});
</script>
