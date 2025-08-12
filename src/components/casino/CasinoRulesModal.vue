<template>
  <Modal :is-visible="globalStore.ui.showRules">
    <div>
      <div class="bg-gray-800 text-white p-4 rounded-xl max-w-md mx-auto space-y-2 text-base">
        <h2 class="text-yellow-400 font-bold text-xl">How this table works</h2>

        <div class="space-y-1">
          <p>Start with 20 gold.</p>
          <p>Flip honeypots to earn +1 gold each.</p>
          <p>Flip ants to lose 5 gold each.</p>
          <p>The puzzle logic matches the Harvest (Queens) rules.</p>
          <p>The round ends when you solve the puzzle or when you run out of gold.</p>
        </div>

        <div class="bg-gray-700 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Key Rules:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>💰 One honeypot per color group</li>
            <li>💰 One per column</li>
            <li>💰 One per row</li>
            <li>🚫 No diagonal touching</li>
          </ul>
        </div>

        <div class="bg-gray-700 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">How to Win:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>
              Use <strong>flags</strong> (🚧) to mark squares where you know there is no honeypot
            </li>
            <li>Once only one space remains, <strong>dig</strong> (⛏️) there</li>
          </ul>
        </div>

        <div class="bg-gray-700 p-4 rounded-lg space-y-1">
          <h3 class="font-semibold text-white">Controls:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Tap once to place a flag (🚧), tap again to dig (⛏️)</li>
            <li>Once only one space remains, <strong>dig</strong> (⛏️) there</li>
          </ul>
        </div>

        <p class="text-red-300 font-medium">
          ⚠️ Dig wrong and you'll lose 5 gold. Run out of gold and you're busted!
        </p>
      </div>
      <button
        @click="onClose"
        class="w-full mt-6 py-3 px-6 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors duration-200"
      >
        Got it!
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { useGlobalStore } from '../../stores/global';
import Modal from '../shared/Modal.vue';

const globalStore = useGlobalStore();

const onClose = () => {
  globalStore.setShowRules(false);
};

defineOptions({
  name: 'CasinoRulesModal',
});
</script>
