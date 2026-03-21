<template>
  <div
    class="h-svh w-full max-w-[480px] mx-auto bg-semantic-neutral-800 text-white flex flex-col overflow-hidden"
  >
    <div class="flex flex-col items-center justify-center h-full p-8 overflow-y-auto">
      <!-- Menu state -->
      <div v-if="!evolveStore.isGameActive" class="space-y-4 w-full max-w-md">
        <h1 class="text-3xl font-bold text-center mb-8">Evolve</h1>

        <BaseButton class="w-full" @click="onNewGameClick"> New Game </BaseButton>

        <BaseButton v-if="evolveStore.hasSavedGame" class="w-full" @click="onContinueClick">
          Continue
        </BaseButton>
      </div>

      <!-- Game state -->
      <div v-else class="w-full max-w-lg space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Generation {{ evolveStore.generation }}</h2>
          <BaseButton @click="onExitToMenu"> Exit </BaseButton>
        </div>

        <!-- Matriarch Panel -->
        <div
          class="p-4 rounded-lg border border-semantic-neutral-700 bg-semantic-neutral-900 space-y-3"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-lg">Matriarch</h3>
            <span class="text-sm text-semantic-neutral-400">Gen {{ matriarch?.generation }}</span>
          </div>

          <div v-if="matriarch" class="space-y-2">
            <!-- Stats Summary -->
            <p class="text-sm text-semantic-neutral-300">
              Size {{ matriarch.size }}, Speed {{ matriarch.speed }}, Fertility
              {{ matriarch.fertility }}
            </p>

            <!-- Stat Details -->
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div class="text-semantic-neutral-400 mb-1">Size</div>
                <div class="flex items-center gap-1">
                  <div class="flex-1 bg-semantic-neutral-700 rounded-full h-2">
                    <div
                      class="bg-semantic-info-500 h-2 rounded-full"
                      :style="{ width: `${(matriarch.size / 10) * 100}%` }"
                    ></div>
                  </div>
                  <span>{{ matriarch.size }}</span>
                </div>
              </div>
              <div>
                <div class="text-semantic-neutral-400 mb-1">Speed</div>
                <div class="flex items-center gap-1">
                  <div class="flex-1 bg-semantic-neutral-700 rounded-full h-2">
                    <div
                      class="bg-semantic-success-500 h-2 rounded-full"
                      :style="{ width: `${(matriarch.speed / 10) * 100}%` }"
                    ></div>
                  </div>
                  <span>{{ matriarch.speed }}</span>
                </div>
              </div>
              <div>
                <div class="text-semantic-neutral-400 mb-1">Fertility</div>
                <div class="flex items-center gap-1">
                  <div class="flex-1 bg-semantic-neutral-700 rounded-full h-2">
                    <div
                      class="bg-semantic-info-500 h-2 rounded-full"
                      :style="{ width: `${(matriarch.fertility / 10) * 100}%` }"
                    ></div>
                  </div>
                  <span>{{ matriarch.fertility }}</span>
                </div>
              </div>
            </div>

            <!-- Partner Info -->
            <div class="pt-2 border-t border-semantic-neutral-700">
              <div class="text-sm text-semantic-neutral-400 mb-1">Partner</div>
              <div v-if="partner" class="text-sm">
                <span class="text-semantic-neutral-300">
                  Size {{ partner.size }}, Speed {{ partner.speed }}, Fertility
                  {{ partner.fertility }}
                </span>
              </div>
              <div v-else class="text-sm text-semantic-neutral-500">No partner yet</div>
            </div>
          </div>
        </div>

        <!-- Resources Panel -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-lg border border-semantic-neutral-700 bg-semantic-neutral-900">
            <p class="font-medium mb-2">Fruit</p>
            <p class="text-2xl">{{ evolveStore.fruit }}</p>
          </div>
          <div class="p-4 rounded-lg border border-semantic-neutral-700 bg-semantic-neutral-900">
            <p class="font-medium mb-2">Evolution Points</p>
            <p class="text-2xl">{{ evolveStore.evolutionPoints }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <BaseButton class="w-full" @click="evolveStore.gainFruit()">
            Forage for fruit
          </BaseButton>
          <BaseButton
            class="w-full"
            :disabled="!evolveStore.canLayEggs"
            :disabled-title="
              !evolveStore.canLayEggs ? 'Need partner and ' + evolveStore.clutchCost + ' fruit' : ''
            "
            @click="onLayEggsClick"
          >
            Lay eggs
          </BaseButton>
        </div>

        <!-- Family and Partners Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <BaseButton class="w-full" @click="showFamilyView = true">
            Family ({{ (evolveStore.females || []).length }})
          </BaseButton>
          <BaseButton class="w-full" @click="showPartnersView = true">
            Partners ({{ (evolveStore.males || []).length }})
          </BaseButton>
        </div>

        <!-- Lineage View -->
        <div class="p-4 rounded-lg border border-semantic-neutral-700 bg-semantic-neutral-900">
          <h3 class="font-semibold mb-3">Lineage</h3>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <!-- Past matriarchs -->
            <div
              v-for="entry in evolveStore.lineageHistory || []"
              :key="entry.matriarchId"
              class="p-2 rounded bg-semantic-neutral-800 cursor-pointer hover:bg-semantic-neutral-750"
              @click="
                selectedLineageEntry = entry;
                showLineageDetail = true;
              "
            >
              <div class="text-xs text-semantic-neutral-400">Gen {{ entry.generation }}</div>
              <div class="text-sm">
                Size {{ entry.size }}, Speed {{ entry.speed }}, Fertility {{ entry.fertility }}
              </div>
            </div>
            <!-- Current matriarch -->
            <div
              v-if="matriarch"
              class="p-2 rounded bg-semantic-info-900 border border-semantic-info-700 cursor-pointer hover:bg-semantic-info-800"
              @click="
                selectedLineageEntry = {
                  matriarchId: matriarch.id,
                  generation: matriarch.generation,
                  size: matriarch.size,
                  speed: matriarch.speed,
                  fertility: matriarch.fertility,
                };
                showLineageDetail = true;
              "
            >
              <div class="text-xs text-semantic-info-300">
                Gen {{ matriarch.generation }} (Current)
              </div>
              <div class="text-sm">
                Size {{ matriarch.size }}, Speed {{ matriarch.speed }}, Fertility
                {{ matriarch.fertility }}
              </div>
            </div>
            <div
              v-if="
                (!evolveStore.lineageHistory || evolveStore.lineageHistory.length === 0) &&
                !matriarch
              "
              class="text-sm text-semantic-neutral-500"
            >
              No lineage history yet
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm Overwrite Modal -->
      <Modal :is-visible="showOverwriteModal" @close="showOverwriteModal = false">
        <div>
          <h3 class="text-xl font-semibold text-white mb-4">Start New Game?</h3>
          <p class="mb-4 text-semantic-neutral-300">
            Starting a new game will overwrite your existing evolve save.
          </p>
          <div class="flex justify-end gap-2">
            <BaseButton @click="showOverwriteModal = false"> Cancel </BaseButton>
            <BaseButton @click="confirmNewGame"> Overwrite and start </BaseButton>
          </div>
        </div>
      </Modal>

      <!-- Chick Selection Modal -->
      <Modal :is-visible="showChickSelection" @close="closeChickSelection">
        <div>
          <h3 class="text-xl font-semibold text-white mb-4">Select New Matriarch</h3>
          <p class="mb-4 text-semantic-neutral-300 text-sm">
            Choose a female chick to become the new matriarch, then select which other chicks to
            keep.
          </p>

          <div v-if="evolveStore.activeEggBatch" class="space-y-3 mb-4 max-h-96 overflow-y-auto">
            <div
              v-for="chick in evolveStore.activeEggBatch.chicks"
              :key="chick.id"
              class="p-3 rounded border"
              :class="{
                'border-semantic-info-500 bg-semantic-info-900': selectedMatriarchId === chick.id,
                'border-semantic-neutral-600 bg-semantic-neutral-800':
                  selectedMatriarchId !== chick.id && keptChickIds.includes(chick.id),
                'border-semantic-neutral-700 bg-semantic-neutral-900':
                  selectedMatriarchId !== chick.id && !keptChickIds.includes(chick.id),
              }"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{{
                    chick.sex === 'female' ? '♀' : '♂'
                  }}</span>
                  <span v-if="chick.mutatedStat" class="text-xs text-semantic-neutral-400">
                    Mutated: {{ chick.mutatedStat }}
                  </span>
                </div>
                <div class="text-xs text-semantic-neutral-400">
                  Size {{ chick.size }}, Speed {{ chick.speed }}, Fertility {{ chick.fertility }}
                </div>
              </div>

              <div class="flex gap-2">
                <BaseButton
                  v-if="chick.sex === 'female'"
                  :class="selectedMatriarchId === chick.id ? 'bg-semantic-info-600' : ''"
                  class="text-xs py-1 px-2"
                  @click="selectMatriarch(chick.id)"
                >
                  {{
                    selectedMatriarchId === chick.id
                      ? 'Selected as Matriarch'
                      : 'Select as Matriarch'
                  }}
                </BaseButton>
                <BaseButton
                  v-if="selectedMatriarchId !== chick.id"
                  :class="keptChickIds.includes(chick.id) ? 'bg-semantic-success-600' : ''"
                  class="text-xs py-1 px-2"
                  @click="toggleKeepChick(chick.id)"
                >
                  {{ keptChickIds.includes(chick.id) ? "Don't Keep" : 'Keep' }}
                </BaseButton>
              </div>
            </div>
          </div>

          <div
            v-if="femaleChicks.length === 0"
            class="mb-4 p-3 bg-semantic-warning-900 border border-semantic-warning-700 rounded text-sm text-semantic-warning-200"
          >
            No female chicks in this clutch. The current matriarch will remain.
          </div>

          <div class="flex justify-end gap-2">
            <BaseButton @click="closeChickSelection"> Cancel </BaseButton>
            <BaseButton
              :disabled="femaleChicks.length > 0 && !selectedMatriarchId"
              @click="confirmChickSelection"
            >
              Confirm
            </BaseButton>
          </div>
        </div>
      </Modal>

      <!-- Family View Modal -->
      <Modal :is-visible="showFamilyView" @close="showFamilyView = false">
        <div>
          <h3 class="text-xl font-semibold text-white mb-4">Family</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="female in evolveStore.females || []"
              :key="female.id"
              class="p-3 rounded border"
              :class="{
                'border-semantic-info-500 bg-semantic-info-900':
                  female.id === evolveStore.matriarchId,
                'border-semantic-neutral-600 bg-semantic-neutral-800':
                  female.id !== evolveStore.matriarchId,
              }"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium">
                  {{ female.id === evolveStore.matriarchId ? 'Matriarch' : female.role }}
                </span>
                <span class="text-xs text-semantic-neutral-400">Gen {{ female.generation }}</span>
              </div>
              <div class="text-sm text-semantic-neutral-300">
                Size {{ female.size }}, Speed {{ female.speed }}, Fertility {{ female.fertility }}
              </div>
            </div>
            <div
              v-if="!evolveStore.females || evolveStore.females.length === 0"
              class="text-sm text-semantic-neutral-500"
            >
              No females in family
            </div>
          </div>
        </div>
      </Modal>

      <!-- Partners View Modal -->
      <Modal :is-visible="showPartnersView" @close="showPartnersView = false">
        <div>
          <h3 class="text-xl font-semibold text-white mb-4">Partners</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="male in evolveStore.males || []"
              :key="male.id"
              class="p-3 rounded border border-semantic-neutral-600 bg-semantic-neutral-800"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium">Male</span>
                <span class="text-xs text-semantic-neutral-400">Gen {{ male.generation }}</span>
              </div>
              <div class="text-sm text-semantic-neutral-300 mb-1">
                Size {{ male.size }}, Speed {{ male.speed }}, Fertility {{ male.fertility }}
              </div>
              <div class="text-xs text-semantic-neutral-400">
                {{ male.linkedFemaleId ? 'Linked to female' : 'Unassigned' }}
              </div>
            </div>
            <div
              v-if="!evolveStore.males || evolveStore.males.length === 0"
              class="text-sm text-semantic-neutral-500"
            >
              No male partners yet
            </div>
          </div>
        </div>
      </Modal>

      <!-- Lineage Detail Modal -->
      <Modal :is-visible="showLineageDetail" @close="showLineageDetail = false">
        <div v-if="selectedLineageEntry">
          <h3 class="text-xl font-semibold text-white mb-4">Matriarch Details</h3>
          <div class="space-y-2">
            <div>
              <span class="text-semantic-neutral-400">Generation:</span>
              <span class="ml-2">{{ selectedLineageEntry.generation }}</span>
            </div>
            <div>
              <span class="text-semantic-neutral-400">Size:</span>
              <span class="ml-2">{{ selectedLineageEntry.size }}</span>
            </div>
            <div>
              <span class="text-semantic-neutral-400">Speed:</span>
              <span class="ml-2">{{ selectedLineageEntry.speed }}</span>
            </div>
            <div>
              <span class="text-semantic-neutral-400">Fertility:</span>
              <span class="ml-2">{{ selectedLineageEntry.fertility }}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useEvolveStore } from '@/games/evolve/stores/evolve';
