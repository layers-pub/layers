/**
 * Two-axis annotation renderer registry.
 *
 * @remarks
 * Annotations in Layers vary along two independent axes:
 *
 * - **kind** — token-tag, span, relation, tree, tier, document-tag,
 *   graph (the seven `pub.layers.annotation.*` shapes).
 * - **anchor** — textSpan, tokenRef, tokenRefSequence, temporalSpan,
 *   boundingBox, spatioTemporalAnchor, pageAnchor (where on the
 *   expression the annotation hangs).
 *
 * The registry is a sparse `(kind, anchor) → AnnotationRenderer` map.
 * Pages mount one of four slots (`Inline`, `Card`, `Detail`,
 * `Editor`) and look the renderer up by `(kind, anchor)`. Cells
 * without a registered renderer fall back to the generic renderer
 * that introspects the lexicon's field metadata
 * (`web/lib/forms/generated/<nsid>.fields.ts`) and renders a
 * labelled key/value list — which means **every annotation type,
 * including ones added to lexicons after this revamp, renders
 * out-of-the-box**. Concrete renderers are optimisations over the
 * generic baseline.
 *
 * @packageDocumentation
 */

import type { ComponentType, ReactNode } from 'react';

/** Discriminator for the seven concrete annotation kinds. */
export type AnnotationKind =
  | 'token-tag'
  | 'span'
  | 'relation'
  | 'tree'
  | 'tier'
  | 'document-tag'
  | 'graph';

/** Discriminator for the seven concrete anchor types. */
export type AnchorType =
  | 'textSpan'
  | 'tokenRef'
  | 'tokenRefSequence'
  | 'temporalSpan'
  | 'boundingBox'
  | 'spatioTemporalAnchor'
  | 'pageAnchor';

/** A single annotation as the registry sees it. Concrete fields are
 * borrowed from generated record types via narrowing. */
export interface AnnotationLike {
  /** AT-URI of the underlying record. */
  readonly uri: string;
  /** NSID of the record's lexicon (used to look up field metadata). */
  readonly nsid: string;
  /** Annotation kind discriminator (`pub.layers.annotation.*`). */
  readonly kind: AnnotationKind;
  /** Tagged anchor body. */
  readonly anchor: { readonly $type: AnchorType } & Record<string, unknown>;
  /** Full record value. */
  readonly value: Record<string, unknown>;
}

/** Common props for every render slot. */
export interface AnnotationSlotProps<A extends AnnotationLike = AnnotationLike> {
  readonly annotation: A;
}

/** Optional callbacks supplied by the workspace's edit context. */
export interface AnnotationEditorProps<A extends AnnotationLike = AnnotationLike>
  extends AnnotationSlotProps<A> {
  readonly onSubmit: (next: A['value']) => void | Promise<void>;
  readonly onCancel?: () => void;
}

/** A renderer for one `(kind, anchor)` cell. Slots are optional —
 * unset slots fall through to the generic renderer for that slot. */
export interface AnnotationRenderer<
  K extends AnnotationKind = AnnotationKind,
  A extends AnchorType = AnchorType,
> {
  readonly kind: K;
  readonly anchor: A;
  /** Overlay on the expression surface (text highlights, arc layers, …). */
  readonly Inline?: ComponentType<AnnotationSlotProps>;
  /** Standalone list/feed display. */
  readonly Card?: ComponentType<AnnotationSlotProps>;
  /** Bottom-sheet detail. */
  readonly Detail?: ComponentType<AnnotationSlotProps>;
  /** Workspace editor surface. */
  readonly Editor?: ComponentType<AnnotationEditorProps>;
  /**
   * Tie-breaker when two renderers cover the same cell. Higher wins;
   * defaults to 0. Lets app-bundled renderers override built-ins.
   */
  readonly priority?: number;
  /** Optional label for diagnostics. */
  readonly label?: string;
}

const REGISTRY = new Map<string, AnnotationRenderer>();

function key(kind: AnnotationKind, anchor: AnchorType): string {
  return `${kind}::${anchor}`;
}

/** Register a renderer for one cell. Idempotent on equal entries. */
export function registerAnnotationRenderer(renderer: AnnotationRenderer): void {
  const k = key(renderer.kind, renderer.anchor);
  const existing = REGISTRY.get(k);
  if (!existing || (renderer.priority ?? 0) >= (existing.priority ?? 0)) {
    REGISTRY.set(k, renderer);
  }
}

/** Look up the renderer for `(kind, anchor)`. Returns `undefined` when no concrete renderer is registered. */
export function lookupAnnotationRenderer(
  kind: AnnotationKind,
  anchor: AnchorType,
): AnnotationRenderer | undefined {
  return REGISTRY.get(key(kind, anchor));
}

/** All currently-registered renderers. Useful for diagnostics + storybook. */
export function listAnnotationRenderers(): readonly AnnotationRenderer[] {
  return Array.from(REGISTRY.values());
}

/**
 * Render-slot dispatcher: `<AnnotationSlot slot="Card" annotation={a} />`
 * picks the matching renderer's slot or falls back to
 * {@link GenericRenderers}.
 */
export interface AnnotationSlotDispatcherProps<S extends 'Inline' | 'Card' | 'Detail'> {
  readonly slot: S;
  readonly annotation: AnnotationLike;
  readonly fallback: ComponentType<AnnotationSlotProps>;
}

export function AnnotationSlot<S extends 'Inline' | 'Card' | 'Detail'>(
  props: AnnotationSlotDispatcherProps<S>,
): ReactNode {
  const renderer = lookupAnnotationRenderer(
    props.annotation.kind,
    props.annotation.anchor.$type,
  );
  const Concrete = renderer?.[props.slot] as
    | ComponentType<AnnotationSlotProps>
    | undefined;
  if (Concrete) return <Concrete annotation={props.annotation} />;
  const Fallback = props.fallback;
  return <Fallback annotation={props.annotation} />;
}
