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
          The rules of this farm:
        </h2>
        <button
          class="px-3 py-1 bg-[#d4af37] hover:bg-[#e6c766] text-[#131313] font-semibold rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 focus:ring-offset-[#0f3b2e]"
          aria-label="Open full rules"
          @click="globalStore.setShowRules(true)"
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
          <span class="text-red-300 font-semibold">–{{ levelPayouts.ant }} gold</span>
        </div>

        <!-- Win capsule -->
        <div
          class="flex items-center justify-center px-3 py-2 bg-[#144b1a] border border-[#2d8b3a] rounded-full"
        >
          <img src="/assets/card-backs/honey.png" alt="honeypot" class="w-8 h-8 mr-4" />
          <span class="text-green-300 font-semibold">+{{ levelPayouts.honeypot }} gold</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGlobalStore } from '../../stores/global';
import { useLevelStore } from '../../stores/level';
import { useRoundStore } from '../../stores/round';

const globalStore = useGlobalStore();
const levelStore = useLevelStore();
const roundStore = useRoundStore();

const levelPayouts = computed(() => {
  const level = roundStore.boardSize ? levelStore.getLevel(roundStore.boardSize) : undefined;
  const multiplier = level?.payoutMultiplier ?? 1.0;
  return {
    honeypot: Math.round(globalStore.config.payoutPerHoneypot * multiplier),
    ant: Math.round(globalStore.config.penaltyPerAnt * multiplier),
  };
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
