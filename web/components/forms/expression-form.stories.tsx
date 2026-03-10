import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { ExpressionForm } from './expression-form';

const meta: Meta<typeof ExpressionForm> = {
  title: 'Forms/ExpressionForm',
  component: ExpressionForm,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ExpressionForm>;

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
