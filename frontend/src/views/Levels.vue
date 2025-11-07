<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2">Puzzle Levels</h1>
        <p class="text-gray-400">Select a category to play</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-400">Loading puzzles...</p>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <div v-else>
        <!-- Category Selection -->
        <div v-if="!selectedCategory" class="space-y-4">
          <!-- Tutorial Option -->
          <button
            @click="selectCategory('tutorial')"
            class="w-full p-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all text-left border-2 border-transparent hover:border-blue-400"
          >
            <div class="text-2xl font-bold mb-1">Tutorial</div>
            <div class="text-sm text-blue-100">Learn the basics with 10 guided puzzles</div>
          </button>

          <!-- Board Size Options -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            <button
              v-for="size in availableSizes"
              :key="size"
              @click="selectCategory(size)"
              class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left border border-gray-700 hover:border-blue-500"
            >
              <div class="text-xl font-semibold text-blue-400 mb-1">{{ size }}</div>
              <div class="text-xs text-gray-400">Puzzles</div>
            </button>
          </div>
        </div>

        <!-- Tutorial Puzzles -->
        <div v-else-if="selectedCategory === 'tutorial'" class="space-y-4">
          <button
            @click="selectedCategory = null"
            class="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            ← Back
          </button>
          <h2 class="text-2xl font-semibold mb-4 text-blue-300">Tutorial Levels</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              v-for="puzzle in tutorialPuzzles"
              :key="puzzle.name"
              @click="loadTutorialPuzzle(puzzle.name)"
              class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left border border-gray-700 hover:border-blue-500 relative"
              :class="{
                'border-green-500': queensStore.isPuzzleCompleted(puzzle.name),
                'bg-gray-700': queensStore.isPuzzleCompleted(puzzle.name),
              }"
            >
              <div class="font-mono text-sm font-semibold text-blue-400 mb-1">
                {{ puzzle.name }}
              </div>
              <div
                v-if="queensStore.isPuzzleCompleted(puzzle.name)"
                class="absolute top-2 right-2 text-green-400 text-lg"
              >
                ✓
              </div>
            </button>
          </div>
        </div>

        <!-- Board Size Puzzles -->
        <div v-else class="space-y-4">
          <button
            @click="selectedCategory = null"
            class="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            ← Back
          </button>
          <h2 class="text-2xl font-semibold mb-4 text-blue-300">{{ selectedCategory }} Puzzles</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <button
              v-for="puzzle in puzzlesForCategory"
              :key="puzzle.id"
              @click="loadPuzzle(puzzle.id)"
              class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left border border-gray-700 hover:border-blue-500 relative"
              :class="{
                'border-green-500': queensStore.isPuzzleCompleted(puzzle.id),
                'bg-gray-700': queensStore.isPuzzleCompleted(puzzle.id),
              }"
            >
              <div class="font-mono text-sm font-semibold text-blue-400 mb-1">
                Puzzle {{ puzzle.id }}
              </div>
              <div
                v-if="queensStore.isPuzzleCompleted(puzzle.id)"
                class="absolute top-2 right-2 text-green-400 text-lg"
              >
                ✓
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
const selectedCategory = ref<string | null>(null);

const availableSizes = computed(() => {
  const sizes = new Set<string>();
  queensStore.allPuzzles.forEach((puzzle) => {
    const gridSize = Math.sqrt(puzzle.layout.length);
    const sizeKey = `${gridSize}x${gridSize}`;
    sizes.add(sizeKey);
  });
  return Array.from(sizes).sort((a, b) => {
    const aSize = parseInt(a.split('x')[0], 10);
    const bSize = parseInt(b.split('x')[0], 10);
    return aSize - bSize;
  });
});

const tutorialPuzzles = computed(() => {
  return queensStore.tutorialPuzzles;
});

const puzzlesForCategory = computed(() => {
  if (!selectedCategory.value || selectedCategory.value === 'tutorial') {
    return [];
  }

  const puzzles: any[] = [];
  queensStore.allPuzzles.forEach((puzzle) => {
    const gridSize = Math.sqrt(puzzle.layout.length);
    const sizeKey = `${gridSize}x${gridSize}`;
    if (sizeKey === selectedCategory.value) {
      puzzles.push(puzzle);
    }
  });

  // Sort puzzles by numeric ID
  puzzles.sort((a, b) => a.id - b.id);
  return puzzles;
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

function selectCategory(category: string) {
  selectedCategory.value = category;
}

function loadPuzzle(puzzleId: number) {
  router.push(`/queens/${puzzleId}`);
}

async function loadTutorialPuzzle(levelName: string) {
  router.push(`/queens/tutorial/${levelName}`);
}

onMounted(() => {
  loadPuzzles();
});

defineOptions({
  name: 'Levels',
});
</script>
