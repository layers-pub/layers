/**
 * Unit tests for the CreateOntologyContent page component.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/tests/test-utils';
import { CreateOntologyContent } from '@/app/ontologies/new/create-ontology-content';

// ---- Mocks (vi.hoisted to avoid hoisting issues) ----

const { mockPush, mockCreateOntologyRecord, mockToast, mockAgent, getCurrentAgent, setCurrentAgent } =
  vi.hoisted(() => {
    const agent = {
      assertDid: 'did:plc:testuser1',
      com: { atproto: { repo: { createRecord: vi.fn() } } },
    };
    let current: typeof agent | null = agent;
    return {
      mockPush: vi.fn(),
      mockCreateOntologyRecord: vi.fn(),
      mockToast: { error: vi.fn(), success: vi.fn() },
      mockAgent: agent,
      getCurrentAgent: () => current,
      setCurrentAgent: (a: typeof agent | null) => { current = a; },
    };
  });

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ontologies/new',
  useParams: () => ({}),
}));

vi.mock('@/lib/atproto', () => ({
  createOntologyRecord: (...args: unknown[]) => mockCreateOntologyRecord(...args),
}));

vi.mock('@/lib/auth', () => ({
  useAgent: () => getCurrentAgent(),
  useAuth: () => ({
    user: getCurrentAgent() ? { did: 'did:plc:testuser1', handle: 'test.user' } : null,
    isAuthenticated: getCurrentAgent() !== null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    agent: getCurrentAgent(),
  }),
  useIsAuthenticated: () => getCurrentAgent() !== null,
  useCurrentUser: () =>
    getCurrentAgent() ? { did: 'did:plc:testuser1', handle: 'test.user' } : null,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// ---- Tests ----

describe('CreateOntologyContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentAgent(mockAgent);
  });

  it('renders the ontology creation form', () => {
    renderWithProviders(<CreateOntologyContent />);

    expect(screen.getByText('Create Ontology', { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('calls createOntologyRecord on valid submit', async () => {
    const user = userEvent.setup();

    mockCreateOntologyRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:testuser1/pub.layers.ontology.ontology/onto1',
      cid: 'bafytest789',
    });

    renderWithProviders(<CreateOntologyContent />);

    await user.type(screen.getByLabelText('Name'), 'Universal Dependencies');
    await user.click(screen.getByRole('button', { name: 'Create Ontology' }));

    await waitFor(() => {
      expect(mockCreateOntologyRecord).toHaveBeenCalledWith(
        mockAgent,
        expect.objectContaining({ name: 'Universal Dependencies' }),
      );
    });

    expect(mockToast.success).toHaveBeenCalledWith('Ontology created successfully.');
  });

  it('shows error toast when not authenticated', async () => {
    const user = userEvent.setup();
    setCurrentAgent(null);

    renderWithProviders(<CreateOntologyContent />);

    await user.type(screen.getByLabelText('Name'), 'Test Ontology');
    await user.click(screen.getByRole('button', { name: 'Create Ontology' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'You must be logged in to create an ontology.',
      );
    });

    expect(mockCreateOntologyRecord).not.toHaveBeenCalled();
  });

  it('navigates to ontology page on success', async () => {
    const user = userEvent.setup();

    mockCreateOntologyRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:testuser1/pub.layers.ontology.ontology/onto1',
      cid: 'bafytest789',
    });

    renderWithProviders(<CreateOntologyContent />);

    await user.type(screen.getByLabelText('Name'), 'Universal Dependencies');
    await user.click(screen.getByRole('button', { name: 'Create Ontology' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/ontologies/did:plc:testuser1/pub.layers.ontology.ontology/onto1',
      );
    });
  });
});
