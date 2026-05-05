'use client';

import { useEffect, useState } from 'react';

/** Reported direction of the most recent scroll delta. */
export type ScrollDirection = 'up' | 'down' | 'idle';

/**
 * Track the dominant scroll direction of the page (or a custom
 * scrollable element) with a small delta threshold so jitter near a
 * stationary scroll position doesn't flip the result repeatedly.
 *
 * Used by the scroll-aware bottom nav to hide on scroll-down + reveal
 * on scroll-up, the Bluesky/Skylight pattern.
 */
export function useScrollDirection(threshold: number = 6): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('idle');

  useEffect(() => {
    let lastY = typeof window === 'undefined' ? 0 : window.scrollY;
    let raf = 0;
    function update() {
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < threshold) {
        raf = 0;
        return;
      }
      setDirection(delta > 0 ? 'down' : 'up');
      lastY = y;
      raf = 0;
    }
    function onScroll() {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return direction;
}