import type { LineageEntry } from '@/games/evolve/stores/evolve';
import BaseButton from '@/games/queens/components/level-builder/BaseButton.vue';
import Modal from '@/shared/components/Modal.vue';

const evolveStore = useEvolveStore();
const showOverwriteModal = ref(false);
const showChickSelection = ref(false);
const showFamilyView = ref(false);
const showPartnersView = ref(false);
const showLineageDetail = ref(false);
const selectedMatriarchId = ref<string>('');
const keptChickIds = ref<string[]>([]);
const selectedLineageEntry = ref<LineageEntry | null>(null);

const matriarch = computed(() => evolveStore.currentMatriarch);
const partner = computed(() => evolveStore.matriarchPartner);

const femaleChicks = computed(() => {
  if (!evolveStore.activeEggBatch) return [];
  return evolveStore.activeEggBatch.chicks.filter((c) => c.sex === 'female');
});

onMounted(() => {
  evolveStore.loadFromStorage();
});

// Watch for active egg batch to show selection modal
watch(
  () => evolveStore.activeEggBatch,
  (newBatch) => {
    if (newBatch) {
      showChickSelection.value = true;
      selectedMatriarchId.value = '';
      keptChickIds.value = [];

      // Auto-select first female chick if available
      const firstFemale = femaleChicks.value[0];
      if (firstFemale) {
        selectedMatriarchId.value = firstFemale.id;
        keptChickIds.value.push(firstFemale.id);
      }
    }
  }
);

