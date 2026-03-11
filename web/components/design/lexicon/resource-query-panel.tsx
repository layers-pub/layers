'use client';

/**
 * Resource query panel (placeholder for Phase 4 sidecar integration).
 *
 * Will connect to the Python sidecar to query VerbNet, UniMorph,
 * PropBank, FrameNet, WordNet, and Universal Dependencies.
 *
 * @module
 */

import { Database, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// =============================================================================
// PROPS
// =============================================================================

interface ResourceQueryPanelProps {
  readonly onAddEntries?: (entries: unknown[]) => void;
}

// =============================================================================
// SOURCES
// =============================================================================

const RESOURCE_SOURCES = [
  { id: 'verbnet', label: 'VerbNet' },
  { id: 'propbank', label: 'PropBank' },
  { id: 'framenet', label: 'FrameNet' },
  { id: 'wordnet', label: 'WordNet' },
  { id: 'unimorph', label: 'UniMorph' },
  { id: 'ud', label: 'Universal Dependencies' },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

function ResourceQueryPanel({
  onAddEntries: _onAddEntries,
}: ResourceQueryPanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Resource Query</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a Python sidecar to query VerbNet, UniMorph, and other resources.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Available in Phase 4.</p>
        </div>

        {/* Disabled faceted search UI mockup */}
        <div className="space-y-3 opacity-50 pointer-events-none" aria-disabled="true">
          <div className="space-y-1.5">
            <Label className="text-xs">Source</Label>
            <div className="flex flex-wrap gap-1.5">
              {RESOURCE_SOURCES.map((source) => (
                <Badge key={source.id} variant="outline" className="cursor-not-allowed">
                  {source.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search entries..." className="pl-8" disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Results</Label>
            <div className="rounded-md border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
              Query results will appear here
            </div>
          </div>

          <Button size="sm" disabled className="w-full">
            Add Selected to Collection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { ResourceQueryPanel };
export type { ResourceQueryPanelProps };
