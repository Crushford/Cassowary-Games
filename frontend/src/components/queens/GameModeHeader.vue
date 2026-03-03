<template>
  <div class="p-3 rounded-lg" :class="bgClass">
    <div class="flex justify-between items-center mb-2">
      <slot name="label" />
      <slot name="stats" />
    </div>
    <div class="flex gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  color: 'yellow' | 'green';
}>();

const bgClass = computed(() =>
  props.color === 'yellow' ? 'bg-yellow-900 bg-opacity-50' : 'bg-green-900 bg-opacity-50'
);
</script>

<script lang="ts">
export default {
  name: 'GameModeHeader',
};
</script>
