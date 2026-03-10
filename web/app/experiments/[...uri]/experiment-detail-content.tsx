'use client';

/**
 * Client component for the experiment detail page.
 *
 * @packageDocumentation
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/layout/error-display';
import { EmptyState } from '@/components/layout/empty-state';
import { AgreementReportCard } from '@/components/experiments/agreement-report-card';
import { JudgmentResponseControl } from '@/components/experiments/judgment-response';
import type { components } from '@/lib/api/schema.generated';
import {
  useExperimentDef,
  useJudgmentSets,
  useAgreementReports,
} from '@/lib/hooks/use-experiments';
import { formatRelativeTime } from '@/lib/utils/format';

type ExperimentDesign = components['schemas']['JudgmentDefsExperimentDesign'];

/**
 * Renders experiment design settings from the typed ExperimentDesign object.
 */
function DesignSettings({ design }: { design: ExperimentDesign }): React.JSX.Element {
  const entries: [string, string][] = [];
  if (design.distributionStrategy) entries.push(['Distribution Strategy', design.distributionStrategy]);
  if (design.itemOrder) entries.push(['Item Order', design.itemOrder]);
  if (design.timingMs != null) entries.push(['Timing (ms)', String(design.timingMs)]);
  if (design.listConstraints?.length) {
    entries.push(['List Constraints', design.listConstraints.map((c) => c.kind).join(', ')]);
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No design settings configured.</p>;
  }

  return (
    <dl className="space-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-muted-foreground">{key}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ExperimentDetailContentProps {
  /** AT-URI of the experiment definition. */
  uri: string;
}

/**
 * Renders the full experiment detail view with design settings,
 * linked judgment sets, agreement reports, and a response preview.
 */
function ExperimentDetailContent({ uri }: ExperimentDetailContentProps): React.JSX.Element {
  const { data: experiment, isLoading, error, refetch } = useExperimentDef(uri);
  const { data: judgmentData } = useJudgmentSets({ experimentRef: uri, limit: 50 });
  const { data: agreementData } = useAgreementReports({ experimentRef: uri });

  if (isLoading) {
    return <ExperimentDetailSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} reset={() => void refetch()} />;
  }

  if (!experiment) {
    return (
      <EmptyState title="Experiment not found" description="This experiment could not be loaded." />
    );
  }

  const judgmentSets = judgmentData?.records ?? [];
  const agreementReports = agreementData?.records ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{experiment.value.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {experiment.value.measureType && <Badge variant="secondary">{experiment.value.measureType}</Badge>}
          {experiment.value.taskType && <Badge variant="outline">{experiment.value.taskType}</Badge>}
          <span className="text-sm text-muted-foreground">
            Created {formatRelativeTime(experiment.value.createdAt)}
          </span>
        </div>
      </div>

      {/* Design Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Design Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {experiment.value.design ? (
            <DesignSettings design={experiment.value.design} />
          ) : (
            <p className="text-sm text-muted-foreground">No design settings configured.</p>
          )}
        </CardContent>
      </Card>

      {/* Description and Guidelines */}
      {experiment.value.description || experiment.value.guidelines ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {experiment.value.description ? (
              <p className="text-sm text-muted-foreground">{experiment.value.description}</p>
            ) : null}
            {experiment.value.guidelines ? (
              <p className="text-sm whitespace-pre-wrap">{experiment.value.guidelines}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Response Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preview of the response control for this task type (view-only).
          </p>
        </CardHeader>
        <CardContent>
          <JudgmentResponseControl
            taskType={experiment.value.taskType ?? 'likert'}
            labels={experiment.value.labels}
            scaleMin={experiment.value.scaleMin}
            scaleMax={experiment.value.scaleMax}
            onResponse={() => {
              // Response preview (read-only)
            }}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Judgment Sets */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Judgment Sets ({judgmentSets.length})</h2>
        {judgmentSets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No judgment sets linked to this experiment.
          </p>
        ) : (
          <div className="space-y-2">
            {judgmentSets.map((set) => (
              <Card key={set.uri}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{set.uri.split('/')[2]}</p>
                    <p className="text-xs text-muted-foreground">
                      {set.value.judgments.length} judgments
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(set.value.createdAt)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Agreement Reports */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Agreement Reports ({agreementReports.length})
        </h2>
        {agreementReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agreement reports computed for this experiment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agreementReports.map((report) => (
              <AgreementReportCard key={report.uri} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton for the experiment detail view.
 */
function ExperimentDetailSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-1/3" />
        <div className="mt-2 flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}

export { ExperimentDetailContent };
