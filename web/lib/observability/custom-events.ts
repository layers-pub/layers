/**
 * Layers-specific custom event tracking for Grafana Faro.
 *
 * Provides typed event helpers for expression viewing, annotation
 * creation, search interactions, format imports, and other domain
 * actions. All string attributes are scrubbed for PII before sending.
 *
 * @module
 */

import { getFaro } from './faro';
import { scrubString } from './privacy';

// ---- Helpers ----

/**
 * Pushes a named event to Faro with scrubbed string attributes.
 *
 * Silently no-ops if Faro is not initialized or if the push fails.
 */
function pushEvent(name: string, attributes?: Readonly<Record<string, unknown>>): void {
  try {
    const faro = getFaro();
    if (!faro) {
      return;
    }

    const safe: Record<string, string> = {};
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value === undefined || value === null) {
          continue;
        }
        const str = typeof value === 'string' ? value : String(value);
        safe[key] = scrubString(str);
      }
    }

    faro.api.pushEvent(name, safe);
  } catch {
    // Silently swallow event push errors.
  }
}

/**
 * Hashes a DID to a fixed-length hex string for privacy-safe tracking.
 *
 * Uses an FNV-1a-inspired hash; this is not cryptographically secure,
 * but sufficient for analytics bucketing without exposing raw DIDs.
 */
