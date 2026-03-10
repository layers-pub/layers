/**
 * Kind dispatch component for annotation layer rendering.
 *
 * Routes to the appropriate renderer based on the layer's `kind` field.
 * Each renderer handles its own subkinds internally.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { DocumentTagRenderer } from './renderers/document-tag-renderer';
import { GraphRenderer } from './renderers/graph-renderer';
import { RelationRenderer } from './renderers/relation-renderer';
import { SpanRenderer } from './renderers/span-renderer';
import { TierRenderer } from './renderers/tier-renderer';
import { TokenTagRenderer } from './renderers/token-tag-renderer';
import { TreeRenderer } from './renderers/tree-renderer';
import type { AnnotationLayerData, Token } from './types';

interface AnnotationLayerViewProps {
  /** Annotation layer data to render. */
  layer: AnnotationLayerData;
  /** Raw expression text (required for span renderer). */
  text?: string;
  /** Tokens from the segmentation record. */
  tokens?: Token[];
  /** oklch color string assigned by the composition layer. */
  color: string;
}

/**
 * Dispatches to the appropriate annotation renderer based on layer kind.
 *
 * Supported kinds: token-tag, span, relation, tree, graph, tier, document-tag.
 * Unknown kinds display a fallback message.
 */
const AnnotationLayerView = React.memo(function AnnotationLayerView({
  layer,
  text,
  tokens,
  color,
}: AnnotationLayerViewProps): React.JSX.Element {
  const safeTokens = tokens ?? [];
  const safeText = text ?? '';

  switch (layer.kind) {
    case 'token-tag':
      return <TokenTagRenderer layer={layer} tokens={safeTokens} color={color} />;

    case 'span':
      return <SpanRenderer layer={layer} text={safeText} tokens={safeTokens} color={color} />;

    case 'relation':
      return <RelationRenderer layer={layer} tokens={safeTokens} color={color} />;

    case 'tree':
      return <TreeRenderer layer={layer} tokens={safeTokens} color={color} />;

    case 'graph':
      return <GraphRenderer layer={layer} color={color} />;

    case 'tier':
      return <TierRenderer layer={layer} color={color} />;

    case 'document-tag':
      return <DocumentTagRenderer layer={layer} color={color} />;

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Unknown annotation kind: {layer.kind}
        </p>
      );
  }
});

export type { AnnotationLayerViewProps };
export { AnnotationLayerView };
