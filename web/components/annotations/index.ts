/**
 * Annotation layer rendering system barrel exports.
 *
 * @module
 */

// Types
export type {
  Anchor,
  AnnotationArgument,
  AnnotationItem,
  AnnotationKind,
  AnnotationLayerData,
  Token,
} from './types';

// Dispatch component
export { AnnotationLayerView } from './annotation-layer-view';
export type { AnnotationLayerViewProps } from './annotation-layer-view';

// Composition components
export { MultiLayerView } from './composition/multi-layer-view';
export type { MultiLayerViewProps } from './composition/multi-layer-view';

export { LayerToggleSidebar } from './composition/layer-toggle-sidebar';
export type { LayerToggleSidebarProps } from './composition/layer-toggle-sidebar';

// Primitives
export { AnnotationBadge } from './primitives/annotation-badge';
export type { AnnotationBadgeProps } from './primitives/annotation-badge';

export {
  ConfidenceIndicator,
  confidenceToOpacity,
  confidenceToPercent,
} from './primitives/confidence-indicator';
export type { ConfidenceIndicatorProps } from './primitives/confidence-indicator';

// Individual renderers (for direct use when kind is known)
export { TokenTagRenderer } from './renderers/token-tag-renderer';
export type { TokenTagRendererProps } from './renderers/token-tag-renderer';

export { SpanRenderer } from './renderers/span-renderer';
export type { SpanRendererProps } from './renderers/span-renderer';

export { RelationRenderer } from './renderers/relation-renderer';
export type { RelationRendererProps } from './renderers/relation-renderer';

export { TreeRenderer } from './renderers/tree-renderer';
export type { TreeRendererProps } from './renderers/tree-renderer';

export { GraphRenderer } from './renderers/graph-renderer';
export type { GraphRendererProps } from './renderers/graph-renderer';

export { TierRenderer } from './renderers/tier-renderer';
export type { TierRendererProps } from './renderers/tier-renderer';

export { DocumentTagRenderer } from './renderers/document-tag-renderer';
export type { DocumentTagRendererProps } from './renderers/document-tag-renderer';
