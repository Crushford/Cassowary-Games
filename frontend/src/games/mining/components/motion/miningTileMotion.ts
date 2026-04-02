export const AUTO_FLAG_STAGGER_MS = 30;
export const AUTO_FLAG_DURATION_MS = 240;
export const GOLD_FOUND_DURATION_MS = 520;
export const EMPTY_FOUND_DURATION_MS = 320;

type MotionVariantMap = Record<string, any>;

export function getAutoFlagIconVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }

  return {
    hidden: { scale: 0.8, opacity: 0, filter: 'drop-shadow(0 0 0 rgba(253, 224, 71, 0))' },
    visible: {
      scale: 1,
      opacity: 1,
      filter: 'drop-shadow(0 0 10px rgba(253, 224, 71, 0.6))',
      transition: {
        type: 'spring',
        stiffness: 480,
        damping: 26,
        mass: 0.7,
      },
    },
    exit: {
      scale: 0.96,
      opacity: 0,
      filter: 'drop-shadow(0 0 0 rgba(253, 224, 71, 0))',
      transition: { duration: 0.14 },
    },
  };
}

export function getAutoFlagRippleVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 0.2, transition: { duration: 0.08 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }

  return {
    hidden: { scale: 0.5, opacity: 0.35 },
    visible: {
      scale: 1.15,
      opacity: 0,
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
    },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  };
}

export function getGoldIconVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.14 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }

  return {
    hidden: { scale: 0.78, opacity: 0.8, y: 5, rotate: -10 },
    visible: {
      scale: [0.78, 1.16, 0.98, 1],
      opacity: 1,
      y: [5, -8, 1, 0],
      rotate: [-10, 8, -4, 0],
      transition: {
        duration: 0.46,
        times: [0, 0.42, 0.72, 1],
        ease: [0.18, 0.89, 0.32, 1.24],
      },
    },
    exit: { opacity: 0, transition: { duration: 0.12 } },
  };
}

export function getGoldBurstVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 0.18, transition: { duration: 0.08 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }

  return {
    hidden: {
      scale: 0.5,
      opacity: 0.22,
      boxShadow: 'inset 0 0 0 9999px rgba(255, 244, 180, 0.18)',
    },
    visible: {
      scale: 1.18,
      opacity: 0,
      boxShadow: 'inset 0 0 0 9999px rgba(255, 244, 180, 0)',
      transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
    },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  };
}

export function getGoldSparkVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 0 },
      exit: { opacity: 0 },
    };
  }

  return {
    hidden: { y: 6, scale: 0.4, rotate: -18, opacity: 0 },
    visible: {
      y: -12,
      scale: 1.2,
      rotate: 14,
      opacity: [0, 1, 0],
      transition: {
        duration: 0.5,
        times: [0, 0.35, 1],
        ease: 'easeOut',
      },
    },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  };
}

export function getEmptyValueVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }

  return {
    hidden: { opacity: 0.7, y: -3, scale: 1.05 },
    visible: {
      opacity: 1,
      y: [-3, 4, -1, 0],
      scale: [1.05, 0.9, 1.02, 1],
      transition: {
        duration: 0.34,
        times: [0, 0.45, 0.72, 1],
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  };
}

export function getEmptyPuffVariants(prefersReducedMotion: boolean): MotionVariantMap {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 0.15, transition: { duration: 0.08 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }

  return {
    hidden: { scale: 0.45, opacity: 0 },
    visible: {
      scale: 1.25,
      opacity: [0, 0.45, 0],
      transition: {
        duration: 0.32,
        times: [0, 0.35, 1],
        ease: 'easeOut',
      },
    },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  };
}
