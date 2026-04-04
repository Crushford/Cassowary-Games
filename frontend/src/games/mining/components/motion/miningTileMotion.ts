export const AUTO_FLAG_STAGGER_MS = 30;
export const AUTO_FLAG_DURATION_MS = 240;
export const GOLD_FOUND_DURATION_MS = 520;
export const EMPTY_FOUND_DURATION_MS = 320;

export interface MiningTileAnimationStep {
  element: HTMLElement | null;
  keyframes: Record<string, unknown>;
  options: Record<string, unknown>;
}

export function getAutoFlagAnimationSteps(
  prefersReducedMotion: boolean,
  delaySeconds: number,
  elements: {
    icon: HTMLElement | null;
    flash: HTMLElement | null;
    ripple: HTMLElement | null;
  }
): MiningTileAnimationStep[] {
  if (prefersReducedMotion) {
    return [
      {
        element: elements.icon,
        keyframes: { opacity: [0, 1] },
        options: { duration: 0.12, delay: delaySeconds },
      },
      {
        element: elements.flash,
        keyframes: { opacity: [0, 0.18, 0] },
        options: { duration: 0.12, delay: delaySeconds },
      },
    ];
  }

  return [
    {
      element: elements.icon,
      keyframes: {
        opacity: [0, 1],
        scale: [0.8, 1.08, 1],
        filter: [
          'drop-shadow(0 0 0 rgba(253, 224, 71, 0))',
          'drop-shadow(0 0 10px rgba(253, 224, 71, 0.6))',
        ],
      },
      options: {
        duration: 0.24,
        delay: delaySeconds,
        ease: 'easeOut',
      },
    },
    {
      element: elements.flash,
      keyframes: { opacity: [0, 0.2, 0] },
      options: {
        duration: 0.2,
        delay: delaySeconds,
        ease: 'easeOut',
      },
    },
    {
      element: elements.ripple,
      keyframes: { opacity: [0.35, 0], scale: [0.5, 1.15] },
      options: {
        duration: 0.28,
        delay: delaySeconds,
        ease: 'easeOut',
      },
    },
  ];
}

export function getGoldFoundAnimationSteps(
  prefersReducedMotion: boolean,
  elements: {
    icon: HTMLElement | null;
    burst: HTMLElement | null;
    innerRipple: HTMLElement | null;
    outerRipple: HTMLElement | null;
    sparkLeft: HTMLElement | null;
    sparkRight: HTMLElement | null;
  }
): MiningTileAnimationStep[] {
  if (prefersReducedMotion) {
    return [
      {
        element: elements.icon,
        keyframes: { opacity: [0, 1] },
        options: { duration: 0.12 },
      },
    ];
  }

  return [
    {
      element: elements.icon,
      keyframes: {
        opacity: [0.8, 1],
        scale: [0.78, 1.16, 0.98, 1],
        y: [5, -8, 1, 0],
        rotate: [-10, 8, -4, 0],
      },
      options: {
        duration: 0.46,
        times: [0, 0.42, 0.72, 1],
        ease: 'easeOut',
      },
    },
    {
      element: elements.burst,
      keyframes: { opacity: [0.22, 0], scale: [0.5, 1.18] },
      options: { duration: 0.36, ease: 'easeOut' },
    },
    {
      element: elements.innerRipple,
      keyframes: { opacity: [0.45, 0], scale: [0.6, 1.12] },
      options: { duration: 0.32, ease: 'easeOut' },
    },
    {
      element: elements.outerRipple,
      keyframes: { opacity: [0.35, 0], scale: [0.6, 1.12] },
      options: { duration: 0.42, delay: 0.04, ease: 'easeOut' },
    },
    {
      element: elements.sparkLeft,
      keyframes: {
        opacity: [0, 1, 0],
        y: [6, -12],
        scale: [0.4, 1.2],
        rotate: [-18, 14],
      },
      options: {
        duration: 0.5,
        times: [0, 0.35, 1],
        ease: 'easeOut',
      },
    },
    {
      element: elements.sparkRight,
      keyframes: {
        opacity: [0, 1, 0],
        y: [6, -12],
        scale: [0.4, 1.2],
        rotate: [-18, 14],
      },
      options: {
        duration: 0.5,
        delay: 0.05,
        times: [0, 0.35, 1],
        ease: 'easeOut',
      },
    },
  ];
}

export function getEmptyFoundAnimationSteps(
  prefersReducedMotion: boolean,
  elements: {
    value: HTMLElement | null;
    flash: HTMLElement | null;
    puffLeft: HTMLElement | null;
    puffRight: HTMLElement | null;
  }
): MiningTileAnimationStep[] {
  if (prefersReducedMotion) {
    return [
      {
        element: elements.value,
        keyframes: { opacity: [0, 1] },
        options: { duration: 0.12 },
      },
    ];
  }

  return [
    {
      element: elements.value,
      keyframes: {
        opacity: [0.7, 1],
        y: [-3, 4, -1, 0],
        scale: [1.05, 0.9, 1.02, 1],
      },
      options: {
        duration: 0.34,
        times: [0, 0.45, 0.72, 1],
        ease: 'easeOut',
      },
    },
    {
      element: elements.flash,
      keyframes: { opacity: [0, 0.15, 0] },
      options: { duration: 0.16, ease: 'easeOut' },
    },
    {
      element: elements.puffLeft,
      keyframes: { opacity: [0, 0.45, 0], scale: [0.45, 1.25] },
      options: {
        duration: 0.32,
        times: [0, 0.35, 1],
        ease: 'easeOut',
      },
    },
    {
      element: elements.puffRight,
      keyframes: { opacity: [0, 0.45, 0], scale: [0.45, 1.25] },
      options: {
        duration: 0.32,
        delay: 0.03,
        times: [0, 0.35, 1],
        ease: 'easeOut',
      },
    },
  ];
}
