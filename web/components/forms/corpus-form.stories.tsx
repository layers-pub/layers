import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { CorpusForm } from './corpus-form';

const meta: Meta<typeof CorpusForm> = {
  title: 'Forms/CorpusForm',
  component: CorpusForm,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CorpusForm>;

export const Empty: Story = {
  args: {
    onSubmit: fn(),
    isSubmitting: false,
  },
};

export const Submitting: Story = {
  args: {
    onSubmit: fn(),
    isSubmitting: true,
  },
};
