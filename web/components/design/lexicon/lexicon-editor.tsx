'use client';

/**
 * Full lexicon editor for a single resource collection.
 *
 * Two-panel layout: entry table (left, ~60% width) + editor panel
 * (right, ~40% width). The editor panel toggles between the entry
 * creation/edit form and the resource query panel.
 *
 * @module
 */

import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAuth } from '@/lib/auth';
import {
  createResourceEntryRecord,
  createCollectionMembershipRecord,
  deleteRecord,
  syncRecordWithAppview,
  syncDeleteWithAppview,
} from '@/lib/atproto/record-creator';
import { useProjectCollection, useCollectionEntries, useEntries } from '@/lib/hooks/use-design';
import { useQueryClient } from '@tanstack/react-query';
import { collectionMembershipKeys, resourceEntryKeys } from '@/lib/hooks/keys';
import type { EntryFormValues } from '@/lib/schemas/design';

import { useDesignShortcuts } from '@/lib/hooks/use-design-shortcuts';

import { EntryForm } from './entry-form';
import { EntryTable, type EntryView } from './entry-table';
import { ResourceQueryPanel } from './resource-query-panel';

// =============================================================================
// PROPS
// =============================================================================

interface LexiconEditorProps {
  readonly collectionUri: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

function LexiconEditor({ collectionUri }: LexiconEditorProps): React.JSX.Element {
  const { user } = useAuth();
  const agent = useAgent();
  const queryClient = useQueryClient();

  const [selectedEntryUri, setSelectedEntryUri] = useState<string | undefined>();
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'query'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch collection metadata
  const { data: collection, isLoading: isLoadingCollection } = useProjectCollection(collectionUri);

  // Fetch memberships for this collection
  const { data: membershipsData, isLoading: isLoadingMemberships } = useCollectionEntries(
    collectionUri,
    { limit: 200 },
  );

  // Fetch all entries for the current user
  const { data: entriesData, isLoading: isLoadingEntries } = useEntries({
    repo: user?.did ?? '',
    limit: 500,
  });

  // Join memberships with entries to produce the table data
  const entries: EntryView[] = useMemo(() => {
    if (!membershipsData?.records || !entriesData?.records) return [];

    const entryMap = new Map(entriesData.records.map((r) => [r.uri, r.value]));

    const result: EntryView[] = [];
    for (const membership of membershipsData.records) {
      const entry = entryMap.get(membership.value.entryRef);
      if (!entry) continue;
      result.push({
        uri: membership.value.entryRef,
        membershipUri: membership.uri,
        form: entry.form,
        lemma: entry.lemma,
        languages: entry.languages,
        features: entry.features as EntryView['features'],
      });
    }
    return result;
  }, [membershipsData?.records, entriesData?.records]);

  // Find the selected entry for editing
  const selectedEntry = useMemo(() => {
    if (!selectedEntryUri) return undefined;
    return entries.find((e) => e.uri === selectedEntryUri);
  }, [entries, selectedEntryUri]);

  const invalidateQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: resourceEntryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: collectionMembershipKeys.list({ collectionRef: collectionUri }),
      }),
    ]);
  }, [queryClient, collectionUri]);

  // Handle creating a new entry
  async function handleCreate(values: EntryFormValues): Promise<void> {
    if (!agent) {
      toast.error('You must be signed in.');
      return;
    }

    setIsSubmitting(true);

    try {
      const featureMap = values.features?.length ? { entries: values.features } : undefined;

      const entryResult = await createResourceEntryRecord(agent, {
        form: values.form,
        lemma: values.lemma,
        languages: values.languages,
        features: featureMap,
      });

      const membershipResult = await createCollectionMembershipRecord(agent, {
        collectionRef: collectionUri,
        entryRef: entryResult.uri,
      });

      // Best-effort immediate indexing
      await Promise.allSettled([
        syncRecordWithAppview(entryResult.uri, ''),
        syncRecordWithAppview(membershipResult.uri, ''),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await invalidateQueries();
      toast.success('Entry added.');
    } catch {
      toast.error('Failed to create entry.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle deleting an entry
  async function handleDelete(entry: EntryView): Promise<void> {
    if (!agent) {
      toast.error('You must be signed in.');
      return;
    }

    try {
      await Promise.all([deleteRecord(agent, entry.uri), deleteRecord(agent, entry.membershipUri)]);

      await Promise.allSettled([
        syncDeleteWithAppview(entry.uri, ''),
        syncDeleteWithAppview(entry.membershipUri, ''),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (selectedEntryUri === entry.uri) {
        setSelectedEntryUri(undefined);
        setEditorMode('create');
      }

      await invalidateQueries();
      toast.success('Entry deleted.');
    } catch {
      toast.error('Failed to delete entry.');
    }
  }

  // Handle editing an entry
  function handleEdit(uri: string): void {
    setSelectedEntryUri(uri);
    setEditorMode('edit');
  }

  // Handle selecting an entry in the table
  function handleSelect(uri: string): void {
    setSelectedEntryUri(uri);
  }

  // Keyboard shortcuts
  useDesignShortcuts({
    onNew: () => {
      setEditorMode('create');
      setSelectedEntryUri(undefined);
    },
    onCancel: () => {
      if (editorMode === 'edit') {
        setEditorMode('create');
        setSelectedEntryUri(undefined);
      }
    },
  });

  const isLoading = isLoadingCollection || isLoadingMemberships || isLoadingEntries;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">{collection?.value.name ?? 'Lexicon Editor'}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{entries.length} entries</Badge>
              {collection?.value.languages ? (
                <Badge variant="outline">{collection.value.languages}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={editorMode === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setEditorMode('create');
              setSelectedEntryUri(undefined);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            New Entry
          </Button>
          <Button
            variant={editorMode === 'query' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditorMode('query')}
          >
            Query Resources
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left panel: entry table (~60%) */}
        <div className="min-w-0 lg:col-span-3">
          <Card>
            <CardContent className="pt-4">
              <EntryTable
                entries={entries}
                onSelect={handleSelect}
                selectedUri={selectedEntryUri}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right panel: editor/query (~40%) */}
        <div className="min-w-0 lg:col-span-2">
          {editorMode === 'query' ? (
            <ResourceQueryPanel />
          ) : editorMode === 'edit' && selectedEntry ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Edit Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <EntryForm
                  key={selectedEntryUri}
                  defaultValues={{
                    form: selectedEntry.form,
                    lemma: selectedEntry.lemma ?? '',
                    languages: [...(selectedEntry.languages ?? [])],
                    features: selectedEntry.features?.entries ?? [],
                  }}
                  onSubmit={handleCreate}
                  onCancel={() => {
                    setEditorMode('create');
                    setSelectedEntryUri(undefined);
                  }}
                  isSubmitting={isSubmitting}
                  mode="edit"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Add Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <EntryForm onSubmit={handleCreate} isSubmitting={isSubmitting} mode="create" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export { LexiconEditor };
export type { LexiconEditorProps };
