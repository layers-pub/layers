/**
 * Network resource browser page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';

import { NetworkBrowser } from '@/components/design/network-browser';

export const metadata: Metadata = {
  title: 'Browse Network Resources',
  description: 'Discover and fork published resource collections from the ATProto network.',
};

export default function BrowsePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <NetworkBrowser />
    </div>
  );
}
