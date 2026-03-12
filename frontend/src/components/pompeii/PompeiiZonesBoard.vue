<template>
  <div class="w-full">
    <!-- Three Zone Columns with Actual Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
      <!-- Wall Zone Column -->
      <div
        class="bg-surface-muted rounded-lg p-4 sm:p-6 border border-semantic-neutral-600 min-w-0"
      >
        <div class="flex items-center gap-2 mb-3 min-w-0">
          <span class="text-xl sm:text-2xl lg:text-3xl flex-shrink-0">🛡️</span>
          <h3 class="text-base sm:text-lg lg:text-xl font-bold text-white min-w-0 flex-1">Wall</h3>
        </div>
        <div class="mb-3 pb-3 border-b border-semantic-neutral-600">
          <div class="text-xs sm:text-sm text-semantic-neutral-400 mb-1">Defense Bonus</div>
          <div class="text-lg sm:text-xl font-bold text-semantic-warning-400">
            +{{ wallDefenseBonus }}
            <span
              v-if="wallDivineMultiplier > 1"
              class="text-xs sm:text-sm text-semantic-warning-500 ml-1"
            >
              (×{{ wallDivineMultiplier.toFixed(2) }})
            </span>
          </div>
        </div>
        <div class="space-y-2 min-h-[100px]">
          <div
            v-if="wallCards.length === 0"
            class="text-xs sm:text-sm text-semantic-neutral-500 italic py-3"
          >
            No wall upgrades
          </div>
          <div
            v-for="card in wallCards"
            :key="card.id"
            class="bg-surface-mutedAlt rounded p-2 border border-semantic-neutral-600 min-w-0"
          >
            <div class="text-xs sm:text-sm font-semibold text-white break-words" :title="card.name">
              {{ card.name }}
            </div>
            <div class="text-xs text-semantic-warning-400 mt-1">🛡️ +2</div>
          </div>
        </div>
      </div>

      <!-- City Zone Column -->
      <div
        class="bg-surface-muted rounded-lg p-4 sm:p-6 border border-semantic-neutral-600 min-w-0"
      >
        <div class="flex items-center gap-2 mb-3 min-w-0">
          <span class="text-xl sm:text-2xl lg:text-3xl flex-shrink-0">🏛️</span>
          <h3 class="text-base sm:text-lg lg:text-xl font-bold text-white min-w-0 flex-1">City</h3>
        </div>
        <div class="mb-3 pb-3 border-b border-semantic-neutral-600">
          <div class="text-xs sm:text-sm text-semantic-neutral-400 mb-1">Income</div>
          <div class="text-lg sm:text-xl font-bold text-semantic-success-400">
            🪙 {{ cityIncome }}
            <span
              v-if="cityDivineMultiplier > 1"
              class="text-xs sm:text-sm text-semantic-warning-500 ml-1"
            >
              (×{{ cityDivineMultiplier.toFixed(2) }})
            </span>
          </div>
        </div>
        <div class="space-y-2 min-h-[100px]">
          <div
            v-if="cityCards.length === 0"
            class="text-xs sm:text-sm text-semantic-neutral-500 italic py-3"
          >
            No city buildings
          </div>
          <div
            v-for="card in cityCards"
            :key="card.id"
            class="bg-surface-mutedAlt rounded p-2 border border-semantic-neutral-600 min-w-0"
          >
            <div class="text-xs sm:text-sm font-semibold text-white break-words" :title="card.name">
              {{ card.name }}
            </div>
            <div class="text-xs text-semantic-success-400 mt-1">🪙 +{{ card.revenue }}/turn</div>
          </div>
        </div>
      </div>

      <!-- Countryside Zone Column -->
      <div
        class="bg-surface-muted rounded-lg p-4 sm:p-6 border border-semantic-neutral-600 min-w-0"
      >
        <div class="flex items-center gap-2 mb-3 min-w-0">
          <span class="text-xl sm:text-2xl lg:text-3xl flex-shrink-0">🌾</span>
          <h3
            class="text-base sm:text-lg lg:text-xl font-bold text-white min-w-0 flex-1 break-words"
          >
            Countryside
          </h3>
        </div>
        <div class="mb-3 pb-3 border-b border-semantic-neutral-600">
          <div class="text-xs sm:text-sm text-semantic-neutral-400 mb-1">Income</div>
          <div class="text-lg sm:text-xl font-bold text-semantic-success-400">
            🪙 {{ countrysideIncome }}
            <span
              v-if="countrysideDivineMultiplier > 1"
              class="text-xs sm:text-sm text-semantic-warning-500 ml-1"
            >
              (×{{ countrysideDivineMultiplier.toFixed(2) }})
            </span>
          </div>
        </div>
        <div class="space-y-2 min-h-[100px]">
          <div
            v-if="countrysideCards.length === 0"
            class="text-xs sm:text-sm text-semantic-neutral-500 italic py-3"
          >
            No countryside buildings
          </div>
          <div
            v-for="card in countrysideCards"
            :key="card.id"
            class="bg-surface-mutedAlt rounded p-2 border border-semantic-neutral-600 min-w-0"
            :class="{ 'opacity-50': card.damaged }"
          >
            <div
              class="text-xs sm:text-sm font-semibold text-white break-words"
              :class="{ 'line-through': card.damaged }"
              :title="card.name"
            >
              {{ card.name }}
            </div>
            <div v-if="card.damaged" class="text-xs text-semantic-danger-400 mt-1">Damaged</div>
            <div v-else class="text-xs text-semantic-success-400 mt-1">
              🪙 +{{ card.revenue }}/turn
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Income Summary Row - Single Line -->
    <div class="bg-surface-muted rounded-lg px-4 py-2 border border-semantic-neutral-600">
      <div class="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
        <span class="text-semantic-neutral-400 whitespace-nowrap">Income this year:</span>
        <span class="font-semibold text-semantic-success-400 whitespace-nowrap"
          >City 🪙 {{ cityIncome }}</span
        >
        <span class="text-semantic-neutral-600 hidden sm:inline">|</span>
        <span class="font-semibold text-semantic-success-400 whitespace-nowrap"
          >Countryside 🪙 {{ countrysideIncome }}</span
        >
        <span class="text-semantic-neutral-600 hidden sm:inline">|</span>
        <span class="font-bold text-semantic-warning-400 whitespace-nowrap"
          >Total 🪙 {{ totalIncomePerTurn }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePompeiiStore, type InfrastructureCard } from '../../stores/pompeiiStore';

