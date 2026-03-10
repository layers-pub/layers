'use client';

/**
 * Component that initializes Grafana Faro on mount.
 *
 * This is a lightweight alternative to ObservabilityProvider for
 * cases where only Faro initialization is needed (without the full
 * React context). Prefer ObservabilityProvider in most cases.
 *
 * @module
 */

import { useEffect } from 'react';

import { initFaro } from '@/lib/observability/faro';

/**
 * Initializes Faro on mount. Renders nothing.
 *
 * Include this component once in the root layout to start
 * browser-side observability collection. When using
 * ObservabilityProvider, this component is not needed.
 */
function FaroInit(): null {
  useEffect(() => {
    void initFaro();
  }, []);

  return null;
}

export { FaroInit };
