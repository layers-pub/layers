import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';

import { ConfidenceIndicator } from './confidence-indicator';

const meta: Meta<typeof ConfidenceIndicator> = {
  title: 'Annotations/Primitives/ConfidenceIndicator',
  component: ConfidenceIndicator,
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
type Story = StoryObj<typeof ConfidenceIndicator>;

export const High: Story = {
  args: {
    confidence: 900,
  },
};

export const Medium: Story = {
  args: {
    confidence: 500,
  },
};

export const Low: Story = {
  args: {
    confidence: 100,
  },
};

export const None: Story = {
  args: {
    confidence: 0,
  },
};
