'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/layout/error-display';
import { useRecord } from '@/lib/hooks/use-generic-record';

import { RecordForm } from './record-form';

interface RecordEditFormProps {
  readonly slug: string;
  readonly uri: string;
}

export function RecordEditForm({ slug, uri }: RecordEditFormProps): React.JSX.Element {
  const { data, isLoading, error } = useRecord(slug, uri);

  if (error) {
    return <ErrorDisplay error={error as Error} />;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  // Strip envelope fields (uri/cid/did/rkey/indexedAt); keep only record body.
  const { uri: _u, cid: _c, did: _d, rkey: _r, indexedAt: _i, ...body } = data;
  void [_u, _c, _d, _r, _i];
  return <RecordForm slug={slug} initialUri={uri} initial={body} />;
}
