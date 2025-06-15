<template>
  <div class="h-1/3 w-full bg-black/90 border-b border-gray-700">
    <div class="h-full flex flex-col">
      <!-- Character Avatar and Text Container -->
      <div class="flex-1 flex items-center px-4 py-2">
        <!-- Character Avatar -->
        <div class="flex-shrink-0 mr-4">
          <span class="text-4xl animate-bounce">{{
            dialogueStore.currentCharacter?.fallbackEmoji || '🦜'
          }}</span>
        </div>

        <!-- Dialogue Text -->
        <div class="flex-1">
          <div
            class="text-white text-base leading-relaxed"
            :class="{ 'animate-pulse': dialogueStore.isAnimating }"
          >
            <span v-if="dialogueStore.currentTopic" class="typewriter">
              {{ displayedText }}
            </span>
          </div>
        </div>
      </div>

      <!-- Response Options -->
      <div class="px-4 pb-2 space-y-2">
        <button
          v-for="topic in dialogueStore.availableTopics"
          :key="topic.id"
          @click="selectTopic(topic)"
          class="w-full px-3 py-1.5 text-white text-sm font-bold text-center rounded-xl border border-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          {{ topic.questionText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useDialogueStore } from '../stores/dialogueStore';
import cockatooJames from '../data/characters/cockatooJames.json';

const dialogueStore = useDialogueStore();
const displayedText = ref('');
const typewriterSpeed = 30; // milliseconds per character
let typewriterInterval: number | null = null;

// Initialize dialogue when component mounts
onMounted(() => {
  dialogueStore.loadCharacter(cockatooJames);
  startTypewriter();
});

// Watch for changes in current topic
watch(
  () => dialogueStore.currentTopic,
  (newTopic) => {
    if (newTopic) {
      startTypewriter();
    }
  }
);

// Typewriter effect
const startTypewriter = () => {
  if (!dialogueStore.currentTopic) return;

  // Clear any existing interval
  if (typewriterInterval) {
    clearInterval(typewriterInterval);
  }

  dialogueStore.setAnimating(true);
  displayedText.value = '';
  const text = dialogueStore.currentTopic.answerText;
  let currentIndex = 0;

  typewriterInterval = window.setInterval(() => {
    if (currentIndex < text.length) {
      displayedText.value = text.slice(0, currentIndex + 1);
      currentIndex++;
    } else {
      if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
      }
      dialogueStore.setAnimating(false);
    }
  }, typewriterSpeed);
};

// Handle topic selection
const selectTopic = (topic: { id: string }) => {
  dialogueStore.selectTopic(topic.id);
};

// Clean up interval on component unmount
onUnmounted(() => {
  if (typewriterInterval) {
    clearInterval(typewriterInterval);
  }
});

defineOptions({
  name: 'DialogueBox',
});
</script>

<style scoped>
.typewriter {
  display: inline-block;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
