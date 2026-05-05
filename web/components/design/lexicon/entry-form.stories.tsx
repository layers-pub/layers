/**
 * Storybook stories for the EntryForm component.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { EntryForm } from './entry-form';

const meta = {
  title: 'Design/EntryForm',
  component: EntryForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
} satisfies Meta<typeof EntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CreateMode: Story = {
  args: {
    mode: 'create',
  },
};

export const EditMode: Story = {
  args: {
    mode: 'edit',
    defaultValues: {
      form: 'runs',
      lemma: 'run',
      languages: ['en'],
      features: [
        { key: 'pos', value: 'verb' },
        { key: 'tense', value: 'present' },
      ],
    },
  },
};

export const Submitting: Story = {
  args: {
    mode: 'create',
    isSubmitting: true,
  },
};

export const WithFeatures: Story = {
  args: {
    mode: 'edit',
    defaultValues: {
      form: 'chat',
      lemma: 'chat',
      languages: ['fr'],
      features: [
        { key: 'gender', value: 'masculine' },
        { key: 'number', value: 'singular' },
        { key: 'animacy', value: 'animate' },
      ],
    },
  },
};

export const Empty: Story = {
  args: {
    mode: 'create',
    defaultValues: {
      form: '',
      lemma: '',
      languages: [],
      features: [],
    },
  },
};
