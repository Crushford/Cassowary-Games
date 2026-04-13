<template>
  <div :class="containerClass">
    <Button
      label="Main Menu"
      unstyled
      class="rounded-xl border px-2 py-2 text-[11px] font-semibold leading-tight shadow-none transition-colors duration-150 active:translate-y-px border-semantic-warning-700 bg-feedback-warningSubtle text-semantic-warning-100 enabled:hover:border-semantic-warning-600 enabled:hover:bg-feedback-warningSoft"
      @click="queensStore.navigateToMainMenu"
    />
    <Button
      v-if="!queensStore.isCampaignMode"
      label="Select Puzzle Variation"
      unstyled
      class="rounded-xl border px-2 py-2 text-[11px] font-semibold leading-tight shadow-none transition-colors duration-150 active:translate-y-px border-semantic-neutral-500 bg-semantic-neutral-700 text-white enabled:hover:border-semantic-neutral-400 enabled:hover:bg-semantic-neutral-600"
      @click="queensStore.navigateToPuzzleVariationSelection"
    />
    <Button
      label="Copy Link to Puzzle"
      unstyled
      class="rounded-xl border px-2 py-2 text-[11px] font-semibold leading-tight shadow-none transition-colors duration-150 active:translate-y-px border-semantic-info-700 bg-feedback-infoFaint text-semantic-info-100 enabled:hover:border-semantic-info-600 enabled:hover:bg-feedback-infoSoft"
      @click="queensStore.copyCurrentPuzzleLink"
    />
    <Button
      :label="nextActionLabel"
      unstyled
      class="rounded-xl border px-2 py-2 text-[11px] font-semibold leading-tight shadow-none transition-colors duration-150 active:translate-y-px border-semantic-success-700 bg-feedback-successSubtle text-semantic-success-100 enabled:hover:border-semantic-success-600 enabled:hover:bg-feedback-successSoft"
      @click="queensStore.startNextPuzzle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useQueensStore } from '../../stores/queensStore';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  }
);

const queensStore = useQueensStore();

const containerClass = computed(() => {
  if (props.compact) {
    return queensStore.isCampaignMode ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-4 gap-2';
  }
  return queensStore.isCampaignMode ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'grid grid-cols-2 gap-2 sm:grid-cols-4';
});

const nextActionLabel = computed(() => {
  if (!queensStore.isCampaignMode) {
    return 'Next Puzzle';
  }
  if (queensStore.hasPassedCurrentCampaignLevel && !queensStore.nextCampaignBucket) {
    return 'Story Map';
  }
  return queensStore.hasPassedCurrentCampaignLevel ? 'Next Level' : 'Try Again';
});

defineOptions({ name: 'QueensActionMenu' });
</script>