const onNewGameClick = () => {
  if (evolveStore.hasSavedGame) {
    showOverwriteModal.value = true;
  } else {
    evolveStore.newGame();
  }
};

const confirmNewGame = () => {
  showOverwriteModal.value = false;
  evolveStore.newGame();
};

const onContinueClick = () => {
  evolveStore.continueGame();
};

const onExitToMenu = () => {
  evolveStore.endGame();
};

const onLayEggsClick = () => {
  evolveStore.layEggs();
};

const selectMatriarch = (chickId: string) => {
  selectedMatriarchId.value = chickId;
  // Automatically keep the selected matriarch
  if (!keptChickIds.value.includes(chickId)) {
    keptChickIds.value.push(chickId);
  }
};

const toggleKeepChick = (chickId: string) => {
  const index = keptChickIds.value.indexOf(chickId);
  if (index > -1) {
    keptChickIds.value.splice(index, 1);
  } else {
    keptChickIds.value.push(chickId);
  }
};

const confirmChickSelection = () => {
  if (femaleChicks.value.length > 0 && !selectedMatriarchId.value) {
    return; // Must select a female matriarch if available
  }

  // If no female chicks, keep current matriarch and just add kept chicks
  if (femaleChicks.value.length === 0) {
    evolveStore.addChicksToFamily(keptChickIds.value);
    evolveStore.activeEggBatch = null;
  } else {
    // Ensure selected matriarch is in kept list (should already be there, but double-check)
    const allKeptIds = [...keptChickIds.value];
    if (!allKeptIds.includes(selectedMatriarchId.value)) {
      allKeptIds.push(selectedMatriarchId.value);
    }
    evolveStore.selectNewMatriarch(selectedMatriarchId.value, allKeptIds);
  }

  closeChickSelection();
};

const closeChickSelection = () => {
  showChickSelection.value = false;
  selectedMatriarchId.value = '';
  keptChickIds.value = [];
};

defineOptions({
  name: 'EvolveView',
});
</script>
