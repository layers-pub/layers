import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import type { AnnotationItem, AnnotationLayerData, Token } from '../types';
import { TokenTagRenderer } from './token-tag-renderer';

const meta: Meta<typeof TokenTagRenderer> = {
  title: 'Annotations/Renderers/TokenTagRenderer',
  component: TokenTagRenderer,
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
type Story = StoryObj<typeof TokenTagRenderer>;

const sentenceTokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
  { text: 'sat', index: 2, start: 8, end: 11 },
  { text: 'on', index: 3, start: 12, end: 14 },
  { text: 'the', index: 4, start: 15, end: 18 },
  { text: 'mat', index: 5, start: 19, end: 22 },
  { text: '.', index: 6, start: 22, end: 23 },
];

function makeTokenTagItem(
  id: string,
  tokenIndex: number,
  label: string,
  confidence?: number,
): AnnotationItem {
  return {
    id,
    label,
    anchor: { type: 'tokenRef', tokenIndex },
    confidence,
  };
}

const posItems: AnnotationItem[] = [
  makeTokenTagItem('pos-0', 0, 'DT'),
  makeTokenTagItem('pos-1', 1, 'NN'),
  makeTokenTagItem('pos-2', 2, 'VBD'),
  makeTokenTagItem('pos-3', 3, 'IN'),
  makeTokenTagItem('pos-4', 4, 'DT'),
  makeTokenTagItem('pos-5', 5, 'NN'),
  makeTokenTagItem('pos-6', 6, '.'),
];

const posLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/pos1',
  kind: 'token-tag',
  subkind: 'pos',
  label: 'Penn Treebank POS',
  items: posItems,
};

export const Default: Story = {
  args: {
    layer: posLayer,
    tokens: sentenceTokens,
    color: 'oklch(0.65 0.15 250)',
  },
};

const nerItems: AnnotationItem[] = [
  makeTokenTagItem('ner-0', 0, 'O'),
  makeTokenTagItem('ner-1', 1, 'B-ANIMAL', 850),
  makeTokenTagItem('ner-2', 2, 'O'),
  makeTokenTagItem('ner-3', 3, 'O'),
  makeTokenTagItem('ner-4', 4, 'O'),
  makeTokenTagItem('ner-5', 5, 'B-OBJECT', 720),
  makeTokenTagItem('ner-6', 6, 'O'),
];

const nerLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/ner1',
  kind: 'token-tag',
  subkind: 'ner',
  label: 'Named Entity Recognition',
  items: nerItems,
};

export const NER: Story = {
  args: {
    layer: nerLayer,
    tokens: sentenceTokens,
    color: 'oklch(0.65 0.15 150)',
  },
};

const lemmaItems: AnnotationItem[] = [
  { id: 'lem-0', label: 'lemma', value: 'the', anchor: { type: 'tokenRef', tokenIndex: 0 } },
  { id: 'lem-1', label: 'lemma', value: 'cat', anchor: { type: 'tokenRef', tokenIndex: 1 } },
  { id: 'lem-2', label: 'lemma', value: 'sit', anchor: { type: 'tokenRef', tokenIndex: 2 } },
  { id: 'lem-3', label: 'lemma', value: 'on', anchor: { type: 'tokenRef', tokenIndex: 3 } },
  { id: 'lem-4', label: 'lemma', value: 'the', anchor: { type: 'tokenRef', tokenIndex: 4 } },
  { id: 'lem-5', label: 'lemma', value: 'mat', anchor: { type: 'tokenRef', tokenIndex: 5 } },
  { id: 'lem-6', label: 'lemma', value: '.', anchor: { type: 'tokenRef', tokenIndex: 6 } },
];

const lemmaLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/lem1',
  kind: 'token-tag',
  subkind: 'lemma',
  label: 'Lemmatization',
  items: lemmaItems,
};

export const Lemma: Story = {
  args: {
    layer: lemmaLayer,
    tokens: sentenceTokens,
    color: 'oklch(0.65 0.15 30)',
  },
};

const emptyLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/empty1',
  kind: 'token-tag',
  subkind: 'pos',
  label: 'Empty POS Layer',
  items: [],
};

export const Empty: Story = {
  args: {
    layer: emptyLayer,
    tokens: [],
    color: 'oklch(0.65 0.15 250)',
  },
};