function hashDid(did: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < did.length; i++) {
    hash ^= did.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ---- Timer utility ----

/**
 * Handle returned by `events.startTiming()` to end a timing measurement.
 */
interface TimerHandle {
  /** Ends the timer and pushes a timing event with optional extra attributes. */
  readonly end: (attributes?: Readonly<Record<string, string>>) => void;
}

// ---- Event definitions ----

/**
 * Typed event tracking functions for the Layers frontend.
 *
 * Each function maps to a specific user action or system event,
 * with typed attributes that are scrubbed before transmission.
 */
const events = {
  /**
   * Tracks an expression detail page view.
   */
  expressionView(attrs: {
    readonly expressionUri: string;
    readonly source: 'search' | 'browse' | 'direct' | 'corpus';
  }): void {
    pushEvent('expression:view', {
      expressionUri: attrs.expressionUri,
      source: attrs.source,
    });
  },

  /**
   * Tracks creation of an annotation.
   */
  annotationCreate(attrs: {
    readonly expressionUri: string;
    readonly kind: string;
    readonly subkind?: string;
    readonly anchorType: string;
  }): void {
    pushEvent('annotation:create', {
      expressionUri: attrs.expressionUri,
      kind: attrs.kind,
      subkind: attrs.subkind,
      anchorType: attrs.anchorType,
    });
  },

  /**
   * Tracks editing an annotation layer.
   */
  annotationEdit(attrs: {
    readonly layerUri: string;
    readonly action: 'add' | 'remove' | 'modify';
    readonly kind: string;
  }): void {
    pushEvent('annotation:edit', {
      layerUri: attrs.layerUri,
      action: attrs.action,
      kind: attrs.kind,
    });
  },

  /**
   * Tracks a search query execution.
   */
  search(attrs: {
    readonly query: string;
    readonly resultCount: number;
    readonly filters?: Readonly<Record<string, string>>;
    readonly latency?: number;
  }): void {
    const flatAttrs: Record<string, unknown> = {
      query: attrs.query,
      resultCount: attrs.resultCount,
    };

    if (attrs.latency !== undefined) {
      flatAttrs['latency'] = attrs.latency;
    }

    if (attrs.filters) {
      for (const [key, value] of Object.entries(attrs.filters)) {
        flatAttrs[`filter.${key}`] = value;
      }
    }

    pushEvent('search:execute', flatAttrs);
  },

  /**
   * Tracks a click on a search result.
   */
  searchClick(attrs: {
    readonly query: string;
    readonly itemUri: string;
    readonly position: number;
  }): void {
    pushEvent('search:click', {
      query: attrs.query,
      itemUri: attrs.itemUri,
      position: attrs.position,
    });
  },

  /**
   * Tracks the start of a format import.
   */
  importStart(attrs: { readonly format: string; readonly fileSize: number }): void {
    pushEvent('import:start', {
      format: attrs.format,
      fileSize: attrs.fileSize,
    });
  },

  /**
   * Tracks the completion of a format import.
   */
  importComplete(attrs: {
    readonly format: string;
    readonly expressions: number;
    readonly segmentations: number;
    readonly layers: number;
    readonly durationMs: number;
  }): void {
    pushEvent('import:complete', {
      format: attrs.format,
      expressions: attrs.expressions,
      segmentations: attrs.segmentations,
      layers: attrs.layers,
      durationMs: attrs.durationMs,
    });
  },

  /**
   * Tracks high-level user actions (login, logout, corpus creation, etc.).
   */
  userAction(attrs: {
    readonly action: 'login' | 'logout' | 'create-corpus' | 'create-ontology' | 'export' | 'import';
    readonly result?: 'success' | 'failure' | 'cancelled';
  }): void {
    pushEvent('user:action', {
      action: attrs.action,
      result: attrs.result,
    });
  },

  /**
   * Tracks browsing a corpus detail page.
   */
  corpusBrowse(attrs: { readonly corpusUri: string; readonly corpusName: string }): void {
    pushEvent('corpus:browse', {
      corpusUri: attrs.corpusUri,
      corpusName: attrs.corpusName,
    });
  },

  /**
   * Tracks browsing an ontology detail page.
   */
  ontologyBrowse(attrs: { readonly ontologyUri: string; readonly domain: string }): void {
    pushEvent('ontology:browse', {
      ontologyUri: attrs.ontologyUri,
      domain: attrs.domain,
    });
  },

  // ---- Design section events ----

  /**
   * Tracks a design section action (project, entry, template, experiment CRUD).
   */
  designAction(attrs: {
    readonly action:
      | 'project-create'
      | 'entry-create'
      | 'entry-delete'
      | 'template-create'
      | 'template-save'
      | 'experiment-create'
      | 'experiment-save';
    readonly projectUri?: string;
    readonly result?: 'success' | 'failure';
  }): void {
    pushEvent('design:action', {
      action: attrs.action,
      projectUri: attrs.projectUri,
      result: attrs.result,
    });
  },

  /**
   * Tracks a filling generation event in the simulate panel.
   */
  designFilling(attrs: {
    readonly strategy: string;
    readonly count: number;
    readonly durationMs: number;
  }): void {
    pushEvent('design:filling', {
      strategy: attrs.strategy,
      count: attrs.count,
      durationMs: attrs.durationMs,
    });
  },

  /**
   * Tracks a bead import in the I/O panel.
   */
  designImport(attrs: { readonly format: string; readonly itemCount: number }): void {
    pushEvent('design:import', {
      format: attrs.format,
      itemCount: attrs.itemCount,
    });
  },

  /**
   * Tracks a bead export from the I/O panel.
   */
  designExport(attrs: { readonly itemCount: number }): void {
    pushEvent('design:export', {
      itemCount: attrs.itemCount,
    });
  },

  /**
   * Tracks a sidecar query (CSP, MLM, or experiment preview).
   */
  designSidecar(attrs: {
    readonly source: 'csp' | 'mlm' | 'experiment-preview';
    readonly durationMs: number;
    readonly resultCount: number;
  }): void {
    pushEvent('design:sidecar', {
      source: attrs.source,
      durationMs: attrs.durationMs,
      resultCount: attrs.resultCount,
    });
  },

  /**
   * Pushes a generic custom event with arbitrary attributes.
   *
   * Use the named methods above for known event types. Use this
   * method only for ad-hoc or experimental tracking.
   *
   * @param name - event name
   * @param attributes - optional key-value attributes
   */
  custom(name: string, attributes?: Readonly<Record<string, unknown>>): void {
    pushEvent(`custom:${name}`, attributes);
  },

  /**
   * Reports a named timing measurement.
   *
   * @param name - measurement name
   * @param durationMs - duration in milliseconds
   * @param attributes - optional string attributes
   */
  timing(name: string, durationMs: number, attributes?: Readonly<Record<string, string>>): void {
    pushEvent(`timing:${name}`, {
      duration: durationMs,
      ...attributes,
    });
  },

  /**
   * Starts a timing measurement and returns a handle to end it.
   *
   * @param name - measurement name
   * @returns an object with an `end` method that pushes the timing event
   *
   * @example
   * ```typescript
   * const timer = events.startTiming('annotation-render');
   * // ... do work ...
   * timer.end({ kind: 'token-tag' });
   * ```
   */
  startTiming(name: string): TimerHandle {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      end(attributes?: Readonly<Record<string, string>>): void {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const durationMs = Math.round(now - start);
        events.timing(name, durationMs, attributes);
      },
    };
  },
} as const;

export { events, hashDid };
export type { TimerHandle };
