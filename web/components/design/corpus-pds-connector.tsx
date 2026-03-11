'use client';

/**
 * Dialog for connecting to a corpus PDS.
 *
 * Allows users to authenticate against a separate ATProto PDS that
 * hosts corpus data. When connected, records created in the /design
 * section can be written to the corpus PDS instead of the user's PDS.
 *
 * The connection flow uses OAuth:
 * 1. User enters the corpus account handle
 * 2. Browser redirects to the corpus PDS for authentication
 * 3. On callback, the corpus session is restored and the project
 *    context is updated with the corpus agent
 *
 * Corpus credentials are stored only in the browser session (IndexedDB
 * via the BrowserOAuthClient). On page refresh, the session can be
 * restored automatically if the tokens have not expired.
 *
 * @module
 */

import { useCallback, useState } from 'react';
import { Loader2, Unplug, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { syncRecordWithAppview } from '@/lib/atproto/record-creator';
import {
  getCorpusOAuthClient,
  setCorpusAuthPending,
  clearCorpusAuthPending,
} from '@/lib/atproto/corpus-session';

import { useProjectContext } from './project-context';

// =============================================================================
// Connected state display
// =============================================================================

interface ConnectedStateProps {
  readonly corpusDid: string;
  readonly corpusHandle: string;
  readonly onDisconnect: () => void;
  readonly onSync: () => void;
  readonly isSyncing: boolean;
}

function ConnectedState({
  corpusDid,
  corpusHandle,
  onDisconnect,
  onSync,
  isSyncing,
}: ConnectedStateProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Connected</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{corpusHandle}</p>
          <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">{corpusDid}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 size-3" />
          )}
          Sync
        </Button>
        <Button variant="outline" size="sm" onClick={onDisconnect}>
          <Unplug className="mr-1 size-3" />
          Disconnect
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Connect form
// =============================================================================

interface ConnectFormProps {
  readonly projectUri: string;
}

function ConnectForm({ projectUri }: ConnectFormProps): React.JSX.Element {
  const [handle, setHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(): Promise<void> {
    const trimmed = handle.trim();
    if (!trimmed) {
      setError('Enter a handle or PDS URL.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Store redirect state so the project page can detect and restore
      // the corpus session after the OAuth redirect completes.
      setCorpusAuthPending(trimmed, projectUri);

      const client = getCorpusOAuthClient();
      // This call redirects the browser to the corpus PDS for authentication.
      // The page will not continue executing past this point.
      await client.authorize(trimmed);
    } catch (err) {
      // Clear pending state on failure
      clearCorpusAuthPending();

      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      toast.error(`Failed to connect: ${message}`);
      setIsConnecting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="corpus-handle">Handle or PDS URL</Label>
        <Input
          id="corpus-handle"
          placeholder="corpus.example.com"
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void handleConnect();
            }
          }}
          disabled={isConnecting}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Enter the handle of the corpus account or the URL of the PDS hosting the corpus data. You
        will be redirected to authenticate.
      </p>

      <Button onClick={() => void handleConnect()} disabled={isConnecting || !handle.trim()}>
        {isConnecting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Connect
      </Button>
    </div>
  );
}

// =============================================================================
// Main dialog
// =============================================================================

interface CorpusPdsConnectorProps {
  /** Controlled open state. */
  readonly open?: boolean;
  /** Called when the dialog open state changes. */
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog for connecting to and managing a corpus PDS connection.
 *
 * When no corpus is connected, shows a form to enter a handle and
 * initiate OAuth. When connected, shows the corpus details with
 * disconnect and sync actions.
 */
function CorpusPdsConnector({ open, onOpenChange }: CorpusPdsConnectorProps): React.JSX.Element {
  const { projectUri, writeTarget, clearCorpusConnection } = useProjectContext();
  const [isSyncing, setIsSyncing] = useState(false);

  const isCorpusConnected = writeTarget.kind === 'corpus';

  const handleDisconnect = useCallback((): void => {
    clearCorpusConnection();
    toast.success('Corpus PDS disconnected.');
  }, [clearCorpusConnection]);

  async function handleSync(): Promise<void> {
    if (writeTarget.kind !== 'corpus') return;

    setIsSyncing(true);
    try {
      // Best-effort re-index. A full implementation would enumerate
      // records in the corpus PDS and request indexing for each.
      await syncRecordWithAppview(projectUri, '');
      toast.success('Sync requested. Records will be re-indexed shortly.');
    } catch {
      toast.error('Sync request failed.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Corpus PDS</DialogTitle>
          <DialogDescription>
            Connect to a corpus PDS to write records there instead of your personal PDS. Credentials
            are stored only for this browser session.
          </DialogDescription>
        </DialogHeader>

        {isCorpusConnected ? (
          <ConnectedState
            corpusDid={writeTarget.corpusDid}
            corpusHandle={writeTarget.corpusHandle}
            onDisconnect={handleDisconnect}
            onSync={() => void handleSync()}
            isSyncing={isSyncing}
          />
        ) : (
          <ConnectForm projectUri={projectUri} />
        )}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export { CorpusPdsConnector };
