import { ref, watch } from 'vue';
import type { WatchSource } from 'vue';

/**
 * Manages the 3D card-flip animation state for puzzle squares.
 * Triggers a 600ms flip when the mark transitions to 'queen' or 'invalid'.
 *
 * @param markGetter - reactive getter returning the current cell mark
 */
export function useCardFlipAnimation(markGetter: WatchSource<string | null | undefined>) {
  const shouldFlip = ref(false);
  const isFlipping = ref(false);

  watch(
    markGetter,
    (newMark) => {
      if (newMark === 'queen' || newMark === 'invalid') {
        shouldFlip.value = true;
        isFlipping.value = true;

        // Swap the card image at the midpoint of the animation
        setTimeout(() => {
          isFlipping.value = false;
        }, 300);

        // Reset flip state after animation completes
        setTimeout(() => {
          shouldFlip.value = false;
        }, 600);
      }
    },
    { immediate: false }
  );

  return { shouldFlip, isFlipping };
}
