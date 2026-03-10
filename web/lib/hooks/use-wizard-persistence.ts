'use client';

/**
 * Persistence hook for the import wizard state using localStorage.
 *
 * Saves wizard progress so users can resume after an accidental page reload.
 * File objects cannot be serialized, so only metadata (name, size) is persisted;
 * the user is prompted to re-upload the same file when resuming.
 *
 * @module
 */

import { useCallback, useEffect, useState } from 'react';

import type { FieldMapping } from '@/components/import';

const STORAGE_KEY = 'layers:import-wizard';

/** Maximum age (in milliseconds) before a saved session is considered stale. */
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Serializable wizard state stored in localStorage.
 */
interface WizardPersistedState {
  step: number;
  format: string | null;
  fileName: string | null;
  fileSize: number | null;
  mappings: FieldMapping[];
  previewRows: string[][] | null;
  savedAt: number;
}

/**
 * Return value of the useWizardPersistence hook.
 */
interface WizardPersistenceResult {
  /** The recovered state, if any valid session was found. */
  savedState: WizardPersistedState | null;
  /** Whether the resume banner should be displayed. */
  showResumeBanner: boolean;
  /** Accept the saved state and dismiss the banner. */
  acceptResume: () => void;
  /** Discard the saved state, clear storage, and dismiss the banner. */
  startFresh: () => void;
  /** Persist the current wizard state to localStorage. */
  saveState: (state: WizardPersistedState) => void;
  /** Remove saved state from localStorage (call on successful import). */
  clearSavedState: () => void;
}

/**
 * Reads and validates saved wizard state from localStorage.
 *
 * Returns null if no state exists, if the JSON is corrupted, or if the
 * saved session is older than MAX_AGE_MS.
 */
function readSavedState(): WizardPersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const state = parsed as Record<string, unknown>;

    // Validate required fields
    if (typeof state['step'] !== 'number') return null;
    if (typeof state['savedAt'] !== 'number') return null;

    // Check staleness
    const age = Date.now() - (state['savedAt'] as number);
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      step: state['step'] as number,
      format: (state['format'] as string | null) ?? null,
      fileName: (state['fileName'] as string | null) ?? null,
      fileSize: (state['fileSize'] as number | null) ?? null,
      mappings: Array.isArray(state['mappings']) ? (state['mappings'] as FieldMapping[]) : [],
      previewRows: Array.isArray(state['previewRows'])
        ? (state['previewRows'] as string[][])
        : null,
      savedAt: state['savedAt'] as number,
    };
  } catch {
    // Corrupted localStorage entry; silently discard
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Manages localStorage persistence for the import wizard.
 *
 * On mount, checks for a saved session less than 1 hour old. If found,
 * exposes it via `savedState` and shows a resume banner. The caller
 * decides whether to restore state via `acceptResume` or discard it
 * via `startFresh`.
 */
function useWizardPersistence(): WizardPersistenceResult {
  const [savedState, setSavedState] = useState<WizardPersistedState | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Read saved state on mount
  useEffect(() => {
    const state = readSavedState();
    if (state !== null) {
      setSavedState(state);
      setShowResumeBanner(true);
    }
  }, []);

  const acceptResume = useCallback(() => {
    setShowResumeBanner(false);
  }, []);

  const startFresh = useCallback(() => {
    setSavedState(null);
    setShowResumeBanner(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const saveState = useCallback((state: WizardPersistedState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage full or unavailable; ignore silently
    }
  }, []);

  const clearSavedState = useCallback(() => {
    setSavedState(null);
    setShowResumeBanner(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    savedState,
    showResumeBanner,
    acceptResume,
    startFresh,
    saveState,
    clearSavedState,
  };
}

export type { WizardPersistedState, WizardPersistenceResult };
export { useWizardPersistence };
