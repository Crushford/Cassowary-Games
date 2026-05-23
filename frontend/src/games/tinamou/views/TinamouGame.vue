<template>
  <AdventureGame :store="store" :backgrounds="backgrounds">
    <template #scene-background="{ sceneId }">

      <!-- Museum Gallery 4 -->
      <template v-if="sceneId === 'museum-gallery-4'">
        <div class="absolute top-0 left-0 right-0 pointer-events-none" style="height: 9%; background: linear-gradient(180deg, #e8d8b0 0%, transparent 100%);" />
        <div class="absolute top-[1.5%] left-1/2 -translate-x-1/2 pointer-events-none tracking-widest uppercase text-amber-200/35" style="font-size: clamp(5px, 0.85vw, 10px);">Gallery IV — First Basin Civilisation</div>
        <div class="absolute left-0 right-0 pointer-events-none" style="top: 64%; height: 1.5%; background: rgba(140,90,30,0.3);" />
        <div class="absolute left-0 right-0 pointer-events-none" style="top: 72%; height: 1.2%; background: rgba(100,65,20,0.5);" />
        <div class="absolute bottom-0 left-0 right-0 pointer-events-none" style="height: 28%; background: linear-gradient(180deg, #5a3d22 0%, #3a2510 100%); border-top: 1px solid rgba(160,100,30,0.35);" />
        <div class="absolute top-0 bottom-0 left-0 w-[3%] pointer-events-none" style="background: linear-gradient(90deg, rgba(0,0,0,0.25) 0%, transparent 100%);" />
        <div class="absolute top-0 bottom-0 right-0 w-[3%] pointer-events-none" style="background: linear-gradient(270deg, rgba(0,0,0,0.25) 0%, transparent 100%);" />
        <div class="absolute left-[20%] right-[20%] pointer-events-none" style="top: 0; height: 4%; background: radial-gradient(ellipse at 50% 0%, rgba(255,240,200,0.25) 0%, transparent 100%);" />
      </template>

      <!-- Maintenance Corridor -->
      <template v-else-if="sceneId === 'maintenance-corridor'">
        <!-- Ceiling drip stains -->
        <div class="absolute top-0 left-0 right-0 pointer-events-none" style="height: 30%; background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);" />
        <!-- Pipe band across the top -->
        <div class="absolute left-0 right-0 pointer-events-none" style="top: 8%; height: 18%; background: rgba(60,40,20,0.5); border-top: 1px solid rgba(100,70,30,0.4); border-bottom: 1px solid rgba(100,70,30,0.3);" />
        <!-- Pipe shapes (horizontal lines) -->
        <div class="absolute left-[5%] right-[5%] pointer-events-none" style="top: 11%; height: 3%; background: rgba(80,55,25,0.7); border-radius: 2px;" />
        <div class="absolute left-[5%] right-[5%] pointer-events-none" style="top: 17%; height: 2%; background: rgba(70,45,20,0.6); border-radius: 2px;" />
        <!-- Damp patches on walls -->
        <div class="absolute left-0 pointer-events-none" style="top: 30%; width: 8%; height: 25%; background: radial-gradient(ellipse at 0% 50%, rgba(30,20,10,0.4) 0%, transparent 70%);" />
        <div class="absolute right-0 pointer-events-none" style="top: 45%; width: 6%; height: 20%; background: radial-gradient(ellipse at 100% 50%, rgba(30,20,10,0.35) 0%, transparent 70%);" />
        <!-- Floor -->
        <div class="absolute bottom-0 left-0 right-0 pointer-events-none" style="height: 20%; background: linear-gradient(180deg, #1a1008 0%, #0d0805 100%); border-top: 1px solid rgba(80,50,15,0.3);" />
        <!-- Staff access label at top -->
        <div class="absolute top-[1.5%] left-1/2 -translate-x-1/2 pointer-events-none tracking-widest uppercase" style="font-size: clamp(5px, 0.85vw, 10px); color: rgba(160,120,60,0.3);">Staff Access Only — B. Yarrow</div>
        <!-- Left and right wall shadows -->
        <div class="absolute top-0 bottom-0 left-0 w-[4%] pointer-events-none" style="background: linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 100%);" />
        <div class="absolute top-0 bottom-0 right-0 w-[4%] pointer-events-none" style="background: linear-gradient(270deg, rgba(0,0,0,0.5) 0%, transparent 100%);" />
      </template>

    </template>
  </AdventureGame>
</template>

<script setup lang="ts">
import AdventureGame from '@/games/adventure/components/AdventureGame.vue'
import { useTinamouAdventureStore } from '../stores/tinamouAdventureStore'

const store = useTinamouAdventureStore()

const backgrounds: Record<string, string> = {
  'museum-gallery-4': `linear-gradient(
    180deg,
    #d4c49a 0%,
    #c8b07a 30%,
    #b89060 48%,
    #a07848 62%,
    #7a5c38 74%,
    #3d2a18 100%
  )`,
  'maintenance-corridor': `linear-gradient(
    180deg,
    #0e0b07 0%,
    #1a1208 25%,
    #221608 50%,
    #1a1208 72%,
    #100b05 100%
  )`,
}

defineOptions({ name: 'TinamouGame' })
</script>
