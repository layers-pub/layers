/**
 * Design section layout.
 *
 * Wraps all /design routes. Currently a thin passthrough; will gain
 * section-level providers (e.g., ProjectContext) in later phases.
 *
 * @module
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Design',
    template: '%s | Design | Layers',
  },
  description: 'Annotation and experimental design studio.',
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
