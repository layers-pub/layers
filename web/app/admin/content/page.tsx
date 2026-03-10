'use client';

/**
 * Admin content management page with tabs for expressions, corpora,
 * ontologies, and annotation layers.
 *
 * @module
 */

import { useState } from 'react';
import { Eye, Search, Trash2 } from 'lucide-react';

import { useAdminContent } from '@/lib/hooks/use-admin';
import type { AdminContentItem } from '@/lib/hooks/use-admin';
import { formatRelativeTime, truncateText } from '@/lib/utils/format';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// =============================================================================
// CONTENT TABLE
// =============================================================================

const CONTENT_TYPES = [
  { value: 'expressions', label: 'Expressions' },
  { value: 'corpora', label: 'Corpora' },
  { value: 'ontologies', label: 'Ontologies' },
  { value: 'annotation-layers', label: 'Annotation Layers' },
] as const;

interface ContentTableProps {
  readonly items: AdminContentItem[];
  readonly isLoading: boolean;
}

function ContentTable({ items, isLoading }: ContentTableProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No content found matching the current filters.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>URI</TableHead>
            <TableHead>Creator DID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.uri}>
              <TableCell className="min-w-0">
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-left">
                    <code className="text-xs">{truncateText(item.uri, 50)}</code>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md">
                    <p className="break-all font-mono text-xs">{item.uri}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <code className="text-xs text-muted-foreground">{truncateText(item.did, 30)}</code>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatRelativeTime(item.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon-xs">
                    <Eye className="h-3 w-3" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button variant="ghost" size="icon-xs">
                    <Trash2 className="h-3 w-3 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function ContentPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('expressions');
  const [searchQuery, setSearchQuery] = useState('');
  const filters = searchQuery.length >= 2 ? { search: searchQuery } : {};
  const { data, isLoading } = useAdminContent(activeTab, filters);

  return (
    <div className="space-y-6">
      <PageHeader title="Content Management" description="Browse and manage indexed records" />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by URI or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {data?.total !== undefined ? (
          <span className="text-sm text-muted-foreground">
            {data.total.toLocaleString()} {data.total === 1 ? 'record' : 'records'}
          </span>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {CONTENT_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONTENT_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value}>
            <Card>
              <CardContent className="pt-4">
                <ContentTable items={data?.items ?? []} isLoading={isLoading} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default ContentPage;
