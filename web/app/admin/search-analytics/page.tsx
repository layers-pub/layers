'use client';

/**
 * Admin search analytics page showing query metrics and zero-result queries.
 *
 * @module
 */

import { useMemo } from 'react';

import { useAdminSearchAnalytics } from '@/lib/hooks/use-admin';
import { BarChart } from '@/components/admin/bar-chart';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// =============================================================================
// MAIN PAGE
// =============================================================================

function SearchAnalyticsPage(): React.JSX.Element {
  const { data, isLoading } = useAdminSearchAnalytics();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const volumeData = useMemo(
    () => data.topQueries.map((row) => ({ label: row.query, value: row.count })),
    [data.topQueries],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Search Analytics" description="Query metrics and search performance" />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSearches.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgLatencyMs.toFixed(0)}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Queries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topQueries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No search data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Avg Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topQueries.map((row) => (
                  <TableRow key={row.query}>
                    <TableCell className="font-medium">{row.query}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {row.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {row.avgLatencyMs.toFixed(0)}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Search Volume by Query */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Search Volume by Query</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={volumeData} height={192} ariaLabel="Search volume by top query" />
        </CardContent>
      </Card>

      {/* Zero-Result Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Zero-Result Queries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.zeroResultQueries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No zero-result queries recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.zeroResultQueries.map((row) => (
                  <TableRow key={row.query}>
                    <TableCell className="font-medium">{row.query}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {row.count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SearchAnalyticsPage;
