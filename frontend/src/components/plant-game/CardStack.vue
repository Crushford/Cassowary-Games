<template>
  <div class="relative group">
    <!-- Card Stack -->
    <div
      class="relative cursor-pointer transition-transform hover:scale-105 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16"
      :class="{
        'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900': isSelected,
      }"
      @click="handleClick"
    >
      <!-- Card Stack Effect -->
      <div class="relative w-full h-full">
        <!-- Background cards for stack effect -->
        <div
          v-for="i in 3"
          :key="i"
          class="absolute rounded-md border border-gray-300 shadow-sm"
          :style="{
            transform: `translateY(${(i - 1) * 1.5}px) translateX(${(i - 1) * 0.5}px)`,
            zIndex: 10 - i,
          }"
        >
          <img :src="imageSrc" :alt="altText" class="w-full h-full object-cover rounded-md" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  imageSrc: string;
  altText: string;
  isSelected: boolean;
}

interface Emits {
  (e: 'select'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleClick = () => {
  emit('select');
};
</script>

<script lang="ts">
export default {
  name: 'CardStack',
};
</script>
