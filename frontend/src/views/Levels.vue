<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2">Puzzle Levels</h1>
        <p class="text-gray-400">Select a puzzle to play</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-400">Loading puzzles...</p>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <div v-else class="space-y-8">
        <div v-for="(puzzles, size) in puzzlesBySize" :key="size" class="mb-8">
          <h2 class="text-2xl font-semibold mb-4 text-blue-300">{{ size }}</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <button
              v-for="puzzle in puzzles"
              :key="puzzle.id"
              @click="loadPuzzle(puzzle.id)"
              class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left border border-gray-700 hover:border-blue-500"
            >
              <div class="font-mono text-sm font-semibold text-blue-400 mb-1">
                {{ puzzle.id }}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQueensStore } from '../stores/queensStore';

const router = useRouter();
const queensStore = useQueensStore();

const loading = ref(true);
const error = ref<string | null>(null);

const puzzlesBySize = computed(() => {
  const grouped: Record<string, any[]> = {};
  queensStore.allPuzzles.forEach((puzzle) => {
    const gridSize = Math.sqrt(puzzle.layout.length);
    const sizeKey = `${gridSize}x${gridSize}`;
    if (!grouped[sizeKey]) {
      grouped[sizeKey] = [];
    }
    grouped[sizeKey].push(puzzle);
  });

  // Sort puzzles within each size by numeric ID
  Object.keys(grouped).forEach((size) => {
    grouped[size].sort((a, b) => a.id - b.id);
  });

  return grouped;
});

async function loadPuzzles() {
  try {
    loading.value = true;
    error.value = null;

    const success = await queensStore.loadPuzzleDatabase();
    if (!success) {
      throw new Error('Failed to load puzzle database');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load puzzles';
    console.error('Error loading puzzles:', err);
  } finally {
    loading.value = false;
  }
}

function loadPuzzle(puzzleId: number) {
  router.push(`/queens/${puzzleId}`);
}

onMounted(() => {
  loadPuzzles();
});

defineOptions({
  name: 'Levels',
});
</script>
