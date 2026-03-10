/**
 * React context managing annotation creation state across the workspace.
 *
 * Tracks the current editing mode, selected annotation kind/subkind/formalism,
 * active text/token selection, and pending annotation items. Provides actions
 * to start, modify, save, and cancel annotation creation.
 *
 * @module
 */

'use client';

import * as React from 'react';
import type { Agent } from '@atproto/api';

import { COLLECTIONS } from '@/lib/atproto/record-creator';

import type { Anchor, AnnotationItem, AnnotationKind } from '../annotations/types';

// =============================================================================
// State types
// =============================================================================

/** Workspace interaction mode. */
type WorkspaceMode = 'view' | 'annotate' | 'edit';

/** State managed by the annotation creation reducer. */
interface AnnotationCreationState {
  /** Current workspace interaction mode. */
  mode: WorkspaceMode;
  /** Selected annotation kind for new layers. */
  kind: AnnotationKind;
  /** Subkind text (e.g., "pos", "ner", "dependency"). */
  subkind: string;
  /** Formalism text (e.g., "universal-dependencies"). */
  formalism: string;
  /** AT-URI of the active ontology (for label autocomplete). */
  ontologyRef: string;
  /** Current anchor selection from text/token/temporal/bbox interaction. */
  currentAnchor: Anchor | null;
  /** Pending annotation items not yet saved. */
  pendingItems: AnnotationItem[];
  /** Whether a save operation is in flight. */
  isSaving: boolean;
  /** AT-URI of the expression being annotated. */
  expressionUri: string;
}

// =============================================================================
// Actions
// =============================================================================

type AnnotationCreationAction =
  | { type: 'SET_MODE'; mode: WorkspaceMode }
  | { type: 'SET_KIND'; kind: AnnotationKind }
  | { type: 'SET_SUBKIND'; subkind: string }
  | { type: 'SET_FORMALISM'; formalism: string }
  | { type: 'SET_ONTOLOGY_REF'; ontologyRef: string }
  | { type: 'SET_ANCHOR'; anchor: Anchor | null }
  | { type: 'SET_EXPRESSION_URI'; expressionUri: string }
  | { type: 'ADD_ITEM'; item: AnnotationItem }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_ITEM'; itemId: string; updates: Partial<AnnotationItem> }
  | { type: 'CLEAR_ITEMS' }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'RESET' };

// =============================================================================
// Reducer
// =============================================================================

const INITIAL_STATE: AnnotationCreationState = {
  mode: 'view',
  kind: 'token-tag',
  subkind: '',
  formalism: '',
  ontologyRef: '',
  currentAnchor: null,
  pendingItems: [],
  isSaving: false,
  expressionUri: '',
};

function annotationCreationReducer(
  state: AnnotationCreationState,
  action: AnnotationCreationAction,
): AnnotationCreationState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_KIND':
      return { ...state, kind: action.kind };
    case 'SET_SUBKIND':
      return { ...state, subkind: action.subkind };
    case 'SET_FORMALISM':
      return { ...state, formalism: action.formalism };
    case 'SET_ONTOLOGY_REF':
      return { ...state, ontologyRef: action.ontologyRef };
    case 'SET_ANCHOR':
      return { ...state, currentAnchor: action.anchor };
    case 'SET_EXPRESSION_URI':
      return { ...state, expressionUri: action.expressionUri };
    case 'ADD_ITEM':
      return { ...state, pendingItems: [...state.pendingItems, action.item] };
    case 'REMOVE_ITEM':
      return {
        ...state,
        pendingItems: state.pendingItems.filter((item) => item.id !== action.itemId),
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        pendingItems: state.pendingItems.map((item) =>
          item.id === action.itemId ? { ...item, ...action.updates } : item,
        ),
      };
    case 'CLEAR_ITEMS':
      return { ...state, pendingItems: [], currentAnchor: null };
    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving };
    case 'RESET':
      return { ...INITIAL_STATE, expressionUri: state.expressionUri };
    default:
      return state;
  }
}

// =============================================================================
// Context value
// =============================================================================

interface AnnotationCreationContextValue {
  /** Current annotation creation state. */
  state: AnnotationCreationState;
  /** Dispatch an action to the reducer. */
  dispatch: React.Dispatch<AnnotationCreationAction>;
  /** Begin a new annotation workflow (switches to annotate mode). */
  startAnnotation: () => void;
  /** Add a pending annotation item. */
  addItem: (item: AnnotationItem) => void;
  /** Remove a pending annotation item by ID. */
  removeItem: (itemId: string) => void;
  /** Build the annotation layer record and write it to the user's PDS. */
  saveLayer: (agent: Agent) => Promise<{ uri: string; cid: string }>;
  /** Discard pending items and return to view mode. */
  cancelAnnotation: () => void;
}

const AnnotationCreationContext = React.createContext<AnnotationCreationContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface AnnotationCreationProviderProps {
  /** AT-URI of the expression being annotated. */
  expressionUri: string;
  readonly children: React.ReactNode;
}

/**
 * Provides annotation creation state and actions to the workspace tree.
 *
 * Wraps the workspace so that the toolbar, selection handler, arc editor,
 * and temporal editor can all coordinate through shared state.
 */
