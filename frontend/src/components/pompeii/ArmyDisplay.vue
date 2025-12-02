<template>
  <div class="bg-gray-800 rounded-lg p-4">
    <h3 class="text-lg font-bold text-white mb-3">Your Army</h3>
    <div v-if="army.length === 0" class="text-gray-400 text-sm">No units recruited yet</div>
    <div v-else class="space-y-3 max-h-96 overflow-y-auto">
      <UnitCard v-for="unit in army" :key="unit.id" :unit="unit" />
      <div class="pt-2 border-t border-gray-600 text-sm text-gray-300 text-center">
        Total: {{ armyCount }} units, {{ totalArmyStrength }} strength
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import UnitCard from './UnitCard.vue';

const store = usePompeiiStore();

const army = computed(() => store.army);
const armyCount = computed(() => store.armyCount);
const totalArmyStrength = computed(() => store.totalArmyStrength);

defineOptions({
  name: 'ArmyDisplay',
});
</script>
