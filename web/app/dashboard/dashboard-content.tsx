'use client';

/**
 * Dashboard content showing summary cards, quick actions, and activity feed.
 *
 * @module
 */

import Link from 'next/link';
import { FileText, Layers, BookOpen, Plus, Upload, ArrowRight } from 'lucide-react';

import { useCurrentUser } from '@/lib/auth';
import { useChangelog } from '@/lib/hooks/use-changelog';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangelogEntryRow } from '@/components/changelog/changelog-entry-row';

// =============================================================================
// SUMMARY CARDS
// =============================================================================

function SummaryCards({ userDid }: { readonly userDid: string }): React.JSX.Element {
  const cards = [
    {
      title: 'My Expressions',
      icon: FileText,
      href: `/expressions?creator=${encodeURIComponent(userDid)}`,
    },
    {
      title: 'My Annotations',
      icon: Layers,
      href: `/search?type=annotation&creator=${encodeURIComponent(userDid)}`,
    },
    {
      title: 'My Corpora',
      icon: BookOpen,
      href: `/corpora?creator=${encodeURIComponent(userDid)}`,
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                render={<Link href={card.href} />}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

function QuickActions(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Button
        variant="outline"
        className="h-auto flex-col gap-2 py-4"
        render={<Link href="/expressions/new" />}
      >
        <Plus className="h-5 w-5" />
        <span>Create Expression</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto flex-col gap-2 py-4"
        render={<Link href="/corpora/new" />}
      >
        <Plus className="h-5 w-5" />
        <span>Create Corpus</span>
      </Button>
      <Button variant="outline" className="h-auto flex-col gap-2 py-4" disabled>
        <Upload className="h-5 w-5" />
        <span>Import Data</span>
      </Button>
    </div>
  );
}

// =============================================================================
// ACTIVITY FEED
// =============================================================================

function ActivityFeed({ userDid }: { readonly userDid: string }): React.JSX.Element {
  const { data, isLoading, error } = useChangelog({
    collection: 'pub.layers.expression.expression',
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Could not load recent activity.
      </p>
    );
  }

  if (!data?.entries.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No recent activity. Create or annotate an expression to get started.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {data.entries.map((entry) => (
        <ChangelogEntryRow key={entry.uri} entry={entry} />
      ))}
    </div>
  );
}

// =============================================================================
// DASHBOARD SKELETON
// =============================================================================

function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// =============================================================================
// MAIN CONTENT
// =============================================================================

/**
 * Dashboard page content. Shows summary cards, quick actions, and a recent
 * activity feed for the authenticated user.
 */
function DashboardContent(): React.JSX.Element {
  const user = useCurrentUser();

  if (!user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description={`Welcome back, ${user.handle || user.did}`} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your Records</h2>
        <SummaryCards userDid={user.did} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <QuickActions />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            render={<Link href={`/changelog?creator=${encodeURIComponent(user.did)}`} />}
          >
            View more <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4">
            <ActivityFeed userDid={user.did} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export { DashboardContent, DashboardSkeleton };
