'use client';

/**
 * Changelog page content with filters and grouped timeline.
 *
 * @module
 */

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { History } from 'lucide-react';

import { useChangelog } from '@/lib/hooks/use-changelog';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChangelogTimeline } from '@/components/changelog/changelog-timeline';

// =============================================================================
// COLLECTION OPTIONS
// =============================================================================

const COLLECTION_OPTIONS = [
  { value: 'pub.layers.expression.expression', label: 'Expression' },
  { value: 'pub.layers.segmentation.segmentation', label: 'Segmentation' },
  { value: 'pub.layers.annotation.annotationLayer', label: 'Annotation Layer' },
  { value: 'pub.layers.annotation.clusterSet', label: 'Cluster Set' },
  { value: 'pub.layers.ontology.ontology', label: 'Ontology' },
  { value: 'pub.layers.ontology.typeDef', label: 'Type Def' },
  { value: 'pub.layers.corpus.corpus', label: 'Corpus' },
  { value: 'pub.layers.corpus.membership', label: 'Membership' },
  { value: 'pub.layers.resource.entry', label: 'Resource Entry' },
  { value: 'pub.layers.resource.collection', label: 'Resource Collection' },
  { value: 'pub.layers.resource.collectionMembership', label: 'Collection Membership' },
  { value: 'pub.layers.resource.template', label: 'Template' },
  { value: 'pub.layers.resource.filling', label: 'Filling' },
  { value: 'pub.layers.resource.templateComposition', label: 'Template Composition' },
  { value: 'pub.layers.judgment.experimentDef', label: 'Experiment Def' },
  { value: 'pub.layers.judgment.judgmentSet', label: 'Judgment Set' },
  { value: 'pub.layers.judgment.agreementReport', label: 'Agreement Report' },
  { value: 'pub.layers.alignment.alignment', label: 'Alignment' },
  { value: 'pub.layers.graph.graphNode', label: 'Graph Node' },
  { value: 'pub.layers.graph.graphEdge', label: 'Graph Edge' },
  { value: 'pub.layers.graph.graphEdgeSet', label: 'Graph Edge Set' },
  { value: 'pub.layers.persona.persona', label: 'Persona' },
  { value: 'pub.layers.media.media', label: 'Media' },
  { value: 'pub.layers.eprint.eprint', label: 'Eprint' },
  { value: 'pub.layers.eprint.dataLink', label: 'Data Link' },
  { value: 'pub.layers.changelog.entry', label: 'Changelog Entry' },
] as const;

// =============================================================================
// FILTER CONTROLS
// =============================================================================

interface FilterControlsProps {
  readonly collection: string;
  readonly creator: string;
  readonly onCollectionChange: (value: string | null) => void;
  readonly onCreatorChange: (value: string) => void;
}

function FilterControls({
  collection,
  creator,
  onCollectionChange,
  onCreatorChange,
}: FilterControlsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={collection} onValueChange={onCollectionChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="All collections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All collections</SelectItem>
          {COLLECTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Filter by creator DID..."
        value={creator}
        onChange={(e) => onCreatorChange(e.target.value)}
        className="w-64"
      />
    </div>
  );
}

// =============================================================================
// MAIN CONTENT
// =============================================================================

/**
 * Changelog page content with collection and creator filters.
 * Entries are grouped by subject URI and displayed as a timeline.
 */
function ChangelogContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const collection = searchParams.get('collection') ?? '';
  const creator = searchParams.get('creator') ?? '';

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/changelog?${params.toString()}`);
    },
    [router, searchParams],
  );

  const selectedCollection = collection && collection !== 'all' ? collection : 'pub.layers.expression.expression';

  const { data, isLoading, error } = useChangelog({ collection: selectedCollection });

  return (
    <div className="space-y-6">
      <PageHeader title="Changelog" description="Record creation, update, and deletion history" />

      <FilterControls
        collection={collection}
        creator={creator}
        onCollectionChange={(value) => updateParams('collection', value ?? '')}
        onCreatorChange={(value) => updateParams('creator', value)}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Failed to load changelog entries.
        </p>
      ) : !data?.entries.length ? (
        <EmptyState
          icon={History}
          title="No changelog entries"
          description="No entries match the current filters. Try adjusting your search criteria."
        />
      ) : (
        <>
          <ChangelogTimeline entries={data.entries} />
          {data.cursor ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Load more would be implemented with cursor-based pagination
                }}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export { ChangelogContent };
