<template>
  <div class="relative min-h-[5.5rem] bg-black/30 rounded border border-amber-900/25 p-3 overflow-y-auto" style="max-height: 10rem;">
    <p v-if="displayedText" class="text-amber-100 text-sm leading-relaxed whitespace-pre-wrap">{{ displayedText }}</p>
    <p v-else class="text-amber-700/50 text-sm italic">Click on objects to examine them...</p>

    <!-- Skip / done indicator -->
    <button
      v-if="isAnimating"
      class="absolute bottom-2 right-2 text-amber-600/60 hover:text-amber-400 text-xs transition-colors"
      aria-label="Skip typewriter animation"
      @click="skipAnimation"
    >
      ▶▶
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  text: string | null
}>()

const displayedText = ref('')
const isAnimating = ref(false)
let interval: number | null = null
let fullText = ''

function skipAnimation() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  displayedText.value = fullText
  isAnimating.value = false
}

watch(
  () => props.text,
  (newText) => {
    if (!newText) {
      displayedText.value = ''
      isAnimating.value = false
      return
    }
    if (interval) clearInterval(interval)
    fullText = newText
    displayedText.value = ''
    isAnimating.value = true
    let i = 0
    interval = window.setInterval(() => {
      if (i < newText.length) {
        displayedText.value = newText.slice(0, i + 1)
        i++
      } else {
        clearInterval(interval!)
        interval = null
        isAnimating.value = false
      }
    }, 16)
  },
)

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
div {
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 120, 40, 0.3) transparent;
}
div::-webkit-scrollbar {
  width: 4px;
}
div::-webkit-scrollbar-thumb {
  background-color: rgba(180, 120, 40, 0.3);
  border-radius: 2px;
}
</style>
