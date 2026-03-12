<template>
  <div class="bg-surface-muted rounded-lg p-3 border border-semantic-neutral-600">
    <h3 class="text-base font-semibold text-white mb-3">Shop</h3>
    <div class="space-y-2">
      <!-- Recruit Army -->
      <Accordion ref="recruitRef" title="Recruit Army" :default-open="true">
        <div class="bg-surface-mutedAlt rounded p-3">
          <div class="flex items-center justify-between mb-2">
            <div>
              <div class="text-white font-semibold text-sm">Soldier</div>
              <div class="text-xs text-semantic-neutral-400">Rank 1 • Strength 2/2 • d4 die</div>
            </div>
            <div class="text-right">
              <div class="text-semantic-warning-400 font-bold">🪙 {{ soldierCost }}</div>
            </div>
          </div>
          <button
            :disabled="gold < soldierCost || gameOver"
            class="w-full bg-semantic-success-600 hover:bg-semantic-success-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
            @click="recruitSoldier"
          >
            Recruit Soldier
          </button>
        </div>
      </Accordion>

      <!-- Wall Infrastructure -->
      <Accordion ref="wallRef" title="Wall Infrastructure">
        <div class="space-y-2">
          <div class="bg-surface-mutedAlt rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-white font-semibold text-sm">Wall Upgrade</div>
                <div class="text-xs text-semantic-neutral-400">🛡️ +2 wall defense</div>
              </div>
              <div class="text-semantic-warning-400 font-bold">🪙 25</div>
            </div>
            <button
              :disabled="gold < 25 || gameOver || !hasWallSlot"
              class="w-full bg-semantic-warning-600 hover:bg-semantic-warning-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
              @click="purchaseWallUpgrade"
            >
              Purchase Wall Upgrade
            </button>
          </div>
        </div>
      </Accordion>

      <!-- City Upgrades -->
      <Accordion ref="cityRef" title="City Upgrades">
        <div class="space-y-2">
          <div
            v-for="upgrade in cityUpgrades"
            :key="upgrade.id"
            class="bg-surface-mutedAlt rounded p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-white font-semibold text-sm">{{ upgrade.name }}</div>
                <div class="text-xs text-semantic-neutral-400">🪙 +{{ upgrade.revenue }}/turn</div>
              </div>
              <div class="text-semantic-warning-400 font-bold">🪙 {{ upgrade.cost }}</div>
            </div>
            <button
              :disabled="gold < upgrade.cost || gameOver || !hasCitySlot"
              class="w-full bg-semantic-info-600 hover:bg-semantic-info-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
              @click="purchaseCityUpgrade(upgrade.id)"
            >
              Purchase {{ upgrade.name }}
            </button>
          </div>
        </div>
      </Accordion>

      <!-- Countryside Upgrades -->
      <Accordion ref="countrysideRef" title="Countryside Upgrades">
        <div class="space-y-2">
          <div
            v-for="upgrade in countrysideUpgrades"
            :key="upgrade.id"
            class="bg-surface-mutedAlt rounded p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-white font-semibold text-sm">{{ upgrade.name }}</div>
                <div class="text-xs text-semantic-neutral-400">🪙 +{{ upgrade.revenue }}/turn</div>
              </div>
              <div class="text-semantic-warning-400 font-bold">🪙 {{ upgrade.cost }}</div>
            </div>
            <button
              :disabled="gold < upgrade.cost || gameOver || !hasCountrysideSlot"
              class="w-full bg-semantic-success-600 hover:bg-semantic-success-700 disabled:bg-semantic-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
              @click="purchaseCountrysideUpgrade(upgrade.id)"
            >
              Purchase {{ upgrade.name }}
            </button>
          </div>
        </div>
      </Accordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePompeiiStore } from '../../stores/pompeiiStore';
import Accordion from '../shared/Accordion.vue';

const store = usePompeiiStore();

const gold = computed(() => store.gold);
const gameOver = computed(() => store.gameOver);
const soldierCost = 10;

const cityUpgrades = computed(() => {
  return store.availableUpgrades.filter((c) => c.kind === 'cityRevenueUpgrade');
});

const countrysideUpgrades = computed(() => {
  return store.availableUpgrades.filter((c) => c.kind === 'countrysideProduction');
});

const hasWallSlot = computed(() => {
  return store.zones.wall.some((slot) => slot.cardId === null);
});

const hasCitySlot = computed(() => {
  return store.zones.city.some((slot) => slot.cardId === null);
});

const hasCountrysideSlot = computed(() => {
  return store.zones.countryside.some((slot) => slot.cardId === null);
});

const recruitRef = ref();
const wallRef = ref();
const cityRef = ref();
const countrysideRef = ref();

function recruitSoldier(): void {
  const success = store.recruitUnit('Soldier', soldierCost);
  if (!success) {
    console.log('Failed to recruit soldier');
  }
}

function purchaseWallUpgrade(): void {
  store.purchaseWallUpgrade();
}

function purchaseCityUpgrade(cardId: string): void {
  store.purchaseCityUpgrade(cardId);
}

function purchaseCountrysideUpgrade(cardId: string): void {
  store.purchaseCountrysideUpgrade(cardId);
}

defineOptions({
  name: 'UnitShop',
});
</script>
