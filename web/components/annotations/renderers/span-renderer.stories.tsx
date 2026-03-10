import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import type { AnnotationItem, AnnotationLayerData, Token } from '../types';
import { SpanRenderer } from './span-renderer';

const meta: Meta<typeof SpanRenderer> = {
  title: 'Annotations/Renderers/SpanRenderer',
  component: SpanRenderer,
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
type Story = StoryObj<typeof SpanRenderer>;

const expressionText = 'John Smith visited New York City last Friday.';

const tokens: Token[] = [
  { text: 'John', index: 0, start: 0, end: 4 },
  { text: 'Smith', index: 1, start: 5, end: 10 },
  { text: 'visited', index: 2, start: 11, end: 18 },
  { text: 'New', index: 3, start: 19, end: 22 },
  { text: 'York', index: 4, start: 23, end: 27 },
  { text: 'City', index: 5, start: 28, end: 32 },
  { text: 'last', index: 6, start: 33, end: 37 },
  { text: 'Friday', index: 7, start: 38, end: 44 },
  { text: '.', index: 8, start: 44, end: 45 },
];

const entitySpanItems: AnnotationItem[] = [
  {
    id: 'span-1',
    label: 'PERSON',
    anchor: { type: 'textSpan', start: 0, end: 10 },
    confidence: 950,
  },
  {
    id: 'span-2',
    label: 'GPE',
    anchor: { type: 'textSpan', start: 19, end: 32 },
    confidence: 880,
  },
  {
    id: 'span-3',
    label: 'DATE',
    anchor: { type: 'textSpan', start: 33, end: 44 },
    confidence: 910,
  },
];

const entityLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/span-ner1',
  kind: 'span',
  subkind: 'ner',
  label: 'Named Entities',
  items: entitySpanItems,
};

export const Default: Story = {
  args: {
    layer: entityLayer,
    text: expressionText,
    tokens,
    color: 'oklch(0.65 0.15 150)',
  },
};

const overlappingItems: AnnotationItem[] = [
  {
    id: 'ovl-1',
    label: 'NP',
    anchor: { type: 'textSpan', start: 19, end: 32 },
    confidence: 900,
  },
  {
    id: 'ovl-2',
    label: 'GPE',
    anchor: { type: 'textSpan', start: 19, end: 27 },
    confidence: 850,
  },
  {
    id: 'ovl-3',
    label: 'PERSON',
    anchor: { type: 'textSpan', start: 0, end: 10 },
  },
];

const overlappingLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/span-ovl',
  kind: 'span',
  subkind: 'ner',
  label: 'Overlapping Entities',
  items: overlappingItems,
};

export const Overlapping: Story = {
  args: {
    layer: overlappingLayer,
    text: expressionText,
    tokens,
    color: 'oklch(0.65 0.15 30)',
  },
};

const singleSpanItems: AnnotationItem[] = [
  {
    id: 'single-1',
    label: 'FOCUS',
    anchor: { type: 'textSpan', start: 11, end: 18 },
  },
];

const singleSpanLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/span-single',
  kind: 'span',
  label: 'Focus Span',
  items: singleSpanItems,
};

export const SingleSpan: Story = {
  args: {
    layer: singleSpanLayer,
    text: expressionText,
    tokens,
    color: 'oklch(0.65 0.15 250)',
  },
};

const emptyLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/span-empty',
  kind: 'span',
  label: 'Empty Spans',
  items: [],
};

export const Empty: Story = {
  args: {
    layer: emptyLayer,
    text: '',
    tokens: [],
    color: 'oklch(0.65 0.15 150)',
  },
};
