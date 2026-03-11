'use client';

/**
 * React context providing project-level state for the /design section.
 *
 * Tracks the active write target (user PDS or corpus PDS) and provides
 * the correct ATProto Agent for record creation based on the selection.
 *
 * @module
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Agent } from '@atproto/api';
import { toast } from 'sonner';

import { useAgent } from '@/lib/auth';

import { restoreCorpusSession } from '@/lib/atproto/corpus-session';

// =============================================================================
// Types
// =============================================================================

/** Write target: either the user's own PDS or a connected corpus PDS. */
type WriteTarget =
  | { kind: 'user' }
  | { kind: 'corpus'; corpusDid: string; corpusHandle: string; corpusAgent: Agent };

/** Serializable form of WriteTarget for sessionStorage persistence. */
interface StoredWriteTarget {
  kind: 'user' | 'corpus';
  corpusDid?: string;
  corpusHandle?: string;
}

interface ProjectContextValue {
  /** AT-URI of the current project (resource collection). */
  readonly projectUri: string;
  /** Current write target selection. */
  readonly writeTarget: WriteTarget;
  /** Update the active write target. */
  readonly setWriteTarget: (target: WriteTarget) => void;
  /** Returns the corpus agent when writing to a corpus PDS, or the user agent otherwise. */
  readonly getActiveAgent: () => Agent | null;
  /** Clears the corpus connection and resets to user PDS. */
  readonly clearCorpusConnection: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// =============================================================================
// Storage helpers
// =============================================================================

function storageKey(projectUri: string): string {
  return `layers:write-target:${projectUri}`;
}

function loadStoredTarget(projectUri: string): StoredWriteTarget | null {
  try {
    const raw = sessionStorage.getItem(storageKey(projectUri));
    if (!raw) return null;
    return JSON.parse(raw) as StoredWriteTarget;
  } catch {
    return null;
  }
}

function saveStoredTarget(projectUri: string, target: WriteTarget): void {
  try {
    const stored: StoredWriteTarget = {
      kind: target.kind,
      corpusDid: target.kind === 'corpus' ? target.corpusDid : undefined,
      corpusHandle: target.kind === 'corpus' ? target.corpusHandle : undefined,
    };
    sessionStorage.setItem(storageKey(projectUri), JSON.stringify(stored));
  } catch {
    // sessionStorage may be unavailable; ignore silently
  }
}

function clearStoredTarget(projectUri: string): void {
  try {
    sessionStorage.removeItem(storageKey(projectUri));
  } catch {
    // sessionStorage may be unavailable; ignore silently
  }
}

// =============================================================================
// Provider
// =============================================================================

interface ProjectContextProviderProps {
  readonly projectUri: string;
  readonly children: ReactNode;
}

/**
 * Provides project-level context including the active write target.
 *
 * On mount, restores the write target kind from sessionStorage. If the
 * stored target was a corpus PDS, the user must reconnect (the corpus
 * agent is ephemeral and not persisted for security).
 */
function ProjectContextProvider({
  projectUri,
  children,
}: ProjectContextProviderProps): React.JSX.Element {
  const userAgent = useAgent();
  const [writeTarget, setWriteTargetState] = useState<WriteTarget>({ kind: 'user' });

  // Restore write target kind from sessionStorage on mount
  useEffect(() => {
    const stored = loadStoredTarget(projectUri);
    if (stored && stored.kind === 'user') {
      setWriteTargetState({ kind: 'user' });
    }
    // If stored kind was 'corpus', we cannot restore the agent from
    // sessionStorage alone. The corpus OAuth session restore below
    // handles reconnection via IndexedDB.
  }, [projectUri]);

  // After a corpus OAuth redirect, restore the corpus session from
  // IndexedDB and update the write target automatically.
  useEffect(() => {
    let cancelled = false;

    async function restore(): Promise<void> {
      const result = await restoreCorpusSession();
      if (cancelled || !result) return;

      const corpusAgent = new Agent(result.session);
      const target: WriteTarget = {
        kind: 'corpus',
        corpusDid: result.session.did,
        corpusHandle: result.handle,
        corpusAgent,
      };

      setWriteTargetState(target);
      saveStoredTarget(projectUri, target);
      toast.success(`Connected to corpus PDS: ${result.handle}`);
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, [projectUri]);

  const setWriteTarget = useCallback(
    (target: WriteTarget) => {
      setWriteTargetState(target);
      saveStoredTarget(projectUri, target);
    },
    [projectUri],
  );

  const clearCorpusConnection = useCallback(() => {
    setWriteTargetState({ kind: 'user' });
    clearStoredTarget(projectUri);
  }, [projectUri]);

  const getActiveAgent = useCallback((): Agent | null => {
    if (writeTarget.kind === 'corpus') {
      return writeTarget.corpusAgent;
    }
    return userAgent;
  }, [writeTarget, userAgent]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projectUri,
      writeTarget,
      setWriteTarget,
      getActiveAgent,
      clearCorpusConnection,
    }),
    [projectUri, writeTarget, setWriteTarget, getActiveAgent, clearCorpusConnection],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/**
 * Returns the current project context.
 *
 * Must be called within a ProjectContextProvider.
 */
function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectContextProvider');
  }
  return context;
}

export type { WriteTarget, ProjectContextValue };
export { ProjectContextProvider, useProjectContext };