const store = usePompeiiStore();

const wallDefenseBonus = computed(() => store.wallDefenseBonus);
const cityProductionIncome = computed(() => store.cityProductionIncome);
const cityUpgradeIncome = computed(() => store.cityUpgradeIncome);
const countrysideIncome = computed(() => store.countrysideIncome);
const totalIncomePerTurn = computed(() => store.totalCityIncomePerTurn);

const cityIncome = computed(() => cityProductionIncome.value + cityUpgradeIncome.value);

const wallDivineMultiplier = computed(() => 1 + 0.25 * store.divineFavour.wall);
const cityDivineMultiplier = computed(() => 1 + 0.25 * store.divineFavour.city);
const countrysideDivineMultiplier = computed(() => 1 + 0.25 * store.divineFavour.countryside);

// Get actual cards for each zone
const wallCards = computed(() => {
  return store.zones.wall
    .map((slot) => {
      if (!slot.cardId) return null;
      return store.getCardById(slot.cardId);
    })
    .filter((card): card is InfrastructureCard => card !== undefined && card !== null);
});

const cityCards = computed(() => {
  return store.zones.city
    .map((slot) => {
      if (!slot.cardId) return null;
      return store.getCardById(slot.cardId);
    })
    .filter((card): card is InfrastructureCard => card !== undefined && card !== null);
});

const countrysideCards = computed(() => {
  return store.zones.countryside
    .map((slot) => {
      if (!slot.cardId) return null;
      return store.getCardById(slot.cardId);
    })
    .filter((card): card is InfrastructureCard => card !== undefined && card !== null);
});

defineOptions({
  name: 'PompeiiZonesBoard',
});
</script>
