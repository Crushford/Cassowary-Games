<template>
  <div
    v-if="isVisible"
    class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[60] p-4"
    @click="$emit('close')"
  >
    <div
      class="bg-gray-800 p-8 rounded-lg shadow-xl transform transition-all duration-500 scale-100 max-w-md w-full mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
      @click.stop
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isVisible) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<script lang="ts">
export default {
  name: 'Modal',
};
</script>
