'use client';

/**
 * Component that initializes Grafana Faro on mount.
 *
 * Include this component once in the root layout to start
 * browser-side observability collection.
 *
 * @module
 */

import { useEffect } from 'react';

import { initFaro } from '@/lib/observability/faro';

function FaroInit(): null {
  useEffect(() => {
    void initFaro();
  }, []);

  return null;
}

export { FaroInit };
