<template>
  <SharedPatternPreview
    :size="card.size"
    :cells="card.cells"
    :output-flags="card.outputFlags"
    cell-size-class="h-7 w-7"
  />
</template>

<script setup lang="ts">
import type { PatternCardDefinition } from '../../utils/incrementalPatternCards';
import SharedPatternPreview from './SharedPatternPreview.vue';

const props = defineProps<{
  card: PatternCardDefinition;
}>();
</script>

<script lang="ts">
export default {
  name: 'PatternCardPreview',
};
</script>
