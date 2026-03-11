/**
 * Storybook stories for the FillingResultsTable component.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { FillingResultsTable, type FillingPreview } from './filling-results-table';

// =============================================================================
// Fixture data
// =============================================================================

const exhaustiveFillings: FillingPreview[] = [
  {
    slotFillings: [
      { slotName: 'subject', literalValue: 'the cat' },
      { slotName: 'verb', literalValue: 'chased' },
    ],
    renderedText: 'The cat chased the ball.',
    strategy: 'exhaustive',
    constraintViolations: [{ expression: 'subject != object', satisfied: true }],
  },
  {
    slotFillings: [
      { slotName: 'subject', literalValue: 'a dog' },
      { slotName: 'verb', literalValue: 'saw' },
    ],
    renderedText: 'A dog saw the painting.',
    strategy: 'exhaustive',
    constraintViolations: [
      { expression: 'subject != object', satisfied: true },
      { expression: 'verb.transitivity == transitive', satisfied: true },
    ],
  },
  {
    slotFillings: [
      { slotName: 'subject', literalValue: 'the student' },
      { slotName: 'verb', literalValue: 'admired' },
    ],
    renderedText: 'The student admired a song.',
    strategy: 'exhaustive',
    constraintViolations: [
      { expression: 'subject != object', satisfied: true },
      { expression: 'verb.transitivity == transitive', satisfied: false },
    ],
  },
];

const mlmFillings: FillingPreview[] = [
  {
    slotFillings: [{ slotName: 'noun', literalValue: 'solution' }],
    renderedText: 'The solution was elegant.',
    strategy: 'mlm',
    score: 0.892,
  },
  {
    slotFillings: [{ slotName: 'noun', literalValue: 'result' }],
    renderedText: 'The result was promising.',
    strategy: 'mlm',
    score: 0.756,
  },
  {
    slotFillings: [{ slotName: 'noun', literalValue: 'answer' }],
    renderedText: 'The answer was correct.',
    strategy: 'mlm',
    score: 0.634,
  },
];

// =============================================================================
// Meta
// =============================================================================

const meta = {
  title: 'Design/FillingResultsTable',
  component: FillingResultsTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onSave: fn(),
    isSaving: false,
  },
} satisfies Meta<typeof FillingResultsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Stories
// =============================================================================

export const Default: Story = {
  args: {
    fillings: exhaustiveFillings,
  },
};

export const WithMLMScores: Story = {
  args: {
    fillings: mlmFillings,
  },
};

export const Empty: Story = {
  args: {
    fillings: [],
  },
};

export const Saving: Story = {
  args: {
    fillings: exhaustiveFillings,
    isSaving: true,
  },
};

export const ManyResults: Story = {
  args: {
    fillings: Array.from({ length: 120 }, (_, i) => ({
      slotFillings: [{ slotName: 'noun', literalValue: `word_${i}` }],
      renderedText: `The word_${i} was interesting.`,
      strategy: i % 3 === 0 ? 'random' : 'exhaustive',
      constraintViolations:
        i % 5 === 0
          ? [{ expression: 'length > 3', satisfied: false }]
          : [{ expression: 'length > 3', satisfied: true }],
    })),
  },
};

export const WithViolations: Story = {
  args: {
    fillings: [
      {
        slotFillings: [
          { slotName: 'subject', literalValue: 'it' },
          { slotName: 'verb', literalValue: 'rained' },
        ],
        renderedText: 'It rained the book.',
        strategy: 'exhaustive',
        constraintViolations: [
          { expression: 'verb.transitivity == transitive', satisfied: false },
          { expression: 'subject.animacy == animate', satisfied: false },
        ],
      },
      ...exhaustiveFillings.slice(0, 2),
    ],
  },
};
