/**
 * Unit tests for the CreateCorpusContent page component.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/tests/test-utils';
import { CreateCorpusContent } from '@/app/corpora/new/create-corpus-content';

// ---- Mocks (vi.hoisted to avoid hoisting issues) ----

const { mockPush, mockCreateCorpusRecord, mockToast, mockAgent, getCurrentAgent, setCurrentAgent } =
  vi.hoisted(() => {
    const agent = {
      assertDid: 'did:plc:testuser1',
      com: { atproto: { repo: { createRecord: vi.fn() } } },
    };
    let current: typeof agent | null = agent;
    return {
      mockPush: vi.fn(),
      mockCreateCorpusRecord: vi.fn(),
      mockToast: { error: vi.fn(), success: vi.fn() },
      mockAgent: agent,
      getCurrentAgent: () => current,
      setCurrentAgent: (a: typeof agent | null) => {
        current = a;
      },
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
  usePathname: () => '/corpora/new',
  useParams: () => ({}),
}));

vi.mock('@/lib/atproto', () => ({
  createCorpusRecord: (...args: unknown[]) => mockCreateCorpusRecord(...args),
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

describe('CreateCorpusContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentAgent(mockAgent);
  });

  it('renders the corpus creation form', () => {
    renderWithProviders(<CreateCorpusContent />);

    expect(
      screen.getByText('Create Corpus', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('calls createCorpusRecord on valid submit', async () => {
    const user = userEvent.setup();

    mockCreateCorpusRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:testuser1/pub.layers.corpus.corpus/corpus1',
      cid: 'bafytest456',
    });

    renderWithProviders(<CreateCorpusContent />);

    await user.type(screen.getByLabelText('Name'), 'Test Corpus');
    await user.type(screen.getByLabelText('Language'), 'en');
    await user.click(screen.getByRole('button', { name: 'Create Corpus' }));

    await waitFor(() => {
      expect(mockCreateCorpusRecord).toHaveBeenCalledWith(
        mockAgent,
        expect.objectContaining({ name: 'Test Corpus', language: 'en' }),
      );
    });

    expect(mockToast.success).toHaveBeenCalledWith('Corpus created successfully.');
  });

  it('shows error toast when not authenticated', async () => {
    const user = userEvent.setup();
    setCurrentAgent(null);

    renderWithProviders(<CreateCorpusContent />);

    await user.type(screen.getByLabelText('Name'), 'Test Corpus');
    await user.type(screen.getByLabelText('Language'), 'en');
    await user.click(screen.getByRole('button', { name: 'Create Corpus' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('You must be logged in to create a corpus.');
    });

    expect(mockCreateCorpusRecord).not.toHaveBeenCalled();
  });

  it('navigates to corpus page on success', async () => {
    const user = userEvent.setup();

    mockCreateCorpusRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:testuser1/pub.layers.corpus.corpus/corpus1',
      cid: 'bafytest456',
    });

    renderWithProviders(<CreateCorpusContent />);

    await user.type(screen.getByLabelText('Name'), 'Test Corpus');
    await user.type(screen.getByLabelText('Language'), 'en');
    await user.click(screen.getByRole('button', { name: 'Create Corpus' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/corpora/did:plc:testuser1/pub.layers.corpus.corpus/corpus1',
      );
    });
  });
});
