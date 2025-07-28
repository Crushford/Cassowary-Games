<template>
  <Modal :is-visible="props.store.showGameRules">
    <div>
      <div class="bg-purple-900 text-white p-4 rounded-xl max-w-md mx-auto space-y-2 text-base">
        <h2 class="text-green-400 font-bold text-xl">How to Plant</h2>

        <div class="space-y-1">
          <p>Your goal: Create a valid honey pot ant farm puzzle.</p>
          <p>Place honey pots and color cards to build a solvable puzzle.</p>
        </div>

        <div class="bg-purple-800 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Step 1: Place Honey Pots</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>🍯 Place exactly {{ props.store.gridSize }} honey pots on the grid</li>
            <li>🍯 One honey pot per row</li>
            <li>🍯 One honey pot per column</li>
            <li>🚫 No diagonal touching between honey pots</li>
          </ul>
        </div>

        <div class="bg-purple-800 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Step 2: Place Color Cards</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>🎨 Assign a unique color to each honey pot</li>
            <li>🎨 Place color cards around the grid to create color groups</li>
            <li>🎨 Each color group should contain exactly one honey pot</li>
            <li>🎨 Create a puzzle that has only one solution</li>
          </ul>
        </div>

        <div class="bg-purple-800 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Controls:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Select a honey pot card or color card from the toolbar</li>
            <li>Click on a grid square to place your selection</li>
            <li>Use the Undo button to remove your last placement</li>
            <li>Use the Reset button to start over</li>
          </ul>
        </div>

        <p class="text-yellow-300 font-medium">
          💡 Tip: The ants (🐜) show you where honey pots cannot be placed due to the rules!
        </p>
      </div>
      <button
        @click="onClose"
        class="w-full mt-6 py-3 px-6 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
      >
        Got it!
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '../shared/Modal.vue';

interface Props {
  store: {
    showGameRules: boolean;
    closeRulesModal: () => void;
    gridSize: number;
  };
}

const props = defineProps<Props>();

const onClose = () => {
  props.store.closeRulesModal();
};
</script>

<script lang="ts">
export default {
  name: 'PlantRulesModal',
};
</script>
