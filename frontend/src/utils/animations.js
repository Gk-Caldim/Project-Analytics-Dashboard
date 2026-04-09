// Reusable Animation Variants for Global Page Entrance Motion System 
// Easing applied everywhere: cubic-bezier(0.23, 1, 0.32, 1)

export const EASE = [0.23, 1, 0.32, 1];

export const slideInLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3, // 300ms
      ease: EASE,
    },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26, // 260ms
      ease: EASE,
      delay: 0.1, // 100ms
    },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07, // 70ms difference between each to hit the requested stagger timings approx (150ms -> 220ms -> 290ms differences are 70ms)
      delayChildren: 0.08, // Initial delay to make the first child appear at 150ms (0.08s base + 0.07s first child stagger = 0.15s)
    },
  },
};

// Explicit variants for project cards to perfectly match the 320ms duration, matching easing and the exact timeline.
export const fadeUpCard = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32, // 320ms
      ease: EASE,
    },
  },
};
