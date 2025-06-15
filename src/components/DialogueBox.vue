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
          {{ dialogueStore.currentCharacter?.fallbackEmoji || '🦜' }}
        </span>
      </div>
    </div>
    <!-- Bottom Row: Animated Answer Text -->
    <div class="relative w-full px-4 pb-2">
      <div class="relative overflow-hidden h-[3.5em]" style="line-height: 1.2em">
        <!-- Fade overlay (top) -->
        <div
          class="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-black/90 to-transparent pointer-events-none z-10"
        ></div>
        <!-- Fade overlay (bottom) -->
        <div
          class="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10"
        ></div>
        <!-- Animated text -->
        <div
          class="text-white text-base leading-tight typewriter-text"
          :style="{ transform: `translateY(-${scrollOffset}px)` }"
        >
          <span v-if="dialogueStore.currentTopic">
            {{ displayedText }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed, nextTick } from 'vue';
import { useDialogueStore } from '../stores/dialogueStore';
import cockatooJames from '../data/characters/cockatooJames.json';

const dialogueStore = useDialogueStore();
const displayedText = ref('');
const typewriterSpeed = 30; // ms per character
let typewriterInterval: number | null = null;
const scrollOffset = ref(0);

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

// Typewriter effect with scroll
const startTypewriter = async () => {
  if (!dialogueStore.currentTopic) return;
  if (typewriterInterval) clearInterval(typewriterInterval);
  dialogueStore.setAnimating(true);
  displayedText.value = '';
  scrollOffset.value = 0;
  const text = dialogueStore.currentTopic.answerText;
  let currentIndex = 0;

  typewriterInterval = window.setInterval(async () => {
    if (currentIndex < text.length) {
      displayedText.value = text.slice(0, currentIndex + 1);
      currentIndex++;
      await nextTick();
      updateScroll();
    } else {
      if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
      }
      dialogueStore.setAnimating(false);
    }
  }, typewriterSpeed);
};

// Calculate scroll offset for answer text
function updateScroll() {
  const el = document.querySelector('.typewriter-text');
  if (el) {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const maxLines = 3;
    const totalHeight = el.scrollHeight;
    const visibleHeight = lineHeight * maxLines;
    scrollOffset.value = Math.max(0, totalHeight - visibleHeight);
  }
}

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
.thought-bubble {
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
}
.typewriter-text {
  transition: transform 0.2s linear;
  min-height: 3.5em;
  max-height: 6em;
  overflow: hidden;
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
