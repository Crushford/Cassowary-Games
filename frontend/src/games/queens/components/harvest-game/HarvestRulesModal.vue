<template>
  <Modal :is-visible="props.store.showGameRules">
    <div>
      <div
        class="bg-semantic-info-900 text-white p-4 rounded-xl max-w-md mx-auto space-y-2 text-base"
      >
        <h2 class="text-semantic-warning-400 font-bold text-xl">How to Play</h2>

        <div class="space-y-1">
          <p>Your goal: Find the hidden honey pots (🍯).</p>
          <p>Each color group hides exactly <strong>one</strong> honey pot.</p>
        </div>

        <div class="bg-semantic-info-800 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Key Rules:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>🍯 One honey pot per color group</li>
            <li>🍯 One per column</li>
            <li>🍯 One per row</li>
            <li>🚫 No diagonal touching</li>
          </ul>
        </div>

        <div class="bg-semantic-info-800 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">How to Win:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>
              Use <strong>flags</strong> (🚧) to mark squares where you know there is no honey
            </li>
            <li>Once only one space remains, <strong>dig</strong> (⛏️) there</li>
          </ul>
        </div>

        <div class="bg-semantic-info-800 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Controls:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Tap once to place a flag (🚧), tap again to dig (⛏️)</li>
            <li>Once only one space remains, <strong>dig</strong> (⛏️) there</li>
          </ul>
        </div>

        <p class="text-semantic-danger-300 font-medium">
          ⚠️ Dig wrong and you’ll get bitten by an ant (🐜). Three bites = pass out!
        </p>
      </div>
      <button
        class="w-full mt-6 py-3 px-6 bg-semantic-warning-500 hover:bg-semantic-warning-400 text-semantic-neutral-900 font-semibold rounded-lg transition-colors duration-200"
        @click="onClose"
      >
        Got it!
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import Modal from '@/shared/components/Modal.vue';
import { trackRulesOpened } from '@/shared/utils/analyticsEvents';

interface Props {
  store: {
    showGameRules: boolean;
    closeRulesModal: () => void;
  };
}

const props = defineProps<Props>();

watch(
  () => props.store.showGameRules,
  (isVisible) => {
    if (!isVisible) {
      return;
    }

    trackRulesOpened({
      game_name: 'harvest',
      game_mode: 'campaign',
    });
  }
);

const onClose = () => {
  props.store.closeRulesModal();
};
</script>

<script lang="ts">
export default {
  name: 'HarvestRulesModal',
};
</script>
