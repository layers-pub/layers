/**
 * Unit tests for the CorpusForm component.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CorpusForm } from '@/components/forms/corpus-form';
import { renderWithProviders } from '@/tests/test-utils';

describe('CorpusForm', () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders all form fields', () => {
    renderWithProviders(<CorpusForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('License')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Corpus' })).toBeInTheDocument();
  });

  it('validates required fields and shows error on empty submit', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CorpusForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create Corpus' }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form values when validation passes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CorpusForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Test Corpus');
    await user.type(screen.getByLabelText('Description'), 'A test corpus');
    await user.type(screen.getByLabelText('Language'), 'en');
    await user.type(screen.getByLabelText('License'), 'CC-BY-4.0');

    await user.click(screen.getByRole('button', { name: 'Create Corpus' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Test Corpus',
          description: 'A test corpus',
          language: 'en',
          license: 'CC-BY-4.0',
        },
        expect.anything(),
      );
    });
  });

  it('disables submit button when isSubmitting is true', () => {
    renderWithProviders(<CorpusForm onSubmit={onSubmit} isSubmitting />);

    expect(screen.getByRole('button', { name: /Create Corpus/i })).toBeDisabled();
  });

  it('shows validation error for name too short', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CorpusForm onSubmit={onSubmit} />);

    // Language requires min 2 chars; leave name empty to trigger name validation
    await user.type(screen.getByLabelText('Language'), 'en');
    await user.click(screen.getByRole('button', { name: 'Create Corpus' }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
