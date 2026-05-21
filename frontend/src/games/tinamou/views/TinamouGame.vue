<template>
  <AdventureGame :store="store" :background-css="sceneBg">
    <template #scene-background>
      <!-- Museum Gallery 4 background layers -->
      <div class="absolute top-0 left-0 right-0 pointer-events-none" style="height: 9%; background: linear-gradient(180deg, #e8d8b0 0%, transparent 100%);" />
      <div class="absolute top-[1.5%] left-1/2 -translate-x-1/2 pointer-events-none tracking-widest uppercase text-amber-200/35" style="font-size: clamp(5px, 0.85vw, 10px);">Gallery IV — First Basin Civilisation</div>
      <div class="absolute left-0 right-0 pointer-events-none" style="top: 64%; height: 1.5%; background: rgba(140,90,30,0.3);" />
      <div class="absolute left-0 right-0 pointer-events-none" style="top: 72%; height: 1.2%; background: rgba(100,65,20,0.5);" />
      <div class="absolute bottom-0 left-0 right-0 pointer-events-none" style="height: 28%; background: linear-gradient(180deg, #5a3d22 0%, #3a2510 100%); border-top: 1px solid rgba(160,100,30,0.35);" />
      <div class="absolute top-0 bottom-0 left-0 w-[3%] pointer-events-none" style="background: linear-gradient(90deg, rgba(0,0,0,0.25) 0%, transparent 100%);" />
      <div class="absolute top-0 bottom-0 right-0 w-[3%] pointer-events-none" style="background: linear-gradient(270deg, rgba(0,0,0,0.25) 0%, transparent 100%);" />
      <div class="absolute left-[20%] right-[20%] pointer-events-none" style="top: 0; height: 4%; background: radial-gradient(ellipse at 50% 0%, rgba(255,240,200,0.25) 0%, transparent 100%);" />
    </template>
  </AdventureGame>
</template>

<script setup lang="ts">
import AdventureGame from '@/games/adventure/components/AdventureGame.vue'
import { useTinamouAdventureStore } from '../stores/tinamouAdventureStore'

const store = useTinamouAdventureStore()

const sceneBg = `linear-gradient(
  180deg,
  #d4c49a 0%,
  #c8b07a 30%,
  #b89060 48%,
  #a07848 62%,
  #7a5c38 74%,
  #3d2a18 100%
)`

defineOptions({ name: 'TinamouGame' })
</script>
