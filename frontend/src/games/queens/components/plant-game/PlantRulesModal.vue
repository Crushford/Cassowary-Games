<template>
  <RulesModalBase
    :is-visible="plantStore.showGameRules"
    :analytics-params="{ game_name: 'plant', game_mode: 'builder', grid_size: plantStore.gridSize }"
    @close="plantStore.closeRulesModal()"
  >
    <div
      class="bg-semantic-neutral-800 text-white p-4 rounded-xl max-w-md mx-auto space-y-2 text-base"
    >
      <h2 class="text-semantic-success-400 font-bold text-xl">How to Plant</h2>

      <div class="space-y-1">
        <p>Your goal: Create a valid honey pot ant farm puzzle.</p>
        <p>Choose nest locations, assign colors, and test your puzzle for solvability.</p>
      </div>

      <div class="bg-semantic-neutral-700 p-4 rounded-lg space-y-1">
        <h3 class="font-semibold text-white">Step 1: Place Honey Pots</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>🍯 Place exactly {{ plantStore.gridSize }} honey pots on the grid</li>
          <li>🍯 One honey pot per row</li>
          <li>🍯 One honey pot per column</li>
          <li>🚫 Honey pots must not touch diagonally</li>
          <li>🔥 If two nests are too close, they destroy each other — so space them out!</li>
        </ul>
      </div>

      <div class="bg-semantic-neutral-700 p-4 rounded-lg space-y-1">
        <h3 class="font-semibold text-white">Step 2: Color the Nests</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>🎨 Each honey pot belongs to a nest with a unique grass color</li>
          <li>🎨 Place color tiles to create color groups on the grid</li>
          <li>🎨 Each color group must contain exactly one honey pot</li>
          <li>🎨 Use this system to guide players toward solving your puzzle</li>
        </ul>
      </div>
    </div>
  </RulesModalBase>
</template>

<script setup lang="ts">
import { usePlantStore } from '../../stores/plantStore';
import RulesModalBase from '../shared/RulesModalBase.vue';

const plantStore = usePlantStore();
</script>

<script lang="ts">
export default {
  name: 'PlantRulesModal',
};
</script>
