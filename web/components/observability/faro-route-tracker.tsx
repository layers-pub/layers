'use client';

/**
 * Faro route change tracker for Next.js App Router.
 *
 * Tracks client-side navigation events, measures navigation
 * duration, reports initial page load timing, and sets the
 * Faro view for session replay grouping.
 *
 * @module
 */

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { getFaro } from '@/lib/observability/faro';
import { scrubUrl } from '@/lib/observability/privacy';

/**
 * Props for FaroRouteTracker.
 */
interface FaroRouteTrackerProps {
  /** Include search params in the tracked route name. */
  includeSearchParams?: boolean;
  /** Paths to exclude from tracking (exact strings or regex patterns). */
  ignorePaths?: (string | RegExp)[];
  /** Transform the path before reporting (runs after scrubbing). */
  transformPath?: (path: string) => string;
}

/**
 * Replaces dynamic path segments with parameter placeholders
 * for consistent route grouping in the observability backend.
 *
 * Handles UUIDs, numeric IDs, ATProto CIDs, and DIDs.
 *
 * @param path - the raw URL path
 * @returns the parameterized path
 *
 * @example
 * ```typescript
 * parameterizePath('/expressions/did:plc:abc123/pub.layers.expression.expression/3jzf');
 * // Returns: '/expressions/:did/pub.layers.expression.expression/:cid'
 * ```
 */
function parameterizePath(path: string): string {
  return (
    path
      // Replace UUIDs.
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
      // Replace numeric IDs.
      .replace(/\/\d+(?=\/|$)/g, '/:id')
      // Replace base32 CIDs (common in ATProto rkeys).
      .replace(/\/[a-z2-7]{32,}/gi, '/:cid')
      // Replace DIDs.
      .replace(/\/did:[a-z]+:[a-z0-9]+/gi, '/:did')
  );
}

/**
 * Tracks Next.js route changes and reports them to Grafana Faro.
 *
 * Must be rendered inside a Suspense boundary because it uses
 * `useSearchParams()`.
 *
 * @example
 * ```tsx
 * <Suspense>
 *   <FaroRouteTracker />
 * </Suspense>
 * ```
 */
function FaroRouteTracker({
  includeSearchParams = false,
  ignorePaths = [],
  transformPath,
}: FaroRouteTrackerProps = {}): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const prevPathRef = useRef<string | null>(null);
  const navigationStartRef = useRef<number>(0);

  // Track route changes.
  useEffect(() => {
    const faro = getFaro();
    if (!faro || !pathname) return;

    // Check if this path should be ignored.
    const shouldIgnore = ignorePaths.some((pattern) => {
      if (typeof pattern === 'string') {
        return pathname === pattern;
      }
      return pattern.test(pathname);
    });

    if (shouldIgnore) return;

    // Build the full path, optionally including search params.
    let fullPath = pathname;
    if (includeSearchParams && searchParams?.toString()) {
      fullPath = `${pathname}?${searchParams.toString()}`;
    }

    // Scrub PII from the path, then apply custom transform.
    const scrubbedPath = scrubUrl(fullPath);
    const finalPath = transformPath ? transformPath(scrubbedPath) : scrubbedPath;

    // Only report if the path actually changed.
    if (prevPathRef.current === finalPath) return;

    // Calculate navigation duration from the previous route change.
    const now = performance.now();
    const navigationDuration =
      prevPathRef.current !== null ? Math.round(now - navigationStartRef.current) : 0;

    const previousPath = prevPathRef.current;
    prevPathRef.current = finalPath;
    navigationStartRef.current = now;

    try {
      // Push route_change event.
      faro.api.pushEvent('route_change', {
        to: finalPath,
        from: previousPath ?? '(initial)',
        navigationType: previousPath === null ? 'initial' : 'client',
        duration: navigationDuration.toString(),
      });

      // Set the Faro view for session grouping.
      faro.api.setView({ name: finalPath });

      // Push navigation timing measurement for client navigations.
      if (previousPath !== null && navigationDuration > 0) {
        faro.api.pushMeasurement({
          type: 'navigation',
          values: { duration: navigationDuration },
        });
      }
    } catch {
      // Silently fail; route tracking must never break the app.
    }
  }, [pathname, searchParams, includeSearchParams, ignorePaths, transformPath]);

  // Report initial page load timing (runs once on mount).
  useEffect(() => {
    const faro = getFaro();
    if (!faro || typeof window === 'undefined') return;

    const reportLoadTiming = (): void => {
      try {
        const timing = performance.getEntriesByType('navigation')[0] as
          | PerformanceNavigationTiming
          | undefined;
        if (!timing) return;

        faro.api.pushMeasurement({
          type: 'page-load',
          values: {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            ttfb: timing.responseStart - timing.requestStart,
            download: timing.responseEnd - timing.responseStart,
            domParse: timing.domInteractive - timing.responseEnd,
            domComplete: timing.domComplete - timing.domInteractive,
            total: timing.loadEventEnd - timing.startTime,
          },
        });
      } catch {
        // Timing API may not be available in all environments.
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(reportLoadTiming, 0);
    } else {
      window.addEventListener('load', reportLoadTiming);
      return () => window.removeEventListener('load', reportLoadTiming);
    }
  }, []);

  return null;
}

export { FaroRouteTracker, parameterizePath };
export type { FaroRouteTrackerProps };
