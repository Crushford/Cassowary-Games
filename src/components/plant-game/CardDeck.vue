<template>
  <div class="flex flex-wrap gap-4 justify-center">
    <div v-for="color in plantStore.availableColors" :key="color" class="relative group">
      <!-- Card Stack -->
      <div
        class="relative cursor-pointer transition-transform hover:scale-105 w-16 h-16"
        :class="{
          'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900':
            plantStore.selectedCard?.color === color,
        }"
        @click="selectCard(color)"
      >
        <!-- Card Stack Effect -->
        <div class="relative w-full h-full">
          <!-- Background cards for stack effect -->
          <div
            v-for="i in 3"
            :key="i"
            class="absolute w-12 h-12 bg-white rounded-md border border-gray-300 shadow-sm"
            :style="{
              transform: `translateY(${(i - 1) * 1.5}px) translateX(${(i - 1) * 0.5}px)`,
              zIndex: 10 - i,
            }"
          >
            <img
              :src="`/assets/ant-nest-colors/${color}.png`"
              :alt="`${color} card`"
              class="w-full h-full object-cover rounded-md"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlantStore } from '../../stores/plantStore';

const plantStore = usePlantStore();

const selectCard = (color: string) => {
  plantStore.selectCard(color);
};
</script>
