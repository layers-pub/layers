'use client';

/**
 * Admin Neo4j graph statistics page.
 *
 * @module
 */

import { GitBranch } from 'lucide-react';

import { useAdminGraphStats } from '@/lib/hooks/use-admin';
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

function GraphStatsPage(): React.JSX.Element {
  const { data, isLoading } = useAdminGraphStats();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const nodeEntries = Object.entries(data.nodesByLabel).sort(([, a], [, b]) => b - a);
  const edgeEntries = Object.entries(data.edgesByType).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <PageHeader title="Graph Statistics" description="Neo4j node and edge counts" />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Nodes</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalNodes.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Edges</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEdges.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Node Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Node Distribution by Label</CardTitle>
        </CardHeader>
        <CardContent>
          {nodeEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No node data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodeEntries.map(([label, count]) => (
                  <TableRow key={label}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {data.totalNodes > 0 ? ((count / data.totalNodes) * 100).toFixed(1) : '0.0'}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edge Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Relationship Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {edgeEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No edge data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relationship Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edgeEntries.map(([type, count]) => (
                  <TableRow key={type}>
                    <TableCell className="font-mono font-medium">{type}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {data.totalEdges > 0 ? ((count / data.totalEdges) * 100).toFixed(1) : '0.0'}%
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

export default GraphStatsPage;
