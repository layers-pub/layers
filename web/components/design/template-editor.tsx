'use client';

/**
 * Template editor for a single template record.
 *
 * Three-panel layout: text+slots (left), constraints (center), preview (right).
 *
 * @module
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TemplateEditorProps {
  readonly projectUri: string;
  readonly templateUri: string;
}

function TemplateEditor({ projectUri, templateUri }: TemplateEditorProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Template Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Template text, slot builder, and constraint editor will be implemented in Phase 3.
        </p>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-mono text-xs text-muted-foreground">Project: {projectUri}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            Template: {templateUri}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { TemplateEditor };
