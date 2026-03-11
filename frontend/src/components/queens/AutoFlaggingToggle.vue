<template>
  <div
    id="auto-flagging-toggle"
    class="rounded-xl border border-slate-700 bg-slate-900/90 flex items-center justify-center p-2 rounded-lg z-50"
  >
    <SelectButton
      v-model="autoFlagging"
      :options="options"
      option-label="label"
      option-value="value"
      class=""
      aria-label="Auto-flagging selector"
    >
      <template #option="slotProps">
        <span class="inline-flex items-center gap-1 text-sm font-semibold">
          <span class="text-base" :aria-hidden="true">{{ slotProps.option.icon }}</span>
          <span>{{ slotProps.option.label }}</span>
        </span>
      </template>
    </SelectButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SelectButton from 'primevue/selectbutton';
import { useQueensStore } from '../../stores/queensStore';

const queensStore = useQueensStore();

const options = [
  {
    value: true,
    label: 'On',
    icon: '✅',
    description: 'Automatically flag squares where queens cannot be placed',
  },
  {
    value: false,
    label: 'Off',
    icon: '❌',
    description: 'Do not automatically flag squares',
  },
];

function selectOption(value: boolean) {
  queensStore.setAutoFlagging(value);
}

const autoFlagging = computed({
  get: () => queensStore.uiState.autoFlagging,
  set: (value) => selectOption(Boolean(value)),
});
</script>

<script lang="ts">
export default {
  name: 'AutoFlaggingToggle',
};
</script>
