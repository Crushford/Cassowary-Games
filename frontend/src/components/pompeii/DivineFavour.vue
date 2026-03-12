<template>
  <div class="bg-semantic-neutral-800 rounded-lg p-4 border border-semantic-neutral-700">
    <h3 class="text-lg font-bold text-white mb-3">Divine Favour</h3>
    <div class="text-xs text-semantic-neutral-400 mb-3">
      Choose how the gods smile on Pompeii this turn ({{ usedTokens }}/{{ totalTokens }} tokens)
    </div>
    <div class="space-y-3">
      <!-- Wall Blessing -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-white">🛡️ Wall</span>
          <span v-if="wallTokens > 0" class="text-xs text-semantic-warning-400">
            x{{ (1 + 0.25 * wallTokens).toFixed(2) }}
          </span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="i in 3"
            :key="i"
            :class="[
              'flex-1 py-2 rounded transition-colors text-sm font-semibold',
              wallTokens >= i
                ? 'bg-semantic-warning-600 hover:bg-semantic-warning-700 text-white'
                : 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-semantic-neutral-300',
            ]"
            :disabled="usedTokens >= totalTokens && wallTokens < i - 1"
            @click="setTokens('wall', i - 1)"
          >
            {{ i - 1 }}
          </button>
        </div>
      </div>

      <!-- City Blessing -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-white">🏛️ City</span>
          <span v-if="cityTokens > 0" class="text-xs text-semantic-success-400">
            x{{ (1 + 0.25 * cityTokens).toFixed(2) }}
          </span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="i in 3"
            :key="i"
            :class="[
              'flex-1 py-2 rounded transition-colors text-sm font-semibold',
              cityTokens >= i
                ? 'bg-semantic-success-600 hover:bg-semantic-success-700 text-white'
                : 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-semantic-neutral-300',
            ]"
            :disabled="usedTokens >= totalTokens && cityTokens < i - 1"
            @click="setTokens('city', i - 1)"
          >
            {{ i - 1 }}
          </button>
        </div>
      </div>

      <!-- Countryside Blessing -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-white">🌾 Countryside</span>
          <span v-if="countrysideTokens > 0" class="text-xs text-semantic-success-400">
            x{{ (1 + 0.25 * countrysideTokens).toFixed(2) }}
          </span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="i in 3"
            :key="i"
            :class="[
              'flex-1 py-2 rounded transition-colors text-sm font-semibold',
              countrysideTokens >= i
                ? 'bg-semantic-success-600 hover:bg-semantic-success-700 text-white'
                : 'bg-semantic-neutral-700 hover:bg-semantic-neutral-600 text-semantic-neutral-300',
            ]"
            :disabled="usedTokens >= totalTokens && countrysideTokens < i - 1"
            @click="setTokens('countryside', i - 1)"
          >
            {{ i - 1 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';

const store = usePompeiiStore();

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
  name: 'DivineFavour',
});
</script>
