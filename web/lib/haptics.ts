/**
 * Tiny wrapper around the Web Vibration API for named UX events.
 *
 * @remarks
 * Browsers that don't expose `navigator.vibrate` get a no-op so
 * callers can fire haptics unconditionally. Each event maps to a
 * vibration pattern tuned for the gesture: a quick 10ms blip for tap,
 * a slightly longer 18ms for selection, layered patterns for
 * success/error.
 *
 * @packageDocumentation
 */

const PATTERNS: Record<string, number | readonly number[]> = {
  tap: 8,
  selection: 16,
  success: [10, 30, 10],
  error: [40, 20, 40],
  'refresh-threshold': 22,
  'long-press': 20,
};

/** Names of the canned haptic events {@link haptic} understands. */
export type HapticEvent = keyof typeof PATTERNS;

/**
 * Fire a named haptic event. No-op on platforms without the Web
 * Vibration API or with vibration disabled.
 */
export function haptic(event: HapticEvent): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  const pattern = PATTERNS[event];
  if (pattern === undefined) return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    // ignore — some browsers gate vibration behind user-activation.
  }
}
