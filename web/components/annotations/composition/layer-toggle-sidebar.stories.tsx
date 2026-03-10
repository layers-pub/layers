import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import type { AnnotationLayerData } from '../types';
import { LayerToggleSidebar } from './layer-toggle-sidebar';

const meta: Meta<typeof LayerToggleSidebar> = {
  title: 'Annotations/Composition/LayerToggleSidebar',
  component: LayerToggleSidebar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 280, border: '1px solid var(--border)', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LayerToggleSidebar>;

const layers: AnnotationLayerData[] = [
  {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/layer-pos',
    kind: 'token-tag',
    subkind: 'pos',
    label: 'Penn Treebank POS',
    items: [],
    color: 'oklch(0.65 0.15 250)',
  },
  {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/layer-ner',
    kind: 'span',
    subkind: 'ner',
    label: 'Named Entities',
    items: [],
    color: 'oklch(0.65 0.15 150)',
  },
  {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/layer-dep',
    kind: 'tree',
    subkind: 'dependency',
    label: 'UD Dependencies',
    items: [],
    color: 'oklch(0.65 0.15 30)',
  },
  {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/layer-srl',
    kind: 'relation',
    subkind: 'srl',
    label: 'Semantic Role Labeling',
    items: [],
    color: 'oklch(0.65 0.15 300)',
  },
];

const allVisibleUris = new Set(layers.map((l) => l.uri));

export const MultipleLayers: Story = {
  args: {
    layers,
    visibleLayers: allVisibleUris,
    onToggle: fn(),
  },
};

export const SingleLayer: Story = {
  args: {
    layers: [layers[0]!],
    visibleLayers: new Set([layers[0]!.uri]),
    onToggle: fn(),
  },
};

export const AllHidden: Story = {
  args: {
    layers,
    visibleLayers: new Set<string>(),
    onToggle: fn(),
  },
};
