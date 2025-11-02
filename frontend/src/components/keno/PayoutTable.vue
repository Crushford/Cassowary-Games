<!-- src/components/keno/PayoutTable.vue -->
<template>
  <div v-if="rows.length" class="w-full">
    <div class="mb-2 text-sm">
      Selections: <span class="font-semibold">{{ g }}</span>
    </div>
    <!-- Single column layout for 1-3 selections -->
    <div v-if="g <= 3" class="w-full">
      <table class="w-full text-sm border-collapse" style="min-height: 4.5rem">
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
          <!-- Empty rows to maintain fixed height -->
          <tr v-for="i in emptyRows" :key="`empty-${i}`" class="invisible">
            <td class="py-1">-</td>
            <td class="py-1">-</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Two column layout for 4-5 selections -->
    <div v-else class="w-full grid grid-cols-2 gap-4">
      <div class="w-full">
        <table class="w-full text-sm border-collapse" style="min-height: 4.5rem">
          <thead>
            <tr>
              <th class="text-right border-b py-1">matches</th>
              <th class="text-right border-b py-1">payout</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in leftColumnRows" :key="r.k">
              <td class="text-right py-1">{{ r.k }}</td>
              <td class="text-right py-1 font-semibold text-yellow-400">
                {{ formatNumber(r.fairPayoutTo1) }}
              </td>
            </tr>
            <!-- Empty rows to maintain fixed height -->
            <tr v-for="i in emptyRowsLeft" :key="`empty-left-${i}`" class="invisible">
              <td class="py-1">-</td>
              <td class="py-1">-</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="w-full">
        <table class="w-full text-sm border-collapse" style="min-height: 4.5rem">
          <thead>
            <tr>
              <th class="text-right border-b py-1">matches</th>
              <th class="text-right border-b py-1">payout</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rightColumnRows" :key="r.k">
              <td class="text-right py-1">{{ r.k }}</td>
              <td class="text-right py-1 font-semibold text-yellow-400">
                {{ formatNumber(r.fairPayoutTo1) }}
              </td>
            </tr>
            <!-- Empty rows to maintain fixed height -->
            <tr v-for="i in emptyRowsRight" :key="`empty-right-${i}`" class="invisible">
              <td class="py-1">-</td>
              <td class="py-1">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div v-else class="text-sm text-gray-500" style="min-height: 4.5rem">
    Select at least one square to see payouts.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useKenoStore } from '../../stores/kenoStore';

const store = useKenoStore();
const rows = computed(() => store.oddsRowsForCurrentSelection);
const g = computed(() => store.selectedCount);

// Split rows into columns for 4-5 selections
const leftColumnRows = computed(() => {
  if (g.value <= 3) return [];
  // For 4 selections: first 2 rows, for 5 selections: first 3 rows
  const splitPoint = g.value === 4 ? 2 : 3;
  return rows.value.slice(0, splitPoint);
});

const rightColumnRows = computed(() => {
  if (g.value <= 3) return [];
  // For 4 selections: last 2 rows, for 5 selections: last 2 rows
  const splitPoint = g.value === 4 ? 2 : 3;
  return rows.value.slice(splitPoint);
});

// Calculate empty rows needed to maintain fixed height (max 3 rows)
const emptyRows = computed(() => {
  const maxRows = 3;
  const needed = maxRows - rows.value.length;
  return needed > 0 ? needed : 0;
});

const emptyRowsLeft = computed(() => {
  const maxRows = 3;
  const needed = maxRows - leftColumnRows.value.length;
  return needed > 0 ? needed : 0;
});

const emptyRowsRight = computed(() => {
  const maxRows = 3;
  const needed = maxRows - rightColumnRows.value.length;
  return needed > 0 ? needed : 0;
});

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
