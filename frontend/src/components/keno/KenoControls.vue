<template>
  <div class="flex items-center justify-center bg-slate-800 p-2 rounded-lg">
    <!-- Reset game button -->
    <button
      class="px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
      aria-label="Reset game"
      @click="handleResetGame"
    >
      <span>🔄</span>
      <span>Reset Game</span>
    </button>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-slate-500"></div>

    <!-- Rules button -->
    <button
      class="px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
      aria-label="Show rules"
      @click="handleShowRules"
    >
      <span>📖</span>
      <span>Rules</span>
    </button>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-slate-500"></div>

    <!-- Payout Tables button -->
    <button
      class="px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
      aria-label="Show payout tables"
      @click="handleShowPayoutTables"
    >
      <span>📊</span>
      <span>Payout Tables</span>
    </button>

    <!-- Divider -->
    <div class="mx-3 h-10 border-l border-slate-500"></div>

    <!-- New random level button -->
    <button
      class="px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 focus:outline-none min-w-[44px] min-h-[44px] text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
      aria-label="New random level"
      @click="handleNewRandomLevel"
    >
      <span>🎲</span>
      <span>New Random Level</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useKenoStore } from '../../stores/kenoStore';

const kenoStore = useKenoStore();

const emit = defineEmits<{
  'show-rules': [];
  'show-payout-tables': [];
}>();

function handleResetGame() {
  kenoStore.resetGame();
}

async function handleNewRandomLevel() {
  await kenoStore.loadRandomPuzzle();
}

function handleShowRules() {
  emit('show-rules');
}

function handleShowPayoutTables() {
  emit('show-payout-tables');
}

defineOptions({
  name: 'KenoControls',
});
</script>
