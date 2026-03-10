'use client';

/**
 * Displays cross-references pointing to a record.
 *
 * @module
 */

import { Link2 } from 'lucide-react';

import { useCrossReferences } from '@/lib/hooks/use-cross-references';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { RecordLinkBadge, type RecordType } from './record-link-badge';

/**
 * Infers the record type from an AT-URI's collection segment.
 */
function inferRecordType(uri: string): RecordType {
  if (uri.includes('expression.expression')) return 'expression';
  if (uri.includes('corpus.corpus')) return 'corpus';
  if (uri.includes('ontology.ontology')) return 'ontology';
  if (uri.includes('annotation.annotationLayer')) return 'annotation';
  if (uri.includes('segmentation.segmentation')) return 'segmentation';
  if (uri.includes('eprint.eprint')) return 'eprint';
  if (uri.includes('media.media')) return 'media';
  if (uri.includes('persona.persona')) return 'persona';
  return 'expression';
}

interface CrossReferenceListProps {
  /** AT-URI of the target record to show references for. */
  targetUri: string;
}

function CrossReferenceListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

function CrossReferenceList({ targetUri }: CrossReferenceListProps): React.JSX.Element {
  const { data, isLoading, error } = useCrossReferences(targetUri);

  if (isLoading) {
    return <CrossReferenceListSkeleton />;
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load cross-references.</p>;
  }

  const references = data?.references ?? [];

  if (references.length === 0) {
    return (
      <EmptyState
        icon={Link2}
        title="No cross-references"
        description="No other records reference this one."
      />
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Referenced by ({references.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {references.map((ref) => (
          <RecordLinkBadge
            key={ref.uri}
            uri={ref.sourceUri}
            type={inferRecordType(ref.sourceUri)}
            label={ref.refType}
          />
        ))}
      </div>
    </div>
  );
}

export type { CrossReferenceListProps };
export { CrossReferenceList };
