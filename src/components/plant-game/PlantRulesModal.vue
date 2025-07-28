<template>
  <Modal :is-visible="plantStore.showGameRules">
    <div class="bg-purple-900 text-white p-4 rounded-xl max-w-md mx-auto space-y-2 text-base">
      <h2 class="text-green-400 font-bold text-xl">How to Plant</h2>

      <div class="space-y-1">
        <p>Your goal: Create a valid honey pot ant farm puzzle.</p>
        <p>Choose nest locations, assign colors, and test your puzzle for solvability.</p>
      </div>

      <div class="bg-purple-800 p-4 rounded-lg space-y-1">
        <h3 class="font-semibold text-white">Step 1: Place Honey Pots</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>🍯 Place exactly {{ plantStore.gridSize }} honey pots on the grid</li>
          <li>🍯 One honey pot per row</li>
          <li>🍯 One honey pot per column</li>
          <li>🚫 Honey pots must not touch diagonally</li>
          <li>🔥 If two nests are too close, they destroy each other — so space them out!</li>
        </ul>
      </div>

      <div class="bg-purple-800 p-4 rounded-lg space-y-1">
        <h3 class="font-semibold text-white">Step 2: Color the Nests</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>🎨 Each honey pot belongs to a nest with a unique grass color</li>
          <li>🎨 Place color tiles to create color groups on the grid</li>
          <li>🎨 Each color group must contain exactly one honey pot</li>
          <li>🎨 Use this system to guide players toward solving your puzzle</li>
        </ul>
      </div>

      <!-- <div class="bg-purple-800 p-4 rounded-lg space-y-1">
        <h3 class="font-semibold text-white">Step 3: Test Your Puzzle</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>🧠 The game will check if your setup is solvable</li>
          <li>
            ✅ A puzzle is valid when there is exactly one honey pot per row, column, and color
            group
          </li>
          <li>🧪 Use the Test button to verify it's a fair and playable challenge</li>
          <li>🏁 When it passes the test, your puzzle is complete!</li>
        </ul>
      </div>

      <div class="bg-purple-800 p-4 rounded-lg space-y-1">
        <h3 class="font-semibold text-white">Controls:</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>Select a honey pot or color tile from the toolbar</li>
          <li>Click a square on the grid to place your item</li>
          <li>Use Undo to remove your last move</li>
          <li>Use Reset to clear the board and start again</li>
          <li>Use Test to validate your puzzle when you're done</li>
        </ul>
      </div> -->
    </div>
    <button
      @click="onClose"
      class="w-full mt-6 py-3 px-6 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
    >
      Got it!
    </button>
  </Modal>
</template>

<script setup lang="ts">
import { usePlantStore } from '../../stores/plantStore';
import Modal from '../shared/Modal.vue';

const plantStore = usePlantStore();

const onClose = () => {
  plantStore.closeRulesModal();
};
</script>

<script lang="ts">
export default {
  name: 'PlantRulesModal',
};
</script>
