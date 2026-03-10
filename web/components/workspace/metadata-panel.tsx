/**
 * Right panel of the annotation workspace showing metadata and layer controls.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CrossReferenceList } from '@/components/records/cross-reference-list';

import { LayerToggleSidebar } from '../annotations/composition/layer-toggle-sidebar';
import type { AnnotationLayerData } from '../annotations/types';

interface MetadataPanelProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text (for display metrics). */
  text: string;
  /** All annotation layers. */
  layers: AnnotationLayerData[];
  /** Set of currently visible layer URIs. */
  visibleLayers: Set<string>;
  /** Callback when a layer's visibility is toggled. */
  onToggleLayer: (uri: string) => void;
}

/**
 * Extracts the DID from an AT-URI.
 *
 * @param uri - an AT-URI (e.g., "at://did:plc:abc/collection/rkey")
 * @returns the DID portion, or the full URI if parsing fails
 */
function extractDid(uri: string): string {
  const match = uri.match(/^at:\/\/(did:[^/]+)/);
  return match?.[1] ?? uri;
}

/**
 * Truncates a string to a maximum length, adding an ellipsis if needed.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

/**
 * Right sidebar showing expression metadata, layer controls, and cross-references.
 */
function MetadataPanel({
  expressionUri,
  text,
  layers,
  visibleLayers,
  onToggleLayer,
}: MetadataPanelProps): React.JSX.Element {
  const did = extractDid(expressionUri);
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">Details</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {/* Expression info */}
            <section>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Expression
              </h4>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">URI</dt>
                  <dd className="font-mono break-all mt-0.5">{truncate(expressionUri, 60)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Creator</dt>
                  <dd className="font-mono break-all mt-0.5">{truncate(did, 40)}</dd>
                </div>
                <div className="flex gap-4">
                  <div>
                    <dt className="text-muted-foreground">Characters</dt>
                    <dd className="mt-0.5">{charCount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Words</dt>
                    <dd className="mt-0.5">{wordCount.toLocaleString()}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <Separator />

            {/* Layer controls */}
            <section>
              <LayerToggleSidebar
                layers={layers}
                visibleLayers={visibleLayers}
                onToggle={onToggleLayer}
              />
            </section>

            <Separator />

            {/* Cross-references */}
            <section>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Cross-References
              </h4>
              <CrossReferenceList targetUri={expressionUri} />
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { MetadataPanelProps };
export { MetadataPanel };
