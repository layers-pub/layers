/**
 * Card component for experiment definition listings.
 *
 * @module
 */

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExperimentDef } from '@/lib/hooks/use-experiments';
import { formatRelativeTime } from '@/lib/utils/format';

interface ExperimentCardProps {
  /** The experiment definition to display. */
  experiment: ExperimentDef;
}

/**
 * Encodes an AT-URI for use in a URL path by stripping the `at://` prefix
 * and splitting on slashes for the catch-all route segment.
 */
function encodeExperimentPath(uri: string): string {
  const withoutPrefix = uri.replace(/^at:\/\//, '');
  return withoutPrefix.split('/').map(encodeURIComponent).join('/');
}

/**
 * Renders a card for an experiment definition with label, measure type,
 * task type, and creation time.
 */
function ExperimentCard({ experiment }: ExperimentCardProps): React.JSX.Element {
  return (
    <Link href={`/experiments/${encodeExperimentPath(experiment.uri)}`} className="block">
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">{experiment.value.name}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">{experiment.value.measureType}</Badge>
            <Badge variant="outline">{experiment.value.taskType}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(experiment.value.createdAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export type { ExperimentCardProps };
export { ExperimentCard };