function AnnotationCreationProvider({
  expressionUri,
  children,
}: AnnotationCreationProviderProps): React.JSX.Element {
  const [state, dispatch] = React.useReducer(annotationCreationReducer, {
    ...INITIAL_STATE,
    expressionUri,
  });

  // Keep expressionUri in sync if it changes externally
  React.useEffect(() => {
    dispatch({ type: 'SET_EXPRESSION_URI', expressionUri });
  }, [expressionUri]);

  const startAnnotation = React.useCallback(() => {
    dispatch({ type: 'CLEAR_ITEMS' });
    dispatch({ type: 'SET_MODE', mode: 'annotate' });
  }, []);

  const addItem = React.useCallback((item: AnnotationItem) => {
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const removeItem = React.useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  }, []);

  const cancelAnnotation = React.useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const saveLayer = React.useCallback(
    async (agent: Agent): Promise<{ uri: string; cid: string }> => {
      dispatch({ type: 'SET_SAVING', isSaving: true });

      try {
        const did = agent.assertDid;

        const annotations = state.pendingItems.map((item) => ({
          $type: 'pub.layers.annotation.defs#annotation' as const,
          uuid: item.id,
          label: item.label,
          value: item.value,
          tokenIndex: item.tokenIndex,
          headIndex: item.headIndex,
          targetIndex: item.targetIndex,
          anchor: item.anchor ? buildRecordAnchor(item.anchor) : undefined,
          confidence: item.confidence,
          arguments: item.arguments?.map((arg) => ({
            $type: 'pub.layers.annotation.defs#argumentRef' as const,
            role: arg.role,
            target: { localId: arg.targetId },
          })),
          parentId: item.parentId,
          childIds: item.children?.map((child) => child.id),
        }));

        const record = {
          $type: 'pub.layers.annotation.annotationLayer' as const,
          expression: state.expressionUri,
          kind: state.kind,
          subkind: state.subkind || undefined,
          formalism: state.formalism || undefined,
          ontologyRef: state.ontologyRef || undefined,
          annotations,
          createdAt: new Date().toISOString(),
        };

        const response = await agent.com.atproto.repo.createRecord({
          repo: did,
          collection: COLLECTIONS.annotationLayer,
          record,
        });

        dispatch({ type: 'RESET' });

        return { uri: response.data.uri, cid: response.data.cid };
      } finally {
        dispatch({ type: 'SET_SAVING', isSaving: false });
      }
    },
    [
      state.pendingItems,
      state.expressionUri,
      state.kind,
      state.subkind,
      state.formalism,
      state.ontologyRef,
    ],
  );

  const value = React.useMemo<AnnotationCreationContextValue>(
    () => ({
      state,
      dispatch,
      startAnnotation,
      addItem,
      removeItem,
      saveLayer,
      cancelAnnotation,
    }),
    [state, dispatch, startAnnotation, addItem, removeItem, saveLayer, cancelAnnotation],
  );

  return (
    <AnnotationCreationContext.Provider value={value}>
      {children}
    </AnnotationCreationContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns the annotation creation context value.
 *
 * Must be called within an AnnotationCreationProvider.
 */
function useAnnotationCreation(): AnnotationCreationContextValue {
  const context = React.useContext(AnnotationCreationContext);
  if (!context) {
    throw new Error('useAnnotationCreation must be used within an AnnotationCreationProvider');
  }
  return context;
}

/**
 * Returns the annotation creation context value, or null if not inside a
 * provider.
 *
 * Use this in components that may or may not be rendered inside an
 * AnnotationCreationProvider (e.g., TokenOverlay, ExpressionPanel).
 */
function useOptionalAnnotationCreation(): AnnotationCreationContextValue | null {
  return React.useContext(AnnotationCreationContext);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Converts the frontend Anchor type to the record-level anchor shape
 * expected by the annotationLayer lexicon.
 */
function buildRecordAnchor(anchor: Anchor): Record<string, unknown> {
  switch (anchor.type) {
    case 'textSpan':
      return {
        $type: 'pub.layers.defs#textSpan',
        start: anchor.start,
        ending: anchor.end,
      };
    case 'tokenRef':
      return {
        $type: 'pub.layers.defs#tokenRef',
        tokenIndex: anchor.tokenIndex,
      };
    case 'tokenRefSequence':
      return {
        $type: 'pub.layers.defs#tokenRefSequence',
        tokenIndices: anchor.tokenIndices,
      };
    case 'temporalSpan':
      return {
        $type: 'pub.layers.defs#temporalSpan',
        start: anchor.startTime,
        ending: anchor.endTime,
      };
    case 'boundingBox':
      return {
        $type: 'pub.layers.defs#boundingBox',
        x: anchor.x,
        y: anchor.y,
        width: anchor.width,
        height: anchor.height,
      };
    case 'spatioTemporalAnchor':
      return {
        $type: 'pub.layers.defs#spatioTemporalAnchor',
        startTime: anchor.startTime,
        endTime: anchor.endTime,
        x: anchor.x,
        y: anchor.y,
        width: anchor.width,
        height: anchor.height,
      };
    case 'pageAnchor':
      return {
        $type: 'pub.layers.defs#pageAnchor',
        page: anchor.page,
        start: anchor.start,
        ending: anchor.end,
      };
    default:
      return {};
  }
}

export type {
  WorkspaceMode,
  AnnotationCreationState,
  AnnotationCreationAction,
  AnnotationCreationContextValue,
  AnnotationCreationProviderProps,
};
export { AnnotationCreationProvider, useAnnotationCreation, useOptionalAnnotationCreation };
