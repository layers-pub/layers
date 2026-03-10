/**
 * Unit tests for the OntologyForm component.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OntologyForm } from '@/components/forms/ontology-form';
import { renderWithProviders } from '@/tests/test-utils';

describe('OntologyForm', () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders name, description, and version fields', () => {
    renderWithProviders(<OntologyForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText(/Version/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Ontology' })).toBeInTheDocument();
  });

  it('validates required name field', async () => {
    const user = userEvent.setup();

    renderWithProviders(<OntologyForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create Ontology' }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form values when validation passes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<OntologyForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Universal Dependencies');
    await user.type(screen.getByLabelText('Description'), 'A framework for annotations');
    await user.type(screen.getByLabelText(/Version/), '2.0.0');

    await user.click(screen.getByRole('button', { name: 'Create Ontology' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Universal Dependencies',
          description: 'A framework for annotations',
          version: '2.0.0',
        },
        expect.anything(),
      );
    });
  });

  it('disables submit when isSubmitting is true', () => {
    renderWithProviders(<OntologyForm onSubmit={onSubmit} isSubmitting />);

    expect(screen.getByRole('button', { name: /Create Ontology/i })).toBeDisabled();
  });
});
