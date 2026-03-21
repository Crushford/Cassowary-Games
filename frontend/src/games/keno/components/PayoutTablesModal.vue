<template>
  <Modal :is-visible="isVisible" @close="onClose">
    <div>
      <div
        class="bg-semantic-neutral-800 text-white p-4 rounded-xl max-w-4xl mx-auto space-y-6 text-base max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        <h2 class="text-semantic-warning-400 font-bold text-xl text-center">Fair Payout Tables</h2>
        <p class="text-sm text-semantic-neutral-300 text-center">
          Complete odds and fair payouts for all selection counts (N=25 total squares, W=5 winning
          squares)
        </p>

        <div v-for="g in 5" :key="g" class="space-y-2">
          <h3 class="text-lg font-semibold text-semantic-warning-300">Selections: {{ g }}</h3>
          <table class="w-full text-sm border-collapse border border-semantic-neutral-600">
            <thead>
              <tr class="bg-semantic-neutral-700">
                <th class="text-right border-b border-r border-semantic-neutral-600 py-2 px-2">
                  matches
                </th>
                <th class="text-right border-b border-r border-semantic-neutral-600 py-2 px-2">
                  probability
                </th>
                <th class="text-right border-b border-r border-semantic-neutral-600 py-2 px-2">
                  1 in X
                </th>
                <th class="text-right border-b py-2 px-2">fair payout (to-1)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in getOddsRows(g)"
                :key="row.k"
                :class="row.k === g ? 'bg-feedback-successSoft' : ''"
              >
                <td class="text-right border-r border-semantic-neutral-600 py-1 px-2">
                  {{ row.k }}
                </td>
                <td class="text-right border-r border-semantic-neutral-600 py-1 px-2">
                  {{ formatProb(row.probability) }}
                </td>
                <td class="text-right border-r border-semantic-neutral-600 py-1 px-2">
                  {{ formatNumber(row.oneIn) }}
                </td>
                <td class="text-right py-1 px-2 font-semibold text-semantic-warning-400">
                  {{ formatNumber(row.fairPayoutTo1) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-xs text-semantic-neutral-400 text-center pt-2">
          Fair payouts are calculated as floor(1/probability) (integer, rounded down). Highlighted
          rows show perfect matches (k = selections).
        </p>
      </div>
      <button
        class="w-full mt-6 py-3 px-6 bg-semantic-warning-600 hover:bg-semantic-warning-500 text-white font-semibold rounded-lg transition-colors duration-200"
        @click="onClose"
      >
        Close
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { buildOddsRowsInteger } from '@/games/keno/lib/kenoOdds';
import Modal from '@/shared/components/Modal.vue';

interface Props {
  isVisible: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

function onClose() {
  emit('close');
}

function getOddsRows(g: number) {
  return buildOddsRowsInteger(g);
}

function formatProb(p: number): string {
  const s = p.toFixed(10);
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

function formatNumber(x: number): string {
  if (!isFinite(x)) return '∞';
  return Number.isInteger(x) ? String(x) : x.toFixed(4);
}

defineOptions({
  name: 'PayoutTablesModal',
});
</script>
