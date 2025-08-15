<template>
  <Modal :is-visible="isVisible" @close="closeModal">
    <div class="relative w-full h-full mx-auto flex items-center justify-center">
      <!-- Close Button -->
      <button
        @click="closeModal"
        class="absolute -top-8 -right-8 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-600 hover:text-gray-800 rounded-full p-2 transition-all shadow-lg"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <!-- Validation Mode: Show the game to play and validate -->
      <div v-if="!isSaveMode" class="w-full max-w-md">
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold text-white mb-2">Validate Your Puzzle</h2>
          <p class="text-gray-300 text-sm">Play through your puzzle to test it</p>
        </div>
        <HarvestGame :is-game-only="true" :puzzle-data="currentPuzzleData" />

        <!-- Save Button (only show when running locally and game is complete) -->
        <div v-if="isRunningLocally && harvestStore.isComplete" class="mt-4 text-center">
          <button
            @click="switchToSaveMode"
            class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium"
          >
            Save Puzzle
          </button>
        </div>
      </div>

      <!-- Save Mode: Show puzzle preview and save functionality -->
      <div v-else class="w-full max-w-2xl">
        <div class="w-full bg-gray-800 rounded-lg p-6 shadow-xl">
          <!-- Header -->
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-white mb-2">Save Puzzle</h2>
            <p class="text-gray-300">Review and save your puzzle</p>
          </div>

          <!-- Puzzle Name Input -->
          <div class="mb-6">
            <label for="puzzleName" class="block text-sm font-medium text-gray-300 mb-2">
              Puzzle Name (optional)
            </label>
            <input
              id="puzzleName"
              v-model="puzzleName"
              type="text"
              placeholder="Enter a name for this puzzle..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Puzzle Grid -->
          <div class="flex justify-center mb-6">
            <div class="bg-gray-900 p-4 rounded-lg">
              <div
                class="grid gap-1"
                :style="{
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  width: `${gridSize * 60}px`,
                  height: `${gridSize * 60}px`,
                }"
              >
                <template v-for="rowIndex in gridSize" :key="`row-${rowIndex}`">
                  <div
                    v-for="colIndex in gridSize"
                    :key="`${rowIndex}-${colIndex}`"
                    class="w-14 h-14 border border-gray-600 rounded relative overflow-hidden"
                    :class="getCellClasses(rowIndex - 1, colIndex - 1)"
                  >
                    <img
                      v-if="getCellImage(rowIndex - 1, colIndex - 1)"
                      :src="getCellImage(rowIndex - 1, colIndex - 1)"
                      class="w-full h-full object-cover"
                      alt=""
                    />
                    <div
                      v-else-if="getCellContent(rowIndex - 1, colIndex - 1)"
                      class="w-full h-full flex items-center justify-center text-xs font-bold"
                      :class="getCellTextColor(rowIndex - 1, colIndex - 1)"
                    >
                      {{ getCellContent(rowIndex - 1, colIndex - 1) }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Puzzle Info -->
          <div class="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 class="text-lg font-semibold text-white mb-3">Puzzle Details</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-400">Grid Size:</span>
                <span class="text-white ml-2">{{ gridSize }}x{{ gridSize }}</span>
              </div>
              <div>
                <span class="text-gray-400">Honey Pots:</span>
                <span class="text-white ml-2">{{ honeyPotCount }}</span>
              </div>
              <div>
                <span class="text-gray-400">Color Groups:</span>
                <span class="text-white ml-2">{{ colorGroupCount }}</span>
              </div>
              <div>
                <span class="text-gray-400">Empty Cells:</span>
                <span class="text-white ml-2">{{ emptyCellCount }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4 justify-center">
            <button
              @click="closeModal"
              class="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="savePuzzle"
              :disabled="isSaving"
              class="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                v-if="!isSaving"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <svg
                v-else
                class="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {{ isSaving ? 'Saving...' : 'Save Puzzle' }}
            </button>
          </div>

          <!-- Save Status Message -->
          <div
            v-if="saveMessage"
            class="mt-4 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 text-center"
            :class="
              saveMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            "
          >
            {{ saveMessage.text }}
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, watch, computed } from 'vue';
import { usePlantStore } from '../../stores/plantStore';
import { useHarvestStore } from '../../stores/harvestStore';
import { COLOR_IMAGE_URLS } from '../../utils/colorPalette';

const Modal = defineAsyncComponent(() => import('../shared/Modal.vue'));
const HarvestGame = defineAsyncComponent(() => import('../../views/HarvestGame.vue'));

interface Props {
  isVisible: boolean;
  mode?: 'validation' | 'save';
}

interface Emits {
  (e: 'close'): void;
}

interface SaveMessage {
  type: 'success' | 'error';
  text: string;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'validation',
});

