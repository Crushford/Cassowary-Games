<template>
  <div>
    <div
      role="region"
      aria-labelledby="rules-title"
      class="w-full max-h-full bg-[#0f3b2e] border-[1.5px] border-[#d4af37] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] px-4 py-2 transition-all duration-120 ease-out transform scale-100 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 overflow-y-auto"
    >
      <!-- Title row -->
      <div class="flex justify-between items-center mb-2">
        <h2
          id="rules-title"
          class="text-[#f2f1ea] text-opacity-90 font-semibold tracking-wider text-shadow-[0_1px_0_rgba(0,0,0,0.35)]"
        >
          The rules of this table:
        </h2>
        <button
          @click="globalStore.setShowRules(true)"
          class="px-3 py-1 bg-[#d4af37] hover:bg-[#e6c766] text-[#131313] font-semibold rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 focus:ring-offset-[#0f3b2e]"
          aria-label="Open full rules"
        >
          <span class="inline-block mr-1 text-xs">ℹ︎</span>
          Full Rules
        </button>
      </div>

      <!-- Rules list with inline icons -->
      <ul class="space-y-1 mb-2">
        <li class="text-[#f2f1ea] text-opacity-90 text-shadow-[0_1px_0_rgba(0,0,0,0.35)] text-sm">
          There is only 1
          <span class="inline-flex items-center mx-1">
            <img src="/assets/card-backs/honey.png" alt="honeypot" class="w-5 h-5" />
          </span>
          honeypot per column.
        </li>
        <li class="text-[#f2f1ea] text-opacity-90 text-shadow-[0_1px_0_rgba(0,0,0,0.35)] text-sm">
          There is only 1
          <span class="inline-flex items-center mx-1">
            <img src="/assets/card-backs/honey.png" alt="honeypot" class="w-5 h-5" />
          </span>
          honeypot per row.
        </li>
        <li class="text-[#f2f1ea] text-opacity-90 text-shadow-[0_1px_0_rgba(0,0,0,0.35)] text-sm">
          There is only 1
          <span class="inline-flex items-center mx-1">
            <img src="/assets/card-backs/honey.png" alt="honeypot" class="w-5 h-5" />
          </span>
          honeypot per color group.
        </li>
        <li class="text-[#f2f1ea] text-opacity-90 text-shadow-[0_1px_0_rgba(0,0,0,0.35)] text-sm">
          <span class="inline-flex items-center mx-1">
            <img src="/assets/card-backs/honey.png" alt="honeypot" class="w-5 h-5" />
          </span>
          honeypot's never touch diagonally.
        </li>
      </ul>

      <!-- Payout row -->
      <div class="flex flex-row gap-2 justify-center">
        <!-- Loss capsule -->
        <div
          class="flex items-center justify-center px-3 py-2 bg-[#4a1111] border border-[#a33] rounded-full"
        >
          <img src="/assets/card-backs/ant.png" alt="ant" class="w-8 h-8 mr-4" />
          <span class="text-red-300 font-semibold">–{{ tablePayouts.ant }} gold</span>
        </div>

        <!-- Win capsule -->
        <div
          class="flex items-center justify-center px-3 py-2 bg-[#144b1a] border border-[#2d8b3a] rounded-full"
        >
          <img src="/assets/card-backs/honey.png" alt="honeypot" class="w-8 h-8 mr-4" />
          <span class="text-green-300 font-semibold">+{{ tablePayouts.honeypot }} gold</span>
        </div>
      </div>

      <!-- Max payout info -->
      <div
        v-if="tableStore.maxPayout > 0"
        class="mt-2 pt-2 border-t border-[#d4af37] border-opacity-30"
      >
        <div
          class="text-[#f2f1ea] text-opacity-90 text-shadow-[0_1px_0_rgba(0,0,0,0.35)] text-center mb-2"
        >
          Max you can win at this table:
          <span class="text-yellow-300 font-semibold">{{ tableStore.maxPayout }}</span>
        </div>

        <!-- Progress bar -->
        <div
          v-if="roundStore.tableId && globalStore.tablesProgress[roundStore.tableId]"
          class="space-y-1"
        >
          <div class="flex justify-between text-xs text-[#f2f1ea] text-opacity-80">
            <span>Progress:</span>
            <span
              class="font-semibold"
              :class="currentProgress < 0 ? 'text-red-300' : 'text-yellow-300'"
            >
              {{ currentProgress }} / {{ tableStore.maxPayout }}
            </span>
          </div>
          <div
            class="w-full bg-[#0f3b2e] border border-[#d4af37] border-opacity-30 rounded-full h-2"
          >
            <div
              class="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              :style="{
                width: `${Math.max(0, Math.min(100, (currentProgress / tableStore.maxPayout) * 100))}%`,
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGlobalStore } from '../../stores/global';
import { useTableStore } from '../../stores/table';
import { useRoundStore } from '../../stores/round';

const globalStore = useGlobalStore();
const tableStore = useTableStore();
const roundStore = useRoundStore();

const tablePayouts = computed(() => {
  const table = tableStore.getTable(roundStore.tableId!);
  const multiplier = table?.payoutMultiplier ?? 1.0;
  return {
    honeypot: Math.round(globalStore.config.payoutPerHoneypot * multiplier),
    ant: Math.round(globalStore.config.penaltyPerAnt * multiplier),
  };
});

const currentProgress = computed(() => {
  if (!roundStore.tableId) return 0;
  return globalStore.tablesProgress[roundStore.tableId]?.totalProfit ?? 0;
});

defineOptions({
  name: 'RulesPlaque',
});
</script>

<style scoped>
/* Custom text shadow for embossed effect */
.text-shadow-\[0_1px_0_rgba\(0\,0\,0\,0\.35\)\] {
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
}

/* Custom shadow for plaque */
.shadow-\[0_8px_24px_rgba\(0\,0\,0\,0\.35\)\] {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

/* Custom transition duration */
.duration-120 {
  transition-duration: 120ms;
}

/* Custom scale transform */
.scale-\[1\.02\] {
  transform: scale(1.02);
}

/* Motion reduction */
.motion-reduce\:transition-none {
  transition: none;
}

.motion-reduce\:hover\:scale-100:hover {
  transform: scale(1);
}
</style>
