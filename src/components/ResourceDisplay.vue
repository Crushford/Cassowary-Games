<!-- src/components/ResourceDisplay.vue -->
<template>
  <div class="resource-display">
    <div class="resource queen">
      <div class="icon">👑</div>
      <div class="value">{{ resources.queens }}</div>
    </div>
    <div class="resource gold">
      <div class="icon">💰</div>
      <div class="value">{{ resources.gold }}</div>
    </div>
    <div class="resource acres">
      <div class="icon">🌱</div>
      <div class="value">{{ resources.acres }}/{{ totalAcres }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { StateManager, GameResources } from '../state/StateManager';
import { GAME_CONSTANTS } from '../config/constants';

export default defineComponent({
  name: 'ResourceDisplay',
  setup() {
    const stateManager = StateManager.getInstance();
    const resources = ref<GameResources>({
      queens: GAME_CONSTANTS.INITIAL_QUEENS,
      gold: GAME_CONSTANTS.INITIAL_GOLD,
      acres: GAME_CONSTANTS.OWNED_ACRES,
      plots: GAME_CONSTANTS.PLOTS,
    });
    const totalAcres = GAME_CONSTANTS.TOTAL_ACRES;

    // Update resources when they change
    const onResourcesUpdated = (newResources: GameResources) => {
      resources.value = { ...newResources };
    };

    onMounted(() => {
      stateManager.events.on('resources-updated', onResourcesUpdated);
      // Initialize with current state
      resources.value = stateManager.getState().resources;
    });

    onUnmounted(() => {
      stateManager.events.off('resources-updated', onResourcesUpdated);
    });

    return {
      resources,
      totalAcres,
    };
  },
});
</script>

<style scoped>
.resource-display {
  display: flex;
  justify-content: space-around;
  padding: 10px;
  background-color: #ffffff;
  border: 1px solid #000000;
  border-radius: 4px;
  margin-bottom: 16px;
}

.resource {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.value {
  font-weight: bold;
  font-size: 1.1rem;
}
</style>
