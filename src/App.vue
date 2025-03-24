<template>
  <div class="min-h-screen bg-background">
    <nav class="bg-surface shadow-md">
      <div class="max-w-4xl mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <h1 class="text-xl font-bold text-text">Honey Pot Ant Farming</h1>
          <div class="flex gap-4">
            <router-link
              to="/"
              class="text-text hover:text-primary-hover"
              :class="{ 'font-bold': route.path === '/' }"
            >
              Game Mode
            </router-link>
            <router-link
              to="/builder"
              class="text-text hover:text-primary-hover"
              :class="{ 'font-bold': route.path === '/builder' }"
            >
              Level Builder
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<style>
/* Add any global styles here */
</style>
