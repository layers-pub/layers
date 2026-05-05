'use client';

import { useCallback, useEffect, useRef } from 'react';

import { haptic } from '@/lib/haptics.js';

/** Options for {@link useLongPress}. */
export interface UseLongPressOptions {
  /** Milliseconds to hold before firing. Default 350. */
  readonly threshold?: number;
  /**
   * Pixels of pointer movement that cancel the gesture (so a scroll
   * never fires a long-press). Default 8.
   */
  readonly moveTolerance?: number;
  /** Fire {@link haptic} when the threshold elapses. Default true. */
  readonly hapticFeedback?: boolean;
}

/** Pointer-event handlers returned by {@link useLongPress}. */
export interface LongPressHandlers {
  readonly onPointerDown: (event: React.PointerEvent) => void;
  readonly onPointerMove: (event: React.PointerEvent) => void;
  readonly onPointerUp: (event: React.PointerEvent) => void;
  readonly onPointerCancel: (event: React.PointerEvent) => void;
  readonly onPointerLeave: (event: React.PointerEvent) => void;
}

/**
 * Detect long-press on touch + mouse via the Pointer Events API.
 * Returns spreadable handlers; pass them to the trigger element.
 *
 * @example
 * ```tsx
 * const handlers = useLongPress(() => openMenu());
 * <span {...handlers}>token</span>
 * ```
 */
export function useLongPress(
  callback: (event: React.PointerEvent) => void,
  options: UseLongPressOptions = {},
): LongPressHandlers {
  const {
    threshold = 350,
    moveTolerance = 8,
    hapticFeedback = true,
  } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (event) => {
      startRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = setTimeout(() => {
        if (hapticFeedback) haptic('long-press');
        callback(event);
        timerRef.current = null;
      }, threshold);
    },
    onPointerMove: (event) => {
      const start = startRef.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > moveTolerance) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
  };
}
