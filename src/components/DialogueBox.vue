<template>
  <div class="h-1/3 w-full bg-black/90 border-b border-gray-700">
    <div class="h-full flex flex-col">
      <!-- Character Avatar and Text Container -->
      <div class="flex-1 flex items-center px-4 py-2">
        <!-- Character Avatar -->
        <div class="flex-shrink-0 mr-4">
          <span class="text-4xl animate-bounce">🦜</span>
        </div>

        <!-- Dialogue Text -->
        <div class="flex-1">
          <div
            class="text-white text-base leading-relaxed"
            :class="{ 'animate-pulse': dialogueStore.isAnimating }"
          >
            <span v-if="dialogueStore.currentNode" class="typewriter">
              {{ displayedText }}
            </span>
          </div>
        </div>
      </div>

      <!-- Response Options -->
      <div class="px-4 pb-2 space-y-2">
        <button
          v-for="option in dialogueStore.currentOptions"
          :key="option.id"
          @click="selectOption(option)"
          class="w-full px-3 py-1.5 text-white text-sm font-bold text-center rounded-xl border border-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          {{ option.text }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDialogueStore } from '../stores/dialogueStore';
import { dialogueTree } from '../data/dialogue';

const dialogueStore = useDialogueStore();
const displayedText = ref('');
const typewriterSpeed = 30; // milliseconds per character

// Initialize dialogue when component mounts
onMounted(() => {
  dialogueStore.initializeDialogue(dialogueTree, 'start');
  startTypewriter();
});

// Watch for changes in current node
watch(
  () => dialogueStore.currentNode,
  (newNode) => {
    if (newNode) {
      startTypewriter();
    }
  }
);

// Typewriter effect
const startTypewriter = () => {
  if (!dialogueStore.currentNode) return;

  dialogueStore.setAnimating(true);
  displayedText.value = '';
  const text = dialogueStore.currentNode.text;
  let currentIndex = 0;

  const typeNextChar = () => {
    if (currentIndex < text.length) {
      displayedText.value += text[currentIndex];
      currentIndex++;
      setTimeout(typeNextChar, typewriterSpeed);
    } else {
      dialogueStore.setAnimating(false);
    }
  };

  typeNextChar();
};

// Handle option selection
const selectOption = (option: { nextNodeId: string }) => {
  dialogueStore.goToNode(option.nextNodeId);
};

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
