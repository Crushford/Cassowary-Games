<template>
  <div
    v-if="isVisible"
    class="absolute inset-0 z-40"
    :aria-hidden="true"
    role="presentation"
    style="pointer-events: auto"
    @click="handleOverlayClick"
  >
    <!-- Dark overlay covering everything -->
    <div class="absolute inset-0 bg-black bg-opacity-75 transition-opacity duration-300" />

    <!-- Highlight cutout for the Queen button - this area allows clicks through -->
    <div
      v-if="highlightToolSelector"
      ref="highlightRef"
      class="absolute rounded-lg transition-all duration-300"
      style="pointer-events: none; z-index: 41"
    >
      <!-- Glow effect around the highlighted element -->
      <div
        class="absolute inset-0 rounded-lg ring-4 ring-yellow-400 ring-offset-4 ring-offset-black animate-pulse"
        style="box-shadow: 0 0 30px rgba(250, 204, 21, 0.8)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

interface Props {
  isVisible: boolean;
  highlightToolSelector?: boolean;
  highlightElementId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: false,
  highlightToolSelector: false,
  highlightElementId: undefined,
});

const highlightRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let animationFrame: number | null = null;

function handleOverlayClick(event: MouseEvent) {
  // Check if the click is on the Queen button
  const queenButton = document.getElementById('queens-tool-queen');
  if (queenButton && queenButton.contains(event.target as Node)) {
    // Allow the click to pass through to the button
    return;
  }

  // Block clicks everywhere else
  event.stopPropagation();
  event.preventDefault();
}

function updateHighlightPosition() {
  if (!props.highlightToolSelector || !highlightRef.value) return;

  // Cancel any pending animation frame
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
  }

  animationFrame = requestAnimationFrame(() => {
    const queenButton = document.getElementById('queens-tool-queen');
    if (queenButton && highlightRef.value) {
      const rect = queenButton.getBoundingClientRect();
      const container = queenButton.closest('.relative');
      const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };

      // Position the highlight relative to the container
      highlightRef.value.style.width = `${rect.width + 16}px`;
      highlightRef.value.style.height = `${rect.height + 16}px`;
      highlightRef.value.style.left = `${rect.left - containerRect.left - 8}px`;
      highlightRef.value.style.top = `${rect.top - containerRect.top - 8}px`;
    }
  });
}

onMounted(() => {
  if (props.highlightToolSelector) {
    nextTick(() => {
      updateHighlightPosition();

      // Set up resize observer
      resizeObserver = new ResizeObserver(() => {
        updateHighlightPosition();
      });

      const toolSelector = document.getElementById('queens-tool-selector');
      if (toolSelector) {
        resizeObserver.observe(toolSelector);
      }

      // Also listen to window resize
      window.addEventListener('resize', updateHighlightPosition);
      window.addEventListener('scroll', updateHighlightPosition, true);
    });
  }
});

watch(
  () => [props.highlightToolSelector, props.isVisible],
  ([newHighlight, newVisible]) => {
    if (newHighlight && newVisible) {
      nextTick(() => {
        updateHighlightPosition();
      });
    }
  }
);

onBeforeUnmount(() => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', updateHighlightPosition);
  window.removeEventListener('scroll', updateHighlightPosition, true);
});
</script>

<script lang="ts">
export default {
  name: 'TutorialOverlay',
};
</script>
