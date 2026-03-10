import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import type { AnnotationItem, AnnotationLayerData, Token } from '../types';
import { TreeRenderer } from './tree-renderer';

const meta: Meta<typeof TreeRenderer> = {
  title: 'Annotations/Renderers/TreeRenderer',
  component: TreeRenderer,
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
type Story = StoryObj<typeof TreeRenderer>;

const tokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
  { text: 'sat', index: 2, start: 8, end: 11 },
  { text: 'on', index: 3, start: 12, end: 14 },
  { text: 'the', index: 4, start: 15, end: 18 },
  { text: 'mat', index: 5, start: 19, end: 22 },
  { text: '.', index: 6, start: 22, end: 23 },
];

// Constituency tree: [S [NP [DT The] [NN cat]] [VP [VBD sat] [PP [IN on] [NP [DT the] [NN mat]]]] [. .]]
const constituencyItems: AnnotationItem[] = [
  {
    id: 'c-s',
    label: 'S',
    children: [
      {
        id: 'c-np1',
        label: 'NP',
        parentId: 'c-s',
        children: [
          {
            id: 'c-dt1',
            label: 'DT',
            parentId: 'c-np1',
            anchor: { type: 'tokenRef', tokenIndex: 0 },
          },
          {
            id: 'c-nn1',
            label: 'NN',
            parentId: 'c-np1',
            anchor: { type: 'tokenRef', tokenIndex: 1 },
          },
        ],
      },
      {
        id: 'c-vp',
        label: 'VP',
        parentId: 'c-s',
        children: [
          {
            id: 'c-vbd',
            label: 'VBD',
            parentId: 'c-vp',
            anchor: { type: 'tokenRef', tokenIndex: 2 },
          },
          {
            id: 'c-pp',
            label: 'PP',
            parentId: 'c-vp',
            children: [
              {
                id: 'c-in',
                label: 'IN',
                parentId: 'c-pp',
                anchor: { type: 'tokenRef', tokenIndex: 3 },
              },
              {
                id: 'c-np2',
                label: 'NP',
                parentId: 'c-pp',
                children: [
                  {
                    id: 'c-dt2',
                    label: 'DT',
                    parentId: 'c-np2',
                    anchor: { type: 'tokenRef', tokenIndex: 4 },
                  },
                  {
                    id: 'c-nn2',
                    label: 'NN',
                    parentId: 'c-np2',
                    anchor: { type: 'tokenRef', tokenIndex: 5 },
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: 'c-punc', label: '.', parentId: 'c-s', anchor: { type: 'tokenRef', tokenIndex: 6 } },
    ],
  },
];

const constituencyLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/const1',
  kind: 'tree',
  subkind: 'constituency',
  label: 'Penn Treebank Constituency',
  items: constituencyItems,
};

export const ConstituencyTree: Story = {
  args: {
    layer: constituencyLayer,
    tokens,
    color: 'oklch(0.65 0.15 120)',
  },
};

const depItems: AnnotationItem[] = [
  {
    id: 'dep-0',
    label: 'det',
    anchor: { type: 'tokenRef', tokenIndex: 0 },
    headIndex: 1,
    targetIndex: 0,
  },
  {
    id: 'dep-1',
    label: 'nsubj',
    anchor: { type: 'tokenRef', tokenIndex: 1 },
    headIndex: 2,
    targetIndex: 1,
  },
  {
    id: 'dep-2',
    label: 'root',
    anchor: { type: 'tokenRef', tokenIndex: 2 },
    headIndex: -1,
    targetIndex: 2,
  },
  {
    id: 'dep-3',
    label: 'case',
    anchor: { type: 'tokenRef', tokenIndex: 3 },
    headIndex: 5,
    targetIndex: 3,
  },
  {
    id: 'dep-4',
    label: 'det',
    anchor: { type: 'tokenRef', tokenIndex: 4 },
    headIndex: 5,
    targetIndex: 4,
  },
  {
    id: 'dep-5',
    label: 'obl',
    anchor: { type: 'tokenRef', tokenIndex: 5 },
    headIndex: 2,
    targetIndex: 5,
  },
  {
    id: 'dep-6',
    label: 'punct',
    anchor: { type: 'tokenRef', tokenIndex: 6 },
    headIndex: 2,
    targetIndex: 6,
  },
];

const depLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/dep1',
  kind: 'tree',
  subkind: 'dependency',
  formalism: 'universal-dependencies',
  label: 'Universal Dependencies',
  items: depItems,
};

export const DependencyTree: Story = {
  args: {
    layer: depLayer,
    tokens,
    color: 'oklch(0.65 0.15 250)',
  },
};

const emptyLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/tree-empty',
  kind: 'tree',
  subkind: 'constituency',
  label: 'Empty Tree',
  items: [],
};

export const Empty: Story = {
  args: {
    layer: emptyLayer,
    tokens: [],
    color: 'oklch(0.65 0.15 120)',
  },
};
