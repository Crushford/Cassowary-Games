<template>
  <div class="min-h-screen bg-semantic-neutral-900 text-white p-8 relative">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">Cassowary Games</h1>

      <!-- Games Section -->
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-semantic-info-300">Choose a Game</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <router-link
            to="/queens"
            class="block p-6 bg-semantic-danger-600 hover:bg-semantic-danger-700 rounded-lg transition-colors"
          >
            <h3 class="text-xl font-bold mb-2">Queens Game</h3>
            <p>A clone of the game Queens</p>
          </router-link>

          <router-link
            to="/levels"
            class="block p-6 bg-semantic-warning-600 hover:bg-semantic-warning-700 rounded-lg transition-colors"
          >
            <h3 class="text-xl font-bold mb-2">Honey Pot Ant Farming</h3>
            <p>A honey pot ant farming skin on the queens game</p>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Works in Progress Button - Bottom Left -->
    <div class="fixed bottom-0 left-0 p-4">
      <button
        class="inline-flex items-center justify-center px-6 py-3 bg-semantic-warning-500 text-white border-none rounded-lg font-medium cursor-pointer transition-all hover:bg-semantic-warning-600 hover:-translate-y-0.5 active:translate-y-0"
        @click="showWorksInProgressModal = true"
      >
        Works in Progress
      </button>
    </div>

    <!-- Privacy Settings Link - Bottom Right -->
    <div class="fixed bottom-0 right-0 p-4">
      <button
        class="text-sm text-semantic-neutral-400 hover:text-semantic-neutral-300 underline transition-colors"
        @click="showPrivacySettings = true"
      >
        Privacy Settings
      </button>
    </div>

    <!-- Privacy Settings Modal -->
    <PrivacySettingsModal :is-visible="showPrivacySettings" @close="showPrivacySettings = false" />

    <!-- Works in Progress Modal -->
    <Modal :is-visible="showWorksInProgressModal" @close="showWorksInProgressModal = false">
      <div>
        <h3 class="text-2xl font-semibold text-white mb-4">Works in Progress</h3>
        <p class="text-semantic-neutral-300 mb-4 text-sm">
          These games are just here for testing and are not ready to be played.
        </p>
        <div class="space-y-3">
          <router-link
            to="/depth"
            class="block p-4 bg-semantic-info-700 hover:bg-semantic-info-600 rounded-lg transition-colors"
            @click="showWorksInProgressModal = false"
          >
            <h4 class="text-lg font-bold mb-1">Depth</h4>
            <p class="text-sm text-semantic-neutral-200">A probability and betting card game</p>
          </router-link>

          <router-link
            to="/evolve"
            class="block p-4 bg-semantic-success-600 hover:bg-semantic-success-700 rounded-lg transition-colors"
            @click="showWorksInProgressModal = false"
          >
            <h4 class="text-lg font-bold mb-1">Evolve</h4>
            <p v-if="hasEvolveProgress" class="text-sm text-semantic-neutral-200">
              Generation {{ evolveStore.generation }} • {{ evolveStore.fruit }} fruit
            </p>
            <p v-else class="text-sm text-semantic-neutral-200">Start a new game</p>
          </router-link>

          <router-link
            to="/keno"
            class="block p-4 bg-semantic-info-600 hover:bg-semantic-info-700 rounded-lg transition-colors"
            @click="showWorksInProgressModal = false"
          >
            <h4 class="text-lg font-bold mb-1">Keno</h4>
            <p class="text-sm text-semantic-neutral-200">Play the Keno game</p>
          </router-link>

          <router-link
            to="/pompeii"
            class="block p-4 bg-semantic-danger-600 hover:bg-semantic-danger-700 rounded-lg transition-colors"
            @click="showWorksInProgressModal = false"
          >
            <h4 class="text-lg font-bold mb-1">Pompeii</h4>
            <p class="text-sm text-semantic-neutral-200">City building and defense game</p>
          </router-link>

          <router-link
            to="/mining"
            class="block p-4 bg-semantic-warning-700 hover:bg-semantic-warning-600 rounded-lg transition-colors"
            @click="showWorksInProgressModal = false"
          >
            <h4 class="text-lg font-bold mb-1">Gold Mining</h4>
            <p class="text-sm text-semantic-neutral-200">
              Mine a 5x5 claim and process rock for gold
            </p>
          </router-link>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEvolveStore } from '@/games/evolve/stores/evolve';
import Modal from '@/shared/components/Modal.vue';
import PrivacySettingsModal from '@/shared/components/PrivacySettingsModal.vue';

const evolveStore = useEvolveStore();
const showWorksInProgressModal = ref(false);
const showPrivacySettings = ref(false);

// Check if evolve has progress
const hasEvolveProgress = computed(() => {
  return evolveStore.hasSavedGame;
});

onMounted(() => {
  evolveStore.loadFromStorage();
});

defineOptions({
  name: 'HomeView',
});
</script>
