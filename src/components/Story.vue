<template>
  <div
    class="h-[33vh] w-full border-b border-gray-700 flex-shrink-0 flex flex-col overflow-hidden container-[inline-size]"
    style="background-color: #3a4a1b"
  >
    <!-- Grid area: fills all but 1.5em of the container -->
    <div
      class="grid grid-cols-4 grid-rows-2 w-full gap-2 px-2 pt-2 pb-1 flex-shrink-0"
      style="height: calc(100% - 2.5em)"
    >
      <!-- Q1 -->
      <button
        v-if="dialogueStore.availableTopics[0]"
        @click="selectTopic(dialogueStore.availableTopics[0])"
        class="col-start-1 row-start-1 text-left px-2 py-1 font-bold rounded-xl border border-white bg-white/10 hover:bg-white/20 shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 max-w-[120px] whitespace-normal text-[clamp(0.8rem,4cqw,1.2rem)] text-white"
      >
        {{ dialogueStore.availableTopics[0].questionText }}
      </button>
      <!-- Q2 -->
      <button
        v-if="dialogueStore.availableTopics[1]"
        @click="selectTopic(dialogueStore.availableTopics[1])"
        class="col-start-2 row-start-1 text-left px-2 py-1 font-bold rounded-xl border border-white bg-white/10 hover:bg-white/20 shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 max-w-[120px] whitespace-normal text-[clamp(0.8rem,4cqw,1.2rem)] text-white"
      >
        {{ dialogueStore.availableTopics[1].questionText }}
      </button>
      <!-- Q3 -->
      <button
        v-if="dialogueStore.availableTopics[2]"
        @click="selectTopic(dialogueStore.availableTopics[2])"
        class="col-start-2 row-start-2 text-left px-2 py-1 font-bold rounded-xl border border-white bg-white/10 hover:bg-white/20 shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 max-w-[120px] whitespace-normal text-[clamp(0.8rem,4cqw,1.2rem)] text-white"
      >
        {{ dialogueStore.availableTopics[2].questionText }}
      </button>
      <!-- Player -->
      <div class="col-start-1 row-start-2 flex items-end justify-start pl-2">
        <img
          src="/assets/characters/player1.png"
          alt="Player Character"
          class="w-full h-full object-contain select-none"
        />
      </div>
      <!-- Character Avatar (spans 2 cols, 2 rows) -->
      <div class="col-start-3 col-end-5 row-start-1 row-end-3 flex items-center justify-center">
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
    <!-- DialogueBox: always 1.5em tall -->
    <DialogueBox class="h-[1.5em] flex-shrink-0 w-full text-[clamp(1rem,5cqw,1.5rem)]" />
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
