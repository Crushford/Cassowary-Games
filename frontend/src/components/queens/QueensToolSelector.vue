<template>
  <div
    id="queens-tool-selector"
    class="flex items-center justify-center p-1 relative gap-3 transition-opacity duration-200"
    :class="[
      props.embedded
        ? 'bg-transparent border-0 p-0'
        : 'rounded-xl border border-semantic-neutral-700 bg-surface-overlay',
      isDisabled ? 'opacity-50 grayscale pointer-events-none z-30' : 'z-50',
      {
        'z-50': queensStore.isTutorialMode && queensStore.highlightToolSelector,
      },
    ]"
  >
    <div
      class="flex items-center gap-1 rounded-lg p-1"
      :class="
        props.embedded
          ? 'border border-edge-neutralStrong bg-surface-overlaySoft'
          : 'border border-semantic-neutral-700 bg-surface-overlay'
      "
    >
      <Button
        v-for="mode in modes"
        :id="`queens-tool-${mode.value}`"
        :key="mode.value"
        type="button"
        class="h-12 rounded-md border"
        :class="[
          queensStore.uiState.placementMode === mode.value
            ? '!border-semantic-info-600 !bg-semantic-info-700 !text-semantic-info-100'
            : '!border-semantic-neutral-700 !bg-semantic-neutral-800 !text-semantic-neutral-300 hover:!border-semantic-neutral-600 hover:!bg-semantic-neutral-700',
          {
            'ring-2 ring-semantic-warning-500 ring-offset-1 ring-offset-semantic-neutral-900 animate-pulse':
              isTutorialTarget(mode.value),
          },
        ]"
        :disabled="isDisabled"
        :aria-pressed="queensStore.uiState.placementMode === mode.value"
        :aria-label="`${mode.label} mode: ${mode.description}`"
        :aria-describedby="
          queensStore.isTutorialMode &&
          mode.value === 'queen' &&
          queensStore.uiState.placementMode !== 'queen'
            ? 'tutorial-instruction'
            : undefined
        "
        @click="selectMode(mode.value)"
      >
        <span class="text-lg leading-none" aria-hidden="true">{{ mode.icon }}</span>
      </Button>
    </div>

    <div v-if="props.showAutoFlagToggle" class="h-10 border-l border-semantic-neutral-500"></div>

    <div
      v-if="props.showAutoFlagToggle"
      class="flex items-center gap-2 rounded-lg border border-edge-neutralMuted bg-semantic-neutral-900 px-2 py-1"
    >
      <span class="text-sm font-semibold text-semantic-neutral-300">auto-flag</span>
      <ToggleSwitch
        id="auto-flagging-toggle"
        v-model="autoFlagging"
        class="[--p-toggleswitch-width:2.55rem] [--p-toggleswitch-height:1.45rem]"
        :disabled="isDisabled"
        aria-label="Toggle auto-flagging"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import { useQueensStore } from '../../stores/queensStore';

const props = withDefaults(
  defineProps<{
    isDisabled?: boolean;
    hideAutoMode?: boolean;
    showAutoFlagToggle?: boolean;
    embedded?: boolean;
  }>(),
  {
    isDisabled: false,
    hideAutoMode: false,
    showAutoFlagToggle: true,
    embedded: false,
  }
);

const queensStore = useQueensStore();

const isDisabled = computed(() => {
  // Don't disable during tutorial when highlighting tool selector
  if (queensStore.isTutorialMode && queensStore.highlightToolSelector) {
    return false;
  }
  return props.isDisabled;
});

const allModes = [
  {
    value: 'auto' as const,
    label: 'Auto',
    icon: 'A',
    description: 'First click flags, second click places queen',
  },
  {
    value: 'flag' as const,
    label: 'Flag',
    icon: '⚑',
    description: 'Place or remove flag',
  },
  {
    value: 'queen' as const,
    label: 'Queen',
    icon: '♛',
    description: 'Place or remove queen directly',
  },
];

const modes = computed(() => {
  if (props.hideAutoMode) {
    return allModes.filter((mode) => mode.value !== 'auto');
  }
  return allModes;
});

function isTutorialTarget(modeValue: string): boolean {
  if (!queensStore.isTutorialMode) return false;
  if (!queensStore.highlightToolSelector) return false;
  return modeValue === 'queen';
}

function selectMode(modeValue: 'auto' | 'flag' | 'queen') {
  if (isDisabled.value) return;
  queensStore.setPlacementMode(modeValue);
}

const autoFlagging = computed({
  get: () => queensStore.uiState.autoFlagging,
  set: (value) => {
    if (isDisabled.value) return;
    queensStore.setAutoFlagging(Boolean(value));
  },
});
</script>

<script lang="ts">
export default {
  name: 'QueensToolSelector',
};
</script>
