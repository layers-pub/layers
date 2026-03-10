import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import { AnnotationBadge } from './annotation-badge';

const meta: Meta<typeof AnnotationBadge> = {
  title: 'Annotations/Primitives/AnnotationBadge',
  component: AnnotationBadge,
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
type Story = StoryObj<typeof AnnotationBadge>;

export const Default: Story = {
  args: {
    label: 'PERSON',
    color: 'oklch(0.65 0.15 150)',
  },
};

export const WithConfidence: Story = {
  args: {
    label: 'positive',
    subkind: 'sentiment',
    color: 'oklch(0.65 0.15 150)',
    confidence: 750,
  },
};

export const HighConfidence: Story = {
  args: {
    label: 'NOUN',
    subkind: 'pos',
    color: 'oklch(0.65 0.15 250)',
    confidence: 980,
  },
};

export const LowConfidence: Story = {
  args: {
    label: 'ambiguous',
    subkind: 'ner',
    color: 'oklch(0.65 0.15 30)',
    confidence: 200,
  },
};
