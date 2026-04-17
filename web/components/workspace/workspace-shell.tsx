'use client';

/**
 * Responsive shell for the annotation workspace.
 *
 * - At `md+` renders the three-panel horizontal layout (Expression, Annotation,
 *   Metadata) with `react-resizable-panels`, matching the desktop design.
 * - Below `md` renders a `<Tabs/>` with one tab per panel so the workspace is
 *   usable on phones and tablets.
 *
 * The shell owns only the layout concern. Editors and panels are passed in as
 * children so the existing workspace state is unchanged.
 */

import * as React from 'react';
import { Group as PanelGroup, Panel, Separator as ResizeHandle } from 'react-resizable-panels';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WorkspaceShellProps {
  readonly expression: React.ReactNode;
  readonly annotations: React.ReactNode;
  readonly metadata: React.ReactNode;
  readonly className?: string;
}

export function WorkspaceShell({
  expression,
  annotations,
  metadata,
  className,
}: WorkspaceShellProps): React.JSX.Element {
  return (
    <div className={className}>
      {/* Mobile/tablet: tabs */}
      <div className="flex h-full flex-col md:hidden">
        <Tabs defaultValue="annotations" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-2 grid grid-cols-3">
            <TabsTrigger value="expression">Text</TabsTrigger>
            <TabsTrigger value="annotations">Annotations</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>
          <TabsContent value="expression" className="min-h-0 flex-1 overflow-auto">
            {expression}
          </TabsContent>
          <TabsContent value="annotations" className="min-h-0 flex-1 overflow-auto">
            {annotations}
          </TabsContent>
          <TabsContent value="metadata" className="min-h-0 flex-1 overflow-auto">
            {metadata}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: three-panel layout */}
      <div className="hidden h-full md:block">
        <PanelGroup orientation="horizontal" className="h-full min-h-0">
          <Panel defaultSize={25} minSize={15} collapsible>
            <section aria-label="Expression" className="h-full">
              {expression}
            </section>
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={50} minSize={30}>
            <section aria-label="Annotations" className="h-full">
              {annotations}
            </section>
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={25} minSize={15} collapsible>
            <section aria-label="Metadata" className="h-full">
              {metadata}
            </section>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export function WorkspaceSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col gap-3 p-4 md:flex-row md:gap-1">
      <div className="space-y-3 rounded border p-4 md:w-1/4">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 rounded border p-4 md:w-1/2">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 rounded border p-4 md:w-1/4">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
