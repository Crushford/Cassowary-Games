<!-- src/components/keno/PayoutTable.vue -->
<template>
  <div v-if="rows.length">
    <div class="mb-2 text-sm">
      Selections: <span class="font-semibold">{{ g }}</span>
    </div>
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr>
          <th class="text-right border-b py-1">matches</th>
          <th class="text-right border-b py-1">payout</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.k">
          <td class="text-right py-1">{{ r.k }}</td>
          <td class="text-right py-1 font-semibold text-yellow-400">
            {{ formatNumber(r.fairPayoutTo1) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="text-sm text-gray-500">Select at least one square to see payouts.</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useKenoStore } from '../../stores/kenoStore';

const store = useKenoStore();
const rows = computed(() => store.oddsRowsForCurrentSelection);
const g = computed(() => store.selectedCount);

function formatNumber(x: number): string {
  if (!isFinite(x)) return '∞';
  return Number.isInteger(x) ? String(x) : x.toFixed(4);
}
</script>

<style scoped>
table th,
table td {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}
</style>
