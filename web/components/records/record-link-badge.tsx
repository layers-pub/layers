/**
 * Badge-pill component for linking to related records.
 *
 * @module
 */

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Record types that can be displayed as badge links.
 */
type RecordType =
  | 'expression'
  | 'corpus'
  | 'ontology'
  | 'annotation'
  | 'segmentation'
  | 'eprint'
  | 'media'
  | 'persona';

/**
 * Maps record types to their detail page base paths.
 */
const TYPE_TO_ROUTE: Record<RecordType, string> = {
  expression: '/expressions/',
  corpus: '/corpora/',
  ontology: '/ontologies/',
  annotation: '/annotations/',
  segmentation: '/segmentations/',
  eprint: '/eprints/',
  media: '/media/',
  persona: '/personas/',
};

/**
 * Maps record types to background color classes for visual distinction.
 */
const TYPE_TO_COLOR: Record<RecordType, string> = {
  expression: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  corpus: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ontology: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  annotation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  segmentation: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  eprint: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  media: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  persona: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
};

/**
 * Truncates an AT-URI for display, keeping the rkey portion.
 */
function truncateUri(uri: string): string {
  const parts = uri.split('/');
  const rkey = parts[parts.length - 1] ?? uri;
  if (rkey.length <= 12) return rkey;
  return `${rkey.slice(0, 6)}...${rkey.slice(-4)}`;
}

interface RecordLinkBadgeProps {
  /** AT-URI of the record. */
  uri: string;
  /** Type of the record, determines route and color. */
  type: RecordType;
  /** Optional display label (falls back to truncated URI). */
  label?: string;
}

function RecordLinkBadge({ uri, type, label }: RecordLinkBadgeProps): React.JSX.Element {
  const route = TYPE_TO_ROUTE[type];
  const encodedUri = encodeURIComponent(uri);
  const href = `${route}${encodedUri}`;
  const displayText = label || truncateUri(uri);
  const colorClass = TYPE_TO_COLOR[type];

  return (
    <Link href={href} className="inline-flex no-underline">
      <Badge
        variant="outline"
        className={cn(
          'cursor-pointer gap-1.5 border-transparent transition-opacity hover:opacity-80',
          colorClass,
        )}
      >
        <span className="text-[10px] font-semibold uppercase">{type}</span>
        <span className="text-xs">{displayText}</span>
      </Badge>
    </Link>
  );
}

export type { RecordType, RecordLinkBadgeProps };
export { RecordLinkBadge };
