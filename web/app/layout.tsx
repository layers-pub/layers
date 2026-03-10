import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/providers';
import { FaroInit } from '@/components/observability/faro-init';
import { MainLayout } from '@/components/layout/main-layout';
import '@/styles/globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(GeistSans.variable, GeistMono.variable, 'font-sans', geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <FaroInit />
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <MainLayout>{children}</MainLayout>
          </div>
        </Providers>
      </body>
    </html>
  );
}
