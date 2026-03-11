'use client';

/**
 * Project dashboard for the /design section.
 *
 * Displays a grid of project cards with a "New Project" action
 * and a link to the network resource browser.
 *
 * @module
 */

import Link from 'next/link';
import { Plus, Globe } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function DesignDashboard(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Studio"
        description="Create and manage annotation and experimental design projects"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" render={<Link href="/design/browse" />}>
              <Globe className="mr-1.5 h-4 w-4" />
              Browse Network
            </Button>
            <Button size="sm" render={<Link href="/design/new" />}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Project
            </Button>
          </div>
        }
      />

      {/* Placeholder for project cards grid, populated by useProjectCollections in Phase 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No projects yet. Create a new project to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { DesignDashboard };
