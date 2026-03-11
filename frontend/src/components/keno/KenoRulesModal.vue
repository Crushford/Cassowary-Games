<template>
  <Modal :is-visible="isVisible" @close="onClose">
    <div>
      <div class="bg-gray-800 text-white p-4 rounded-xl max-w-md mx-auto space-y-2 text-base">
        <h2 class="text-yellow-400 font-bold text-xl">How to Play Keno</h2>

        <div class="space-y-1">
          <p>Select your numbers and find the honeypot ants to earn coins!</p>
        </div>

        <div class="bg-gray-700 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">How to Play:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Select 1-5 squares by clicking on them (they will highlight green)</li>
            <li>The payout rate is shown as you select squares</li>
            <li>Click "End Turn" when ready to reveal your selections</li>
            <li>All selected squares will flip over showing honeypots or ants</li>
            <li>Earn coins for each honeypot you found based on the payout rate</li>
            <li>Click "Next Turn" to continue to the next turn</li>
          </ul>
        </div>

        <div class="bg-gray-700 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Payouts:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Payouts are fair odds rounded down to whole numbers (to-1 format)</li>
            <li>0 matches pay 0</li>
            <li>View the payout tables for exact odds and payouts</li>
          </ul>
          <p class="text-sm text-gray-300 mt-2">
            The more squares you select, the lower the payout per honeypot!
          </p>
        </div>

        <div class="bg-gray-700 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Game Rules:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>You have 5 turns to find all the honeypots</li>
            <li>You may select up to 5 squares per turn</li>
            <li>Once flipped, squares cannot be selected again</li>
            <li>Coins persist across all turns and rounds</li>
            <li>Review your results before clicking "Next Turn"</li>
          </ul>
        </div>

        <p class="text-yellow-300 font-medium">
          💡 Tip: Choosing fewer squares gives higher payouts, but is riskier!
        </p>
      </div>
      <button
        class="w-full mt-6 py-3 px-6 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors duration-200"
        @click="onClose"
      >
        Got it!
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '../shared/Modal.vue';

interface Props {
  isVisible: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const onClose = () => {
  emit('close');
};

defineOptions({
  name: 'KenoRulesModal',
});
</script>
