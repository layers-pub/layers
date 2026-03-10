import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { OntologyForm } from './ontology-form';

const meta: Meta<typeof OntologyForm> = {
  title: 'Forms/OntologyForm',
  component: OntologyForm,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OntologyForm>;

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
