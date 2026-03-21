<template>
  <div
    class="h-[33vh] w-full border-b border-semantic-neutral-700 flex-shrink-0 flex flex-col overflow-hidden container-[inline-size]"
    style="background-color: #3a4a1b"
  >
    <!-- Grid area: fills most of the container, leaving space for dialogue -->
    <div
      class="grid grid-cols-4 grid-rows-2 w-full gap-2 px-2 pt-2 pb-1 flex-grow"
      style="min-height: 0"
    >
      <!-- Dynamic dialogue buttons - only show available topics -->
      <button
        v-for="(topic, index) in availableTopics"
        :key="topic.id"
        :class="getDialogueButtonClass(index)"
        class="dialogue-button"
        @click="selectTopic(topic)"
      >
        {{ topic.questionText }}
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
import { onMounted, defineAsyncComponent, computed } from 'vue';
import { useDialogueStore } from '@/games/queens/stores/dialogueStore';
import macca from '@/games/queens/data/characters/macca.json';

const DialogueBox = defineAsyncComponent(() => import('./DialogueBox.vue'));

const dialogueStore = useDialogueStore();

// Computed property to get available topics based on prerequisites
const availableTopics = computed(() => {
  if (!dialogueStore.currentCharacter) return [];

  // Get the conversation history for this character
  const characterHistory =
    dialogueStore.conversationHistory[dialogueStore.currentCharacter.id] || new Set();

  // Filter topics based on prerequisites
  const filteredTopics = dialogueStore.currentCharacter.dialogue.filter((topic) => {
    // Check if all prerequisites have been seen in this character's conversation history
    return topic.prerequisites.every((prereq) => characterHistory.has(prereq));
  });

  // Return only the first 3 available topics to maintain layout
  return filteredTopics.slice(0, 3);
});

// Initialize dialogue when component mounts
onMounted(() => {
  // Load conversation history from dialogue store
  dialogueStore.loadConversationHistory();

  // Load character (this will now use the loaded history)
  dialogueStore.loadCharacter(macca);
});

// Handle topic selection
const selectTopic = async (topic: { id: string }) => {
  await dialogueStore.selectTopic(topic.id);
};

// Helper function to determine button positioning based on index
const getDialogueButtonClass = (index: number): string => {
  switch (index) {
    case 1:
      return 'col-start-2 row-start-1';
    case 2:
      return 'col-start-2 row-start-2';
    default:
      return 'col-start-1 row-start-1';
  }
};

defineOptions({
  name: 'SharedStory',
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
