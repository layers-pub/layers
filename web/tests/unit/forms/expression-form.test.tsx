/**
 * Unit tests for the ExpressionForm component.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExpressionForm } from '@/components/forms/expression-form';
import { renderWithProviders } from '@/tests/test-utils';

describe('ExpressionForm', () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders text and language fields', () => {
    renderWithProviders(<ExpressionForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Text')).toBeInTheDocument();
    expect(screen.getByLabelText(/Language/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Source/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Expression' })).toBeInTheDocument();
  });

  it('validates required text field', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExpressionForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create Expression' }));

    await waitFor(() => {
      expect(screen.getByText('Text is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form values when validation passes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExpressionForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Text'), 'The cat sat on the mat.');
    await user.type(screen.getByLabelText(/Language/), 'en');

    await user.click(screen.getByRole('button', { name: 'Create Expression' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          text: 'The cat sat on the mat.',
          language: 'en',
          source: '',
        },
        expect.anything(),
      );
    });
  });

  it('disables submit when isSubmitting is true', () => {
    renderWithProviders(<ExpressionForm onSubmit={onSubmit} isSubmitting />);

    expect(screen.getByRole('button', { name: /Create Expression/i })).toBeDisabled();
  });

  it('shows character count that updates as user types', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExpressionForm onSubmit={onSubmit} />);

    // Initial character count should be 0
    expect(screen.getByText('0 / 100,000')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Text'), 'Hello');

    await waitFor(() => {
      expect(screen.getByText('5 / 100,000')).toBeInTheDocument();
    });
  });
});
