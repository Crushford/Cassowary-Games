<template>
  <div class="h-svh w-full max-w-[480px] mx-auto bg-gray-800 text-white flex flex-col overflow-hidden">
    <div class="flex flex-col items-center justify-center h-full p-8">
      <!-- Menu state -->
      <div v-if="!evolveStore.isGameActive" class="space-y-4 w-full max-w-md">
        <h1 class="text-3xl font-bold text-center mb-8">Evolve</h1>

        <BaseButton @click="onNewGameClick" class="w-full">
          New Game
        </BaseButton>

        <BaseButton
          v-if="evolveStore.hasSavedGame"
          @click="onContinueClick"
          class="w-full"
        >
          Continue
        </BaseButton>
      </div>

      <!-- Game state -->
      <div v-else class="w-full max-w-lg space-y-4">
        <!-- simple header -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Generation {{ evolveStore.generation }}</h2>
          <BaseButton @click="onExitToMenu">
            Exit
          </BaseButton>
        </div>

        <!-- matriarch panel -->
        <div class="p-4 rounded-lg border border-gray-700 bg-gray-900">
          <p class="font-medium mb-2">Matriarch</p>
          <p class="text-sm text-gray-400">
            Size: {{ evolveStore.matriarch.size }},
            Speed: {{ evolveStore.matriarch.speed }},
            Fertility: {{ evolveStore.matriarch.fertility }}
          </p>
        </div>

        <!-- resources panel -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-lg border border-gray-700 bg-gray-900">
            <p class="font-medium mb-2">Fruit</p>
            <p class="text-2xl">{{ evolveStore.fruit }}</p>
          </div>
          <div class="p-4 rounded-lg border border-gray-700 bg-gray-900">
            <p class="font-medium mb-2">Evolution Points</p>
            <p class="text-2xl">{{ evolveStore.evolutionPoints }}</p>
          </div>
        </div>

        <!-- actions -->
        <div class="space-y-2">
          <BaseButton class="w-full" @click="evolveStore.gainFruit()">
            Forage for fruit
          </BaseButton>
          <BaseButton class="w-full" @click="evolveStore.advanceGeneration()">
            Advance generation
          </BaseButton>
        </div>
      </div>

      <!-- confirm overwrite modal -->
      <Modal :is-visible="showOverwriteModal" @close="showOverwriteModal = false">
        <div>
          <h3 class="text-xl font-semibold text-white mb-4">Start New Game?</h3>
          <p class="mb-4 text-gray-300">
            Starting a new game will overwrite your existing evolve save.
          </p>
          <div class="flex justify-end gap-2">
            <BaseButton @click="showOverwriteModal = false">
              Cancel
            </BaseButton>
            <BaseButton @click="confirmNewGame">
              Overwrite and start
            </BaseButton>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEvolveStore } from '@/stores/evolve';
import BaseButton from '@/components/level-builder/BaseButton.vue';
import Modal from '@/components/shared/Modal.vue';

const evolveStore = useEvolveStore();
const showOverwriteModal = ref(false);

onMounted(() => {
  evolveStore.loadFromStorage();
});

const onNewGameClick = () => {
  if (evolveStore.hasSavedGame) {
    showOverwriteModal.value = true;
  } else {
    evolveStore.newGame();
  }
};

const confirmNewGame = () => {
  showOverwriteModal.value = false;
  evolveStore.newGame();
};

const onContinueClick = () => {
  evolveStore.continueGame();
};

const onExitToMenu = () => {
  evolveStore.endGame();
};
</script>

