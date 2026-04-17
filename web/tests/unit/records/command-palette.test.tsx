import { describe, expect, it } from 'vitest';

import { CommandPalette } from '@/components/command-palette';

import { fireEvent, renderWithProviders, screen } from '../../test-utils';

describe('CommandPalette', () => {
  it('renders nothing until Cmd/Ctrl+K is pressed', () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens on Cmd+K and shows record-kind entries from the registry', () => {
    renderWithProviders(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    // Every record kind contributes a Browse action.
    expect(screen.getByText('Browse Persona')).toBeInTheDocument();
    expect(screen.getByText('Browse Corpus')).toBeInTheDocument();
    expect(screen.getByText('Browse Expression')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderWithProviders(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
