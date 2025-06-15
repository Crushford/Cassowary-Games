<template>
  <div class="h-[33vh] w-full bg-black/90 border-b border-gray-700 flex-shrink-0 flex flex-col">
    <!-- Grid Layout Container -->
    <div class="grid grid-cols-5 grid-rows-3 w-full h-[12rem] relative px-2 pt-2 pb-1">
      <!-- Player Image -->
      <div class="col-start-1 row-start-3 flex items-end justify-start pl-2">
        <img
          src="/assets/characters/player.png"
          alt="Player Character"
          class="w-16 h-16 object-contain select-none"
        />
      </div>

      <!-- Question Buttons in Arc -->
      <button
        v-for="(topic, i) in dialogueStore.availableTopics"
        :key="topic.id"
        @click="selectTopic(topic)"
        class="absolute text-left px-2 py-1 text-white text-xs font-bold rounded-xl border border-white bg-white/10 hover:bg-white/20 shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 max-w-[120px] whitespace-normal"
        :style="getArcStyle(i)"
      >
        {{ topic.questionText }}
      </button>

      <!-- Character Avatar (Cockatoo) -->
      <div class="col-start-5 row-start-1 flex items-start justify-end pr-4">
        <img
          v-if="dialogueStore.currentCharacter?.portraitUrl"
          :src="dialogueStore.currentCharacter.portraitUrl"
          alt="Character Portrait"
          class="w-16 h-16 object-contain rounded-full shadow-lg animate-bounce select-none"
        />
        <span v-else class="text-5xl animate-bounce select-none">
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

// Utility to position buttons in an arc using transform
const getArcStyle = (index: number) => {
  const total = dialogueStore.availableTopics.length;
  const baseX = 100; // increased from 80 to spread out more
  const baseY = 100; // increased from 80 to spread out more
  const spread = 80; // increased from 60 to spread out more

  const angleDeg = -spread / 2 + (spread / (total - 1 || 1)) * index;
  const angleRad = (angleDeg * Math.PI) / 180;

  const x = baseX * Math.cos(angleRad);
  const y = baseY * Math.sin(angleRad);

  return {
    left: '4rem',
    bottom: '4rem',
    transform: `translate(${x}px, -${y}px)`,
  };
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
