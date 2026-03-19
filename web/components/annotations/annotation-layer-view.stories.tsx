import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import { AnnotationLayerView } from './annotation-layer-view';
import type { AnnotationLayerData, Token } from './types';

const meta: Meta<typeof AnnotationLayerView> = {
  title: 'Annotations/AnnotationLayerView',
  component: AnnotationLayerView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AnnotationLayerView>;

const text = 'The cat sat on the mat.';

const tokens: Token[] = [
  { text: 'The', index: 0, byteStart: 0, byteEnd: 3 },
  { text: 'cat', index: 1, byteStart: 4, byteEnd: 7 },
  { text: 'sat', index: 2, byteStart: 8, byteEnd: 11 },
  { text: 'on', index: 3, byteStart: 12, byteEnd: 14 },
  { text: 'the', index: 4, byteStart: 15, byteEnd: 18 },
  { text: 'mat', index: 5, byteStart: 19, byteEnd: 22 },
  { text: '.', index: 6, byteStart: 22, byteEnd: 23 },
];

const tokenTagLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/view-pos',
  kind: 'token-tag',
  subkind: 'pos',
  label: 'POS Tags',
  items: [
    { id: 'v-pos-0', label: 'DT', anchor: { type: 'tokenRef', tokenIndex: 0 } },
    { id: 'v-pos-1', label: 'NN', anchor: { type: 'tokenRef', tokenIndex: 1 } },
    { id: 'v-pos-2', label: 'VBD', anchor: { type: 'tokenRef', tokenIndex: 2 } },
    { id: 'v-pos-3', label: 'IN', anchor: { type: 'tokenRef', tokenIndex: 3 } },
    { id: 'v-pos-4', label: 'DT', anchor: { type: 'tokenRef', tokenIndex: 4 } },
    { id: 'v-pos-5', label: 'NN', anchor: { type: 'tokenRef', tokenIndex: 5 } },
    { id: 'v-pos-6', label: '.', anchor: { type: 'tokenRef', tokenIndex: 6 } },
  ],
};

export const TokenTag: Story = {
  args: {
    layer: tokenTagLayer,
    text,
    tokens,
    color: 'oklch(0.65 0.15 250)',
  },
};

const spanLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/view-span',
  kind: 'span',
  subkind: 'ner',
  label: 'Entity Spans',
  items: [
    {
      id: 'v-span-1',
      label: 'ANIMAL',
      anchor: { type: 'textSpan', byteStart: 4, byteEnd: 7 },
      confidence: 900,
    },
    {
      id: 'v-span-2',
      label: 'OBJECT',
      anchor: { type: 'textSpan', byteStart: 19, byteEnd: 22 },
      confidence: 850,
    },
  ],
};

export const Span: Story = {
  args: {
    layer: spanLayer,
    text,
    tokens,
    color: 'oklch(0.65 0.15 150)',
  },
};

const relationLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/view-rel',
  kind: 'relation',
  subkind: 'srl',
  label: 'Semantic Roles',
  items: [
    { id: 'v-arg0', label: 'The cat', value: 'The cat' },
    { id: 'v-arg1', label: 'on the mat', value: 'on the mat' },
    {
      id: 'v-pred',
      label: 'sit.01',
      arguments: [
        { role: 'ARG0', targetId: 'v-arg0', targetLabel: 'The cat' },
        { role: 'ARG-LOC', targetId: 'v-arg1', targetLabel: 'on the mat' },
      ],
    },
  ],
};

export const Relation: Story = {
  args: {
    layer: relationLayer,
    text,
    tokens,
    color: 'oklch(0.65 0.15 300)',
  },
};

const treeLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/view-tree',
  kind: 'tree',
  subkind: 'dependency',
  formalism: 'universal-dependencies',
  label: 'UD Dependencies',
  items: [
    {
      id: 'v-dep-0',
      label: 'det',
      anchor: { type: 'tokenRef', tokenIndex: 0 },
      headIndex: 1,
      targetIndex: 0,
    },
    {
      id: 'v-dep-1',
      label: 'nsubj',
      anchor: { type: 'tokenRef', tokenIndex: 1 },
      headIndex: 2,
      targetIndex: 1,
    },
    {
      id: 'v-dep-2',
      label: 'root',
      anchor: { type: 'tokenRef', tokenIndex: 2 },
      headIndex: -1,
      targetIndex: 2,
    },
    {
      id: 'v-dep-3',
      label: 'case',
      anchor: { type: 'tokenRef', tokenIndex: 3 },
      headIndex: 5,
      targetIndex: 3,
    },
    {
      id: 'v-dep-4',
      label: 'det',
      anchor: { type: 'tokenRef', tokenIndex: 4 },
      headIndex: 5,
      targetIndex: 4,
    },
    {
      id: 'v-dep-5',
      label: 'obl',
      anchor: { type: 'tokenRef', tokenIndex: 5 },
      headIndex: 2,
      targetIndex: 5,
    },
    {
      id: 'v-dep-6',
      label: 'punct',
      anchor: { type: 'tokenRef', tokenIndex: 6 },
      headIndex: 2,
      targetIndex: 6,
    },
  ],
};

export const Tree: Story = {
  args: {
    layer: treeLayer,
    text,
    tokens,
    color: 'oklch(0.65 0.15 120)',
  },
};

const documentTagLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/view-doctag',
  kind: 'document-tag',
  subkind: 'sentiment',
  label: 'Document Sentiment',
  items: [{ id: 'v-doctag-1', label: 'sentiment', value: 'neutral', confidence: 780 }],
};

export const DocumentTag: Story = {
  args: {
    layer: documentTagLayer,
    color: 'oklch(0.65 0.15 30)',
  },
};
