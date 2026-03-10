'use client';

/**
 * Client component for the expression detail view.
 *
 * @packageDocumentation
 */

import { useEffect } from 'react';
import Link from 'next/link';

import { CrossReferenceList } from '@/components/records/cross-reference-list';
import { RecordLinkBadge } from '@/components/records/record-link-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAnnotationLayersByExpression,
  useExpression,
  useSegmentationsByExpression,
} from '@/lib/hooks';
import { events } from '@/lib/observability/custom-events';
import { encodeAtUri, formatRelativeTime } from '@/lib/utils/format';

interface ExpressionDetailContentProps {
  /** AT-URI of the expression to display. */
  uri: string;
}

/**
 * Renders the full detail view for a single expression.
 *
 * Displays the expression text, language, timestamps, and sections for
 * linked segmentations, annotation layers, and cross-references.
 */
function ExpressionDetailContent({ uri }: ExpressionDetailContentProps) {
  const { data: expression, isLoading, isError, error } = useExpression(uri);

  useEffect(() => {
    events.expressionView({ expressionUri: uri, source: 'direct' });
  }, [uri]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="space-y-3 rounded-xl border p-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load expression</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/expressions" />}>
          Back to expressions
        </Button>
      </div>
    );
  }

  if (!expression) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Expression not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested expression does not exist or has not been indexed yet.
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/expressions" />}>
          Back to expressions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Expression</h1>
          <div className="flex items-center gap-2">
            {expression.value.language ? (
              <Badge variant="secondary">{expression.value.language}</Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/workspace/${encodeAtUri(uri)}`} />}
            >
              View in Workspace
            </Button>
          </div>
        </div>
        <p className="mt-1 min-w-0 break-all text-sm text-muted-foreground">{uri}</p>
      </div>

      {/* Text content */}
      <Card>
        <CardHeader>
          <CardTitle>Text</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed">{expression.value.text}</p>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Author (DID)</dt>
              <dd className="mt-1 min-w-0 break-all text-sm">{expression.uri.split('/')[2]}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Language</dt>
              <dd className="mt-1 text-sm">{expression.value.language ?? 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="mt-1 text-sm">{formatRelativeTime(expression.value.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      {/* Linked segmentations */}
      <SegmentationsSection expressionUri={uri} />

      {/* Linked annotation layers */}
      <AnnotationLayersSection expressionUri={uri} />

      {/* Cross-references */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Cross-References</h2>
        <CrossReferenceList targetUri={uri} />
      </section>
    </div>
  );
}

/**
 * Displays segmentations linked to an expression.
 */
function SegmentationsSection({ expressionUri }: { expressionUri: string }) {
  const { data, isLoading } = useSegmentationsByExpression(expressionUri);
  const segmentations = data?.records ?? [];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Segmentations</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-28" />
        </div>
      ) : segmentations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No segmentations.</p>
      ) : (
        <div className="space-y-3">
          {segmentations.map((seg) => (
            <Card key={seg.uri}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <RecordLinkBadge uri={seg.uri} type="segmentation" />
                  {seg.value.tokenizations.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {seg.value.tokenizations.length} tokenization
                      {seg.value.tokenizations.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Displays annotation layers linked to an expression.
 */
function AnnotationLayersSection({ expressionUri }: { expressionUri: string }) {
  const { data, isLoading } = useAnnotationLayersByExpression(expressionUri);
  const layers = data?.records ?? [];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Annotation Layers</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-28" />
        </div>
      ) : layers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No annotation layers.</p>
      ) : (
        <div className="space-y-3">
          {layers.map((layer) => (
            <Card key={layer.uri}>
              <CardContent className="py-3">
                <Link
                  href={`/workspace/${encodeAtUri(layer.uri)}`}
                  className="flex items-center gap-3 no-underline"
                >
                  <Badge variant="secondary">{layer.value.kind}</Badge>
                  {layer.value.subkind ? (
                    <span className="text-xs text-muted-foreground">{layer.value.subkind}</span>
                  ) : null}
                  <span className="text-sm">Annotation Layer</span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export { ExpressionDetailContent };
