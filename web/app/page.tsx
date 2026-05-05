'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Layers, BookOpen, FlaskConical, Network, Search, Pencil, ArrowRight } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Corpora',
    description: 'Build and share annotated linguistic corpora with full data sovereignty.',
    href: '/corpora',
  },
  {
    icon: Pencil,
    title: 'Annotations',
    description:
      'Token tags, spans, relations, trees, tiers, and document tags across multiple layers.',
    href: '/corpora',
  },
  {
    icon: Network,
    title: 'Ontologies',
    description:
      'Define and browse ontology types, relations, and knowledge resources for structured annotation.',
    href: '/ontologies',
  },
  {
    icon: FlaskConical,
    title: 'Experiments',
    description:
      'Design judgment experiments with templates, constraints, and automated stimulus generation.',
    href: '/design',
  },
  {
    icon: Search,
    title: 'Discovery',
    description:
      'Search across expressions, annotations, and resources with full-text and faceted queries.',
    href: '/search',
  },
  {
    icon: Layers,
    title: 'Multi-layer',
    description:
      'Stack annotation layers over shared expressions with cross-references and alignments.',
    href: '/corpora',
  },
] as const;

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <Image
          src="/layers-logo.svg"
          alt="Layers"
          width={80}
          height={80}
          className="mb-6 rounded-lg"
          priority
        />
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Layers</h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Decentralized linguistic annotation on ATProto. Build corpora, design experiments, and
          share annotations with full data sovereignty.
        </p>

        <div className="mt-8 flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Button size="lg" render={<Link href="/dashboard" />}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" render={<Link href="/design" />}>
                Design Studio
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" render={<Link href="/login" />}>
                Sign in with Bluesky
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" render={<Link href="/corpora" />}>
                Browse Corpora
              </Button>
            </>
          )}
        </div>

        {isAuthenticated && user && (
          <p className="mt-4 text-sm text-muted-foreground">
            Signed in as{' '}
            <span className="font-medium text-foreground">
              {user.displayName || `@${user.handle}`}
            </span>
          </p>
        )}
      </section>

      {/* Features grid */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-lg border bg-card p-6 transition-colors hover:border-foreground/20 hover:bg-accent/50"
            >
              <feature.icon className="mb-3 h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-6 px-4 text-sm text-muted-foreground">
          <span>Built on AT Protocol</span>
          <span className="text-border">|</span>
          <span>All data lives in your PDS</span>
        </div>
      </footer>
    </div>
  );
}
