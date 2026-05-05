import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Geist } from 'next/font/google';

import { Providers } from '@/components/providers';
import { ObservabilityProvider } from '@/lib/observability/context';
import { FaroRouteTracker } from '@/components/observability/faro-route-tracker';
import { MainLayout } from '@/components/layout/main-layout';
import { MobileBottomNav } from '@/components/nav/mobile-bottom-nav';
import { CommandPalette } from '@/components/command-palette';
import { cn } from '@/lib/utils';
import '@/styles/globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'Layers | Decentralized Linguistic Annotation',
    template: '%s | Layers',
  },
  description: 'Decentralized linguistic annotation on ATProto.',
  keywords: ['linguistics', 'annotation', 'NLP', 'ATProto', 'decentralized', 'corpus', 'ontology'],
  authors: [{ name: 'Aaron Steven White', url: 'https://layers.pub' }],
  icons: {
    icon: '/layers-logo.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://layers.pub',
    siteName: 'Layers',
    title: 'Layers | Decentralized Linguistic Annotation',
    description: 'Decentralized linguistic annotation on ATProto.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(GeistSans.variable, GeistMono.variable, 'font-sans', geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ObservabilityProvider>
          <Providers>
            <Suspense>
              <FaroRouteTracker />
            </Suspense>
            <div className="relative flex min-h-screen flex-col pb-16 md:pb-0">
              <MainLayout>{children}</MainLayout>
              <MobileBottomNav />
              <CommandPalette />
            </div>
          </Providers>
        </ObservabilityProvider>
      </body>
    </html>
  );
}
