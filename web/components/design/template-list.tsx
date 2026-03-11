'use client';

/**
 * Template list for a design project.
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TemplateListProps {
  readonly projectUri: string;
}

function TemplateList({ projectUri }: TemplateListProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Template records for this project will be listed here.
        </p>
        <p className="mt-2 min-w-0 truncate font-mono text-xs text-muted-foreground">
          {projectUri}
        </p>
      </CardContent>
    </Card>
  );
}

export { TemplateList };
