<template>
  <div
    ref="textContainer"
    class="relative overflow-y-auto h-[2.5em] pr-1"
    style="line-height: 1.2em"
    @scroll="handleScroll"
  >
    <!-- Animated text -->
    <Transition name="fade-slide" mode="out-in">
      <div
        v-if="dialogueStore.currentTopic"
        :key="dialogueStore.currentTopic.id"
        class="text-white text-base leading-tight typewriter-text"
      >
        {{ displayedText }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useDialogueStore } from '../../stores/dialogueStore';

const dialogueStore = useDialogueStore();
const displayedText = ref('');
const textContainer = ref<HTMLElement | null>(null);
const isAutoScrolling = ref(true);
const lastScrollTop = ref(0);
let typewriterInterval: number | null = null;

// Watch for topic changes
watch(
  () => dialogueStore.currentTopic,
  (newTopic) => {
    if (newTopic) {
      isAutoScrolling.value = true;
      if (textContainer.value) {
        textContainer.value.scrollTop = 0;
      }

      startTypewriter();
    }
  }
);

// Handle scroll events
const handleScroll = () => {
  if (!textContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = textContainer.value;
  const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

  // Only disable auto-scroll if user manually scrolls up
  if (scrollTop < lastScrollTop.value && !isAtBottom) {
    isAutoScrolling.value = false;
  } else if (isAtBottom) {
    isAutoScrolling.value = true;
  }
  lastScrollTop.value = scrollTop;
};

// Scroll to bottom if auto-scrolling is enabled
const scrollToBottom = () => {
  if (!textContainer.value || !isAutoScrolling.value) return;
  requestAnimationFrame(() => {
    if (textContainer.value) {
      textContainer.value.scrollTop = textContainer.value.scrollHeight;
    }
  });
};

// Typewriter effect
const startTypewriter = () => {
  if (!dialogueStore.currentTopic) return;
  if (typewriterInterval) clearInterval(typewriterInterval);

  dialogueStore.setAnimating(true);
  displayedText.value = '';
  const text = dialogueStore.currentTopic.answerText;
  let currentIndex = 0;

  typewriterInterval = window.setInterval(() => {
    if (currentIndex < text.length) {
      displayedText.value = text.slice(0, currentIndex + 1);
      currentIndex++;
      scrollToBottom();
    } else {
      if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
      }
      dialogueStore.setAnimating(false);
    }
  }, 30);
};

// Cleanup
onUnmounted(() => {
  if (typewriterInterval) clearInterval(typewriterInterval);
});

defineOptions({
  name: 'DialogueBox',
});
</script>

<style scoped>
.typewriter-text {
  min-height: 3.5em;
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(0.5em);
}

.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
</style>
