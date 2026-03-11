/**
 * Storybook stories for the TemplatePreview component.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';

import { TemplatePreview } from './template-preview';

const meta = {
  title: 'Design/TemplatePreview',
  component: TemplatePreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TemplatePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    templateText: 'The {subject} {verb} the {object}.',
    slots: [
      { name: 'subject', required: true },
      { name: 'verb', required: true },
      { name: 'object', required: true },
    ],
  },
};

export const WithFillings: Story = {
  args: {
    templateText: 'The {subject} {verb} the {object}.',
    slots: [
      { name: 'subject', required: true },
      { name: 'verb', required: true },
      { name: 'object', required: true },
    ],
    fillings: {
      subject: 'cat',
      verb: 'chased',
      object: 'ball',
    },
  },
};

export const Empty: Story = {
  args: {
    templateText: '',
    slots: [],
  },
};

export const SingleSlot: Story = {
  args: {
    templateText: 'I think that {complement} is likely.',
    slots: [{ name: 'complement', required: true, description: 'Complement clause content' }],
  },
};

export const WithDefaults: Story = {
  args: {
    templateText: 'The {noun} was {adjective}.',
    slots: [
      { name: 'noun', required: true, defaultValue: 'book' },
      { name: 'adjective', required: false, defaultValue: 'interesting' },
    ],
  },
};

export const ManySlots: Story = {
  args: {
    templateText: '{determiner} {adjective} {noun} {verb} {preposition} {determiner2} {noun2}.',
    slots: [
      { name: 'determiner', required: true },
      { name: 'adjective', required: false },
      { name: 'noun', required: true },
      { name: 'verb', required: true },
      { name: 'preposition', required: true },
      { name: 'determiner2', required: true },
      { name: 'noun2', required: true },
    ],
  },
};
