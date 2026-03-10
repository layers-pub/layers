/**
 * Unit tests for the CreateExpressionContent page component.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/tests/test-utils';
import { CreateExpressionContent } from '@/app/expressions/new/create-expression-content';

// ---- Mocks (vi.hoisted to avoid hoisting issues) ----

const {
  mockPush,
  mockCreateExpressionRecord,
  mockToast,
  mockAgent,
  getCurrentAgent,
  setCurrentAgent,
} = vi.hoisted(() => {
  const agent = {
    assertDid: 'did:plc:testuser1',
    com: { atproto: { repo: { createRecord: vi.fn() } } },
  };
  let current: typeof agent | null = agent;
  return {
    mockPush: vi.fn(),
    mockCreateExpressionRecord: vi.fn(),
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
  usePathname: () => '/expressions/new',
  useParams: () => ({}),
}));

vi.mock('@/lib/atproto', () => ({
  createExpressionRecord: (...args: unknown[]) => mockCreateExpressionRecord(...args),
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

describe('CreateExpressionContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentAgent(mockAgent);
  });

  it('renders the expression creation form', () => {
    renderWithProviders(<CreateExpressionContent />);

    expect(
      screen.getByText('Create Expression', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Text')).toBeInTheDocument();
  });

  it('calls createExpressionRecord on valid submit', async () => {
    const user = userEvent.setup();

    mockCreateExpressionRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
      cid: 'bafytest123',
    });

    renderWithProviders(<CreateExpressionContent />);

    await user.type(screen.getByLabelText('Text'), 'The cat sat on the mat.');
    await user.click(screen.getByRole('button', { name: 'Create Expression' }));

    await waitFor(() => {
      expect(mockCreateExpressionRecord).toHaveBeenCalledWith(
        mockAgent,
        expect.objectContaining({ text: 'The cat sat on the mat.' }),
      );
    });

    expect(mockToast.success).toHaveBeenCalledWith('Expression created successfully.');
  });

  it('shows error toast when not authenticated', async () => {
    const user = userEvent.setup();
    setCurrentAgent(null);

    renderWithProviders(<CreateExpressionContent />);

    await user.type(screen.getByLabelText('Text'), 'Some text');
    await user.click(screen.getByRole('button', { name: 'Create Expression' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'You must be logged in to create an expression.',
      );
    });

    expect(mockCreateExpressionRecord).not.toHaveBeenCalled();
  });

  it('navigates to expression page on success', async () => {
    const user = userEvent.setup();

    mockCreateExpressionRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
      cid: 'bafytest123',
    });

    renderWithProviders(<CreateExpressionContent />);

    await user.type(screen.getByLabelText('Text'), 'Test expression text');
    await user.click(screen.getByRole('button', { name: 'Create Expression' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/expressions/did:plc:testuser1/pub.layers.expression.expression/abc123',
      );
    });
  });
});
