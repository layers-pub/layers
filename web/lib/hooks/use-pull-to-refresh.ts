'use client';

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { haptic } from '@/lib/haptics.js';

/** Options for {@link usePullToRefresh}. */
export interface UsePullToRefreshOptions {
  /**
   * Async refresh callback. The hook awaits this and disables the
   * pull animation while it resolves.
   */
  readonly onRefresh: () => Promise<unknown>;
  /** Pixels the user must drag before a release triggers refresh. */
  readonly threshold?: number;
  /** Maximum displacement of the pull-down indicator. */
  readonly maxPull?: number;
}

/** State surfaced to the caller. */
export interface PullToRefreshState<T extends HTMLElement> {
  /** Attach to the scroll container (or any ancestor that captures pointer events). */
  readonly ref: RefObject<T | null>;
  /** Translate-Y in pixels during an active drag. 0 when idle. */
  readonly pullOffset: number;
  /** Whether the threshold has been crossed (visual state cue). */
  readonly armed: boolean;
  /** True from `onRefresh` start to settle. */
  readonly isRefreshing: boolean;
}

/**
 * Touch + pointer pull-to-refresh that respects the native scroll
 * container. Engages only when the container is scrolled to the top
 * and the gesture is downward.
 */
export function usePullToRefresh<T extends HTMLElement>(
  options: UsePullToRefreshOptions,
): PullToRefreshState<T> {
  const { onRefresh, threshold = 64, maxPull = 96 } = options;
  const ref = useRef<T | null>(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const [armed, setArmed] = useState(false);

  const settle = useCallback(() => {
    setPullOffset(0);
    setArmed(false);
    armedRef.current = false;
    startYRef.current = null;
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const isScrolledTop = () => {
      // Use document scrollTop when the ref is the body/document.
      if (node === document.body || node === document.documentElement) {
        return window.scrollY <= 0;
      }
      return node.scrollTop <= 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!isScrolledTop() || isRefreshing) return;
      startYRef.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const start = startYRef.current;
      if (start === null) return;
      const y = e.touches[0]?.clientY ?? start;
      const delta = y - start;
      if (delta <= 0) return;
      const eased = Math.min(maxPull, delta * 0.55);
      setPullOffset(eased);
      const isArmed = eased >= threshold;
      if (isArmed && !armedRef.current) {
        haptic('refresh-threshold');
        armedRef.current = true;
        setArmed(true);
      } else if (!isArmed && armedRef.current) {
        armedRef.current = false;
        setArmed(false);
      }
    };
    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      if (armedRef.current) {
        setIsRefreshing(true);
        settle();
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        settle();
      }
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', settle, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', settle);
    };
  }, [onRefresh, threshold, maxPull, settle, isRefreshing]);

  return { ref, pullOffset, armed, isRefreshing };
}
