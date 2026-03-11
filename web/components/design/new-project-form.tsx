'use client';

/**
 * Form for creating a new design project.
 *
 * Creates a `pub.layers.resource.collection` record with kind='project'.
 *
 * @module
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function NewProjectForm(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader title="New Project" description="Create a new design project" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Project creation form will be implemented in Phase 1 (hooks and schemas).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { NewProjectForm };
