'use client';

/**
 * Reusable card component for displaying a single search result.
 *
 * @packageDocumentation
 */

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Props for the SearchResultCard component.
 */
interface SearchResultCardProps {
  uri: string;
  collection: string;
  highlights: { [key: string]: string[] };
  score: number;
}

/**
 * Extracts a short record type label from a full collection NSID.
 *
 * E.g. "pub.layers.expression.expression" -> "expression"
 */
function collectionToType(collection: string): string {
  const parts = collection.split('.');
  return parts[parts.length - 1] ?? collection;
}

/**
 * Maps a record type string to a badge variant and display label.
 */
function getTypeBadgeConfig(type: string): {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
} {
  switch (type) {
    case 'expression':
      return { label: 'Expression', variant: 'default' };
    case 'corpus':
      return { label: 'Corpus', variant: 'secondary' };
    case 'ontology':
      return { label: 'Ontology', variant: 'secondary' };
    case 'annotation':
    case 'annotationLayer':
      return { label: 'Annotation', variant: 'outline' };
    case 'persona':
      return { label: 'Persona', variant: 'outline' };
    case 'eprint':
      return { label: 'Eprint', variant: 'outline' };
    case 'media':
      return { label: 'Media', variant: 'outline' };
    case 'resource':
    case 'entry':
    case 'collection':
    case 'template':
    case 'filling':
      return { label: 'Resource', variant: 'outline' };
    case 'graphNode':
    case 'graphEdge':
      return { label: 'Graph', variant: 'outline' };
    default:
      return { label: type, variant: 'outline' };
  }
}

/**
 * Returns the detail page path for a given record type and AT-URI.
 *
 * @remarks
 * AT-URIs are encoded by replacing slashes with colons for URL safety,
 * then split into catch-all segments. The `encodeAtUri` function from
 * `lib/utils/format` handles this once it is available; for now we use
 * `encodeURIComponent` on each segment.
 */
function getDetailPath(type: string, uri: string): string {
  // AT-URI format: at://did:plc:xxx/collection/rkey
  // Route format: /type/did:plc:xxx/collection/rkey
  const withoutPrefix = uri.replace(/^at:\/\//, '');
  const segments = withoutPrefix.split('/').map(encodeURIComponent);

  switch (type) {
    case 'expression':
      return `/expressions/${segments.join('/')}`;
    case 'corpus':
      return `/corpora/${segments.join('/')}`;
    case 'ontology':
      return `/ontologies/${segments.join('/')}`;
    case 'annotation':
    case 'annotationLayer':
      return `/annotations/${segments.join('/')}`;
    default:
      return `/records/${segments.join('/')}`;
  }
}

/**
 * Displays a single search result as a card with type badge, title,
 * snippet (with highlight markup), and link to the detail page.
 *
 * @remarks
 * The snippet may contain `<mark>` tags from the API for highlighting
 * matched terms. The API sanitizes the HTML before returning it.
 */
function SearchResultCard({ uri, collection, highlights, score }: SearchResultCardProps) {
  const type = collectionToType(collection);
  const badgeConfig = getTypeBadgeConfig(type);
  const detailPath = getDetailPath(type, uri);

  // Build a snippet from highlights (join the first available field's fragments)
  const highlightEntries = Object.values(highlights);
  const snippet = highlightEntries.length > 0
    ? highlightEntries[0]?.join(' ... ') ?? ''
    : '';

  // Use the URI rkey as a fallback title
  const rkey = uri.split('/').pop() ?? uri;

  return (
    <Link href={detailPath} className="block">
      <Card className="transition-colors hover:bg-muted/50" size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
            <span className="text-xs text-muted-foreground">{score.toFixed(2)}</span>
          </div>
          <CardTitle className="mt-1">{rkey}</CardTitle>
        </CardHeader>
        <CardContent>
          {snippet ? (
            <p
              className="line-clamp-2 text-sm text-muted-foreground [&>mark]:bg-yellow-200 [&>mark]:text-foreground dark:[&>mark]:bg-yellow-900/50"
              dangerouslySetInnerHTML={{ __html: snippet }}
            />
          ) : null}
          <p className="mt-2 truncate text-xs text-muted-foreground/70">{uri}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export type { SearchResultCardProps };
export { SearchResultCard, getDetailPath, getTypeBadgeConfig };
