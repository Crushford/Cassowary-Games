<template>
  <div class="relative">
    <div
      ref="textContainer"
      class="relative overflow-y-auto h-[3.5em] bg-black/20"
      style="line-height: 1.4em"
    >
      <Transition name="fade-slide" mode="out-in">
        <div
          v-if="dialogueStore.currentTopic"
          :key="dialogueStore.currentTopic.id"
          class="text-white text-sm leading-relaxed typewriter-text"
        >
          {{ displayedText }}
          <span v-if="dialogueStore.isAnimating" class="animate-pulse">|</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { useDialogueStore } from '../../stores/dialogueStore';

const dialogueStore = useDialogueStore();
const displayedText = ref('');
const textContainer = ref<HTMLElement | null>(null);
let typewriterInterval: number | null = null;

// Auto-scroll when displayedText updates
watch(displayedText, async () => {
  await nextTick();
  if (textContainer.value) {
    textContainer.value.scrollTop = textContainer.value.scrollHeight;
  }
});

// Watch for topic changes to reset + start typewriter
watch(
  () => dialogueStore.currentTopic,
  (newTopic) => {
    if (newTopic) {
      if (textContainer.value) textContainer.value.scrollTop = 0;
      startTypewriter();
    }
  }
);

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
    } else {
      clearInterval(typewriterInterval!);
      typewriterInterval = null;
      dialogueStore.setAnimating(false);
    }
  }, 30);
};

onUnmounted(() => {
  if (typewriterInterval) clearInterval(typewriterInterval);
});
</script>

<style scoped>
.typewriter-text {
  min-height: 2.5em;
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
