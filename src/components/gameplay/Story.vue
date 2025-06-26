<template>
  <div
    class="h-[33vh] w-full border-b border-gray-700 flex-shrink-0 flex flex-col overflow-hidden container-[inline-size]"
    style="background-color: #3a4a1b"
  >
    <!-- Grid area: fills most of the container, leaving space for dialogue -->
    <div
      class="grid grid-cols-4 grid-rows-2 w-full gap-2 px-2 pt-2 pb-1 flex-grow"
      style="min-height: 0"
    >
      <!-- Q1 -->
      <button
        v-if="dialogueStore.availableTopics[0]"
        @click="selectTopic(dialogueStore.availableTopics[0])"
        class="dialogue-button col-start-1 row-start-1"
      >
        {{ dialogueStore.availableTopics[0].questionText }}
      </button>
      <!-- Q2 -->
      <button
        v-if="dialogueStore.availableTopics[1]"
        @click="selectTopic(dialogueStore.availableTopics[1])"
        class="dialogue-button col-start-2 row-start-1"
      >
        {{ dialogueStore.availableTopics[1].questionText }}
      </button>
      <!-- Q3 -->
      <button
        v-if="dialogueStore.availableTopics[2]"
        @click="selectTopic(dialogueStore.availableTopics[2])"
        class="dialogue-button col-start-2 row-start-2"
      >
        {{ dialogueStore.availableTopics[2].questionText }}
      </button>
      <!-- Player -->
      <div class="col-start-1 row-start-2 flex items-end justify-start pl-2 h-full">
        <img
          src="/assets/characters/player1.png"
          alt="Player Character"
          class="w-full h-full object-contain select-none"
        />
      </div>
      <!-- Character Avatar (spans 2 cols, 2 rows) -->
      <div class="col-start-3 col-end-5 row-start-1 row-end-3 flex items-end justify-center">
        <img
          v-if="dialogueStore.currentCharacter?.portraitUrl"
          :src="dialogueStore.currentCharacter.portraitUrl"
          alt="Character Portrait"
          class="w-11/12 h-full object-contain animate-bounce-slow select-none"
        />
        <span v-else class="text-5xl animate-bounce-slow select-none">
          {{ dialogueStore.currentCharacter?.fallbackEmoji }}
        </span>
      </div>
    </div>
    <!-- DialogueBox: takes remaining space -->
    <DialogueBox class="w-full flex-shrink-0" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue';
import { useDialogueStore } from '../../stores/dialogueStore';
import macca from '../../data/characters/macca.json';

const DialogueBox = defineAsyncComponent(() => import('./DialogueBox.vue'));

const dialogueStore = useDialogueStore();

// Initialize dialogue when component mounts
onMounted(() => {
  dialogueStore.loadCharacter(macca);
});

// Handle topic selection
const selectTopic = (topic: { id: string }) => {
  dialogueStore.selectTopic(topic.id);
};

defineOptions({
  name: 'Story',
});
</script>

<style scoped>
@keyframes bounce-slow {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}
.animate-bounce-slow {
  animation: bounce-slow 5s infinite;
}

.dialogue-button {
  @apply text-left px-2 py-1 font-bold rounded-xl border border-white bg-white/10 hover:bg-white/20 shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 whitespace-normal text-white overflow-hidden;
  font-size: clamp(0.6rem, 3cqw, 1rem);
}
</style>
