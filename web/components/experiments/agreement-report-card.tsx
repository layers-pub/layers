/**
 * Card component for displaying agreement reports.
 *
 * @module
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgreementReport } from '@/lib/hooks/use-experiments';

interface AgreementReportCardProps {
  /** The agreement report to display. */
  report: AgreementReport;
}

/**
 * Returns a color class based on the agreement value.
 * Green for > 0.8, amber for 0.5-0.8, red for < 0.5.
 */
function getAgreementColor(value: number): string {
  if (value >= 0.8) return 'text-green-600';
  if (value >= 0.5) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Returns a background class based on the agreement value.
 */
function getAgreementBg(value: number): string {
  if (value >= 0.8) return 'bg-green-50 border-green-200';
  if (value >= 0.5) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

/**
 * Renders a card displaying an agreement report with metric, value,
 * annotator count, and item count.
 */
function AgreementReportCard({ report }: AgreementReportCardProps): React.JSX.Element {
  const metricValue = report.value.value ?? 0;
  const displayValue = metricValue.toFixed(3);

  return (
    <Card className={cn('border', getAgreementBg(metricValue))}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{report.value.metric ?? 'Unknown'}</span>
          <Badge variant="outline" className="font-mono">
            {report.value.numAnnotators ?? 0} annotators
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-3xl font-bold tabular-nums', getAgreementColor(metricValue))}>
            {displayValue}
          </span>
          <span className="text-sm text-muted-foreground">/ 1.000</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {report.value.numItems ?? 0} items evaluated
        </p>
      </CardContent>
    </Card>
  );
}

export type { AgreementReportCardProps };
export { AgreementReportCard };
