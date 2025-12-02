<template>
  <div class="bg-gray-800/50 rounded-lg p-2 border border-gray-600">
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-xs text-gray-400 whitespace-nowrap">Divine Favour:</span>
      <button
        @click="showModal = true"
        class="flex items-center gap-1.5 text-sm hover:bg-gray-700 rounded px-2 py-1 transition-colors min-w-0 flex-shrink"
      >
        <span class="text-xs whitespace-nowrap">🛡️ {{ wallTokens }}</span>
        <span class="text-xs whitespace-nowrap">🏛️ {{ cityTokens }}</span>
        <span class="text-xs whitespace-nowrap">🌾 {{ countrysideTokens }}</span>
        <span class="text-xs text-gray-500 whitespace-nowrap"
          >({{ usedTokens }}/{{ totalTokens }})</span
        >
      </button>
    </div>
  </div>

  <Modal :is-visible="showModal" @close="showModal = false">
    <div class="text-white">
      <h2 class="text-xl font-bold mb-4">Divine Favour</h2>
      <div class="text-xs text-gray-400 mb-4">
        Choose how the gods smile on Pompeii this turn ({{ usedTokens }}/{{ totalTokens }} tokens)
      </div>
      <div class="space-y-4">
        <!-- Wall Blessing -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-white">🛡️ Wall</span>
            <span class="text-xs text-yellow-400" v-if="wallTokens > 0">
              x{{ (1 + 0.25 * wallTokens).toFixed(2) }}
            </span>
          </div>
          <div class="flex gap-2">
            <button
              v-for="i in 3"
              :key="i"
              @click="setTokens('wall', i - 1)"
              :class="[
                'flex-1 py-2 rounded transition-colors text-sm font-semibold',
                wallTokens >= i
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300',
              ]"
              :disabled="usedTokens >= totalTokens && wallTokens < i - 1"
            >
              {{ i - 1 }}
            </button>
          </div>
        </div>

        <!-- City Blessing -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-white">🏛️ City</span>
            <span class="text-xs text-green-400" v-if="cityTokens > 0">
              x{{ (1 + 0.25 * cityTokens).toFixed(2) }}
            </span>
          </div>
          <div class="flex gap-2">
            <button
              v-for="i in 3"
              :key="i"
              @click="setTokens('city', i - 1)"
              :class="[
                'flex-1 py-2 rounded transition-colors text-sm font-semibold',
                cityTokens >= i
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300',
              ]"
              :disabled="usedTokens >= totalTokens && cityTokens < i - 1"
            >
              {{ i - 1 }}
            </button>
          </div>
        </div>

        <!-- Countryside Blessing -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-white">🌾 Countryside</span>
            <span class="text-xs text-green-400" v-if="countrysideTokens > 0">
              x{{ (1 + 0.25 * countrysideTokens).toFixed(2) }}
            </span>
          </div>
          <div class="flex gap-2">
            <button
              v-for="i in 3"
              :key="i"
              @click="setTokens('countryside', i - 1)"
              :class="[
                'flex-1 py-2 rounded transition-colors text-sm font-semibold',
                countrysideTokens >= i
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300',
              ]"
              :disabled="usedTokens >= totalTokens && countrysideTokens < i - 1"
            >
              {{ i - 1 }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Modal from '../shared/Modal.vue';

const store = usePompeiiStore();

const showModal = ref(false);

const wallTokens = computed(() => store.divineFavour.wall);
const cityTokens = computed(() => store.divineFavour.city);
const countrysideTokens = computed(() => store.divineFavour.countryside);
const totalTokens = computed(() => store.totalBlessingTokens);
const usedTokens = computed(() => store.usedBlessingTokens);

function setTokens(zone: 'wall' | 'city' | 'countryside', tokens: number): void {
  const currentTotal = usedTokens.value;
  const currentZoneTokens = store.divineFavour[zone];
  const newTotal = currentTotal - currentZoneTokens + tokens;

  if (newTotal <= totalTokens.value) {
    store.setDivineFavour(zone, tokens);
  }
}

defineOptions({
  name: 'DivineFavourWidget',
});
</script>
