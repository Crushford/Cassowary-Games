<template>
  <!-- KenoHeader -->
  <div class="space-y-1 mb-3 max-w-md">
    <!-- summary row -->
    <div class="flex items-center justify-between text-sm">
      <div>
        Turn <span class="font-semibold">{{ turn }}/5</span>
      </div>
      <div>
        Food <span class="font-semibold" aria-live="polite">{{ food }}</span>
      </div>
      <div>
        Cassowaries <span class="font-semibold" aria-live="polite">{{ cassowaries }}</span>
      </div>
      <div>
        Selected <span class="font-semibold">{{ g }}/{{ requiredSelections }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useKenoStore } from '@/games/keno/stores/kenoStore';

const store = useKenoStore();
const turn = computed(() => store.currentTurn);
const food = computed(() => store.food);
const cassowaries = computed(() => store.cassowaries);
const g = computed(() => store.selectedSquares.size);
const requiredSelections = computed(() => {
  if (store.selectedAction === 'forage') return 5;
  if (store.selectedAction === 'nest' || store.selectedAction === 'hunt') return 1;
  return 0;
});
</script>
