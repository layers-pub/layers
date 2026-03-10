import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import type { AnnotationLayerData } from '../types';
import { DocumentTagRenderer } from './document-tag-renderer';

const meta: Meta<typeof DocumentTagRenderer> = {
  title: 'Annotations/Renderers/DocumentTagRenderer',
  component: DocumentTagRenderer,
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
type Story = StoryObj<typeof DocumentTagRenderer>;

const defaultLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/doctag1',
  kind: 'document-tag',
  subkind: 'sentiment',
  label: 'Sentiment Analysis',
  items: [
    { id: 'tag-1', label: 'sentiment', value: 'positive', confidence: 870 },
    { id: 'tag-2', label: 'sentiment', value: 'neutral', confidence: 520 },
    { id: 'tag-3', label: 'sentiment', value: 'negative', confidence: 210 },
  ],
};

export const Default: Story = {
  args: {
    layer: defaultLayer,
    color: 'oklch(0.65 0.15 150)',
  },
};

const singleTagLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/doctag-single',
  kind: 'document-tag',
  subkind: 'genre',
  label: 'Genre Classification',
  items: [{ id: 'tag-genre-1', label: 'genre', value: 'academic' }],
};

export const SingleTag: Story = {
  args: {
    layer: singleTagLayer,
    color: 'oklch(0.65 0.15 250)',
  },
};

const manyTagsLayer: AnnotationLayerData = {
  uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/doctag-many',
  kind: 'document-tag',
  subkind: 'topic',
  label: 'Topic Tags',
  items: [
    { id: 'topic-1', label: 'topic', value: 'linguistics', confidence: 950 },
    { id: 'topic-2', label: 'topic', value: 'syntax', confidence: 880 },
    { id: 'topic-3', label: 'topic', value: 'morphology', confidence: 750 },
    { id: 'topic-4', label: 'topic', value: 'semantics', confidence: 620 },
    { id: 'topic-5', label: 'topic', value: 'pragmatics', confidence: 430 },
    { id: 'topic-6', label: 'topic', value: 'phonology', confidence: 310 },
    { id: 'topic-7', label: 'topic', value: 'typology', confidence: 280 },
    { id: 'topic-8', label: 'topic', value: 'corpus-linguistics', confidence: 190 },
  ],
};

export const ManyTags: Story = {
  args: {
    layer: manyTagsLayer,
    color: 'oklch(0.65 0.15 30)',
  },
};