const emit = defineEmits<Emits>();

const plantStore = usePlantStore();
const harvestStore = useHarvestStore();
const currentPuzzleData = ref<any>(null);
const puzzleName = ref('');
const isSaving = ref(false);
const saveMessage = ref<SaveMessage | null>(null);

// Check if running locally (development environment)
const isRunningLocally = computed(() => {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost')
  );
});

// Computed properties
const isSaveMode = computed(() => props.mode === 'save');

// Computed properties for puzzle display
const gridSize = computed(() => plantStore.gridSize);

const honeyPotCount = computed(() => {
  let count = 0;
  for (let row = 0; row < gridSize.value; row++) {
    for (let col = 0; col < gridSize.value; col++) {
      if (plantStore.grid[row]?.[col]?.base === 'honey') {
        count++;
      }
    }
  }
  return count;
});

const colorGroupCount = computed(() => {
  const colors = new Set();
  for (let row = 0; row < gridSize.value; row++) {
    for (let col = 0; col < gridSize.value; col++) {
      const color = plantStore.grid[row]?.[col]?.groupColor;
      if (color) {
        colors.add(color);
      }
    }
  }
  return colors.size;
});

const emptyCellCount = computed(() => {
  let count = 0;
  for (let row = 0; row < gridSize.value; row++) {
    for (let col = 0; col < gridSize.value; col++) {
      const cell = plantStore.grid[row]?.[col];
      if (!cell?.base && !cell?.groupColor) {
        count++;
      }
    }
  }
  return count;
});

// Load puzzle data when modal becomes visible
watch(
  () => props.isVisible,
  (isVisible) => {
    if (isVisible) {
      currentPuzzleData.value = plantStore.exportPuzzleData();
      puzzleName.value = ''; // Reset name when opening
    } else {
      currentPuzzleData.value = null;
      puzzleName.value = '';
    }
  }
);

const closeModal = () => {
  if (isSaveMode.value) {
    plantStore.closeSaveModal();
  } else {
    plantStore.closeValidationModal();
  }
  emit('close');
};

const switchToSaveMode = () => {
  // Close validation modal and open save modal
  plantStore.closeValidationModal();
  plantStore.openSaveModal();
};

const getCellClasses = (row: number, col: number) => {
  const cell = plantStore.grid[row]?.[col];
  if (!cell) return 'bg-gray-800';

  if (cell.base === 'honey') return 'bg-yellow-600';
  if (cell.groupColor) return 'bg-gray-700';
  return 'bg-gray-800';
};

const getCellImage = (row: number, col: number) => {
  const cell = plantStore.grid[row]?.[col];
  if (!cell) return '';

  if (cell.groupColor) {
    return COLOR_IMAGE_URLS[cell.groupColor as keyof typeof COLOR_IMAGE_URLS] || '';
  }
  return '';
};

const getCellContent = (row: number, col: number) => {
  const cell = plantStore.grid[row]?.[col];
  if (!cell) return '';

  if (cell.base === 'honey') return '🍯';
  return '';
};

const getCellTextColor = (row: number, col: number) => {
  const cell = plantStore.grid[row]?.[col];
  if (!cell) return 'text-gray-400';

  if (cell.base === 'honey') return 'text-yellow-200';
  return 'text-gray-400';
};

const savePuzzle = async () => {
  if (!currentPuzzleData.value) {
    showSaveMessage('error', 'No puzzle data to save');
    return;
  }

  // Validate the puzzle before saving
  const validation = plantStore.validatePuzzleForSaving();
  if (!validation.isValid) {
    showSaveMessage('error', `Puzzle validation failed: ${validation.errors.join(', ')}`);
    return;
  }

  isSaving.value = true;
  saveMessage.value = null;

  try {
    // Convert to API format (string format) with name
    const apiData = plantStore.convertToApiFormat(puzzleName.value);

    const response = await fetch('http://localhost:3001/api/puzzles/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (response.ok) {
      showSaveMessage('success', 'Puzzle saved successfully!');
      // Close modal after successful save
      setTimeout(() => {
        closeModal();
      }, 2000);
    } else {
      showSaveMessage('error', result.error || 'Failed to save puzzle');
    }
  } catch (error) {
    console.error('Error saving puzzle:', error);
    showSaveMessage('error', 'Network error. Please check if the server is running.');
  } finally {
    isSaving.value = false;
  }
};

const showSaveMessage = (type: 'success' | 'error', text: string) => {
  saveMessage.value = { type, text };

  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (saveMessage.value?.type === 'success') {
        saveMessage.value = null;
      }
    }, 3000);
  }
};

defineOptions({
  name: 'PuzzleValidationModal',
});
</script>
