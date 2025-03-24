<template>
  <div
    class="aspect-square w-full cursor-pointer rounded-lg border-2 transition-colors duration-200"
    :class="[
      props.squareState === 'empty' && 'border-surface',
      props.squareState === 'flag' && 'border-primary',
      props.squareState === 'queen' && 'border-secondary',
      props.squareState === 'invalid' && 'border-secondary',
      props.groupColor && `bg-group-${props.groupColor}-900`,
    ]"
    @click="$emit('click')"
  >
    <div class="flex h-full items-center justify-center text-2xl">
      <span v-if="props.squareState === 'flag'">🚩</span>
      <span v-else-if="props.squareState === 'queen'">👑</span>
      <span v-else-if="props.squareState === 'invalid'">❌</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SquareProps {
  squareState: 'empty' | 'flag' | 'queen' | 'invalid';
  groupColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
}

const props = defineProps<SquareProps>();
defineEmits<{
  (e: 'click'): void;
}>();
</script>
