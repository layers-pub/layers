import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import type { AnnotationItem, AnnotationLayerData, Token } from '../types';
import { RelationRenderer } from './relation-renderer';

const meta: Meta<typeof RelationRenderer> = {
  title: 'Annotations/Renderers/RelationRenderer',
  component: RelationRenderer,
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
type Story = StoryObj<typeof RelationRenderer>;

const tokens: Token[] = [
  { text: 'The', index: 0, byteStart: 0, byteEnd: 3 },
  { text: 'cat', index: 1, byteStart: 4, byteEnd: 7 },
  { text: 'chased', index: 2, byteStart: 8, byteEnd: 14 },
  { text: 'the', index: 3, byteStart: 15, byteEnd: 18 },
  { text: 'mouse', index: 4, byteStart: 19, byteEnd: 24 },
  { text: 'quickly', index: 5, byteStart: 25, byteEnd: 32 },
  { text: '.', index: 6, byteStart: 32, byteEnd: 33 },
];

const srlItems: AnnotationItem[] = [
  {
    id: 'arg-agent',
    label: 'The cat',
    value: 'The cat',
    anchor: { type: 'tokenRefSequence', tokenIndices: [0, 1] },
  },
  {
    id: 'arg-patient',
    label: 'the mouse',
    value: 'the mouse',
    anchor: { type: 'tokenRefSequence', tokenIndices: [3, 4] },
  },
  {
    id: 'arg-manner',
    label: 'quickly',
    value: 'quickly',
    anchor: { type: 'tokenRef', tokenIndex: 5 },
  },
  {
    id: 'pred-chase',
    label: 'chase.01',
    confidence: 920,
    arguments: [
      { role: 'ARG0', targetId: 'arg-agent', targetLabel: 'The cat' },
      { role: 'ARG1', targetId: 'arg-patient', targetLabel: 'the mouse' },
      { role: 'ARGM-MNR', targetId: 'arg-manner', targetLabel: 'quickly' },
    ],
  },
  {
    id: 'pred-move',
    label: 'move.01',
    confidence: 650,
    arguments: [
      { role: 'ARG0', targetId: 'arg-agent' },
      { role: 'ARG1', targetId: 'arg-patient' },
    ],
  },
];

const srlLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/srl1',
  kind: 'relation',
  subkind: 'srl',
  label: 'Semantic Role Labeling',
  items: srlItems,
};

export const Default: Story = {
  args: {
    layer: srlLayer,
    tokens,
    color: 'oklch(0.65 0.15 300)',
  },
};

const emptyLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/rel-empty',
  kind: 'relation',
  label: 'Empty Relations',
  items: [],
};

export const Empty: Story = {
  args: {
    layer: emptyLayer,
    tokens: [],
    color: 'oklch(0.65 0.15 300)',
  },
};
