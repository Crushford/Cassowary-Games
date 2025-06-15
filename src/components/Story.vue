<template>
  <div class="h-[33vh] w-full bg-black/90 border-b border-gray-700 flex-shrink-0 flex flex-col">
    <!-- Top Row: Questions (left) and Character (right) -->
    <div class="flex flex-1 items-center px-2 pt-2 pb-1">
      <!-- Thought Bubble Questions -->
      <div class="flex flex-col space-y-2 w-2/3 max-w-[70vw]">
        <button
          v-for="topic in dialogueStore.availableTopics"
          :key="topic.id"
          @click="selectTopic(topic)"
          class="relative text-left px-4 py-2 text-white text-sm font-bold rounded-2xl border border-white bg-white/10 hover:bg-white/20 shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 thought-bubble"
        >
          {{ topic.questionText }}
        </button>
      </div>
      <!-- Character Avatar -->
      <div class="flex-1 flex flex-col items-end justify-center pr-4">
        <span class="text-5xl animate-bounce select-none">
          {{ dialogueStore.currentCharacter?.fallbackEmoji }}
        </span>
      </div>
    </div>
    <!-- Bottom Row: Animated Answer Text -->
    <DialogueBox />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDialogueStore } from '../stores/dialogueStore';
import cockatooJames from '../data/characters/cockatooJames.json';
import DialogueBox from './DialogueBox.vue';

const dialogueStore = useDialogueStore();

// Initialize dialogue when component mounts
onMounted(() => {
  dialogueStore.loadCharacter(cockatooJames);
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
.thought-bubble {
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
}
</style>
