<template>
  <div :class="containerClass">
    <Button
      v-for="action in visibleActions"
      :key="action.label"
      :label="action.label"
      unstyled
      class="rounded-xl border px-2 py-2 text-[11px] font-semibold leading-tight shadow-none transition-colors duration-150 active:translate-y-px"
      :class="action.class"
      :disabled="action.disabled"
      @click="action.onClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useQueensStore } from '../../stores/queensStore';
import type { QueensActionMenuAction } from './queensUiContracts';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    actions?: QueensActionMenuAction[] | null;
  }>(),
  {
    compact: false,
    actions: null,
  }
);

const queensStore = useQueensStore();
const defaultActions = computed<QueensActionMenuAction[]>(() => [
  {
    label: 'Main Menu',
    class:
      'border-semantic-warning-700 bg-feedback-warningSubtle text-semantic-warning-100 enabled:hover:border-semantic-warning-600 enabled:hover:bg-feedback-warningSoft',
    onClick: queensStore.navigateToMainMenu,
  },
  ...(!queensStore.isCampaignMode
    ? [
        {
          label: 'Select Puzzle Variation',
          class:
            'border-semantic-neutral-500 bg-semantic-neutral-700 text-white enabled:hover:border-semantic-neutral-400 enabled:hover:bg-semantic-neutral-600',
          onClick: queensStore.navigateToPuzzleVariationSelection,
        },
      ]
    : []),
  {
    label: 'Copy Link to Puzzle',
    class:
      'border-semantic-info-700 bg-feedback-infoFaint text-semantic-info-100 enabled:hover:border-semantic-info-600 enabled:hover:bg-feedback-infoSoft',
    onClick: queensStore.copyCurrentPuzzleLink,
  },
  {
    label: nextActionLabel.value,
    class:
      'border-semantic-success-700 bg-feedback-successSubtle text-semantic-success-100 enabled:hover:border-semantic-success-600 enabled:hover:bg-feedback-successSoft',
    onClick: queensStore.startNextPuzzle,
  },
]);

const containerClass = computed(() => {
  if (props.compact) {
    return queensStore.isCampaignMode ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-4 gap-2';
  }
  return queensStore.isCampaignMode
    ? 'grid grid-cols-1 gap-2 sm:grid-cols-3'
    : 'grid grid-cols-2 gap-2 sm:grid-cols-4';
});

const nextActionLabel = computed(() => {
  if (!queensStore.isCampaignMode) {
    return 'Next Puzzle';
  }
  if (queensStore.hasPassedCurrentCampaignLevel && !queensStore.nextCampaignBucket) {
    return 'Story Map';
  }
  return queensStore.hasPassedCurrentCampaignLevel
    ? 'Next Level'
    : 'Load a New Puzzle in This Level';
});

const visibleActions = computed(() => {
  const actions = props.actions ?? defaultActions.value;
  return actions.filter((action) => action.visible !== false);
});

defineOptions({ name: 'QueensActionMenu' });
</script>
