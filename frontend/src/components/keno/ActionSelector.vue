<template>
  <!-- ActionSelector -->
  <div class="space-y-2">
    <label class="block text-sm font-medium text-white mb-2">Select Action</label>
    <div class="grid grid-cols-3 gap-2">
      <button
        class="px-4 py-3 rounded-lg transition-colors duration-150 text-sm font-medium"
        :class="
          store.selectedAction === 'forage'
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        "
        @click="selectAction('forage')"
      >
        Forage
      </button>
      <button
        class="px-4 py-3 rounded-lg transition-colors duration-150 text-sm font-medium"
        :class="
          store.selectedAction === 'nest'
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        "
        @click="selectAction('nest')"
      >
        Nest
      </button>
      <button
        class="px-4 py-3 rounded-lg transition-colors duration-150 text-sm font-medium"
        :class="
          store.selectedAction === 'hunt'
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        "
        @click="selectAction('hunt')"
      >
        Hunt
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { useKenoStore } from '../../stores/kenoStore';

interface Props {
  store: ReturnType<typeof useKenoStore>;
}

const props = defineProps<Props>();

const selectAction = (action: 'forage' | 'nest' | 'hunt') => {
  props.store.setAction(action);
  // Clear selections when changing action
  props.store.selectedSquares.clear();
};

defineOptions({
  name: 'ActionSelector',
});
</script>
