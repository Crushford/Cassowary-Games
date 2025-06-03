<template>
  <div class="bg-slate-800 p-4 rounded-lg flex flex-col gap-2">
    <h3 class="text-lg font-semibold text-white">Puzzle Generation Progress</h3>
    <div class="text-white">
      <p>Current Step: {{ gameStore.puzzleGenerationState.currentStep || 'N/A' }}</p>
      <p>
        Steps Completed: {{ gameStore.puzzleGenerationState.completedSteps }} /
        {{ gameStore.puzzleGenerationState.totalSteps }}
      </p>
      <p>Status: {{ gameStore.puzzleGenerationState.isGenerating ? 'Generating...' : 'Idle' }}</p>
      <p v-if="gameStore.puzzleGenerationState.isInterrupted" class="text-red-500">
        Process Interrupted
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
</script>
