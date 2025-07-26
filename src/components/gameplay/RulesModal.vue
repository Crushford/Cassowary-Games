<template>
  <Modal :is-visible="isVisible">
    <div>
      <h2 class="text-2xl font-bold text-amber-400 mb-4">How to Play</h2>
      <div class="text-white space-y-3 text-sm">
        <p>Welcome to Honey Pot Ant Farming!</p>
        <p>
          In front of you, you can see a Honey Pot Ant Farm. Each color group represents a different
          Honey Pot Ant nest.
        </p>
        <p>
          Each nest has a special section where they keep their honey - that's what we're looking
          for!
        </p>
        <p>
          Your goal is to find the honey pots (🍯) by strategically placing flags (🚧) and digging
          in the right spots.
        </p>
        <p>
          Be careful though - if you dig in the wrong place, you might get bitten by an ant (🐜)!
        </p>
      </div>
      <button
        @click="onClose"
        class="w-full mt-6 py-3 px-6 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
      >
        Got it!
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore';
import Modal from './Modal.vue';

const gameStore = useGameStore();

defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const onClose = () => {
  gameStore.markRulesAsSeen();
  emit('close');
};
</script>

<script lang="ts">
export default {
  name: 'RulesModal',
};
</script>
