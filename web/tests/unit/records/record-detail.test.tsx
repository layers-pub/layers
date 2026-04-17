import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordDetail } from '@/components/records/record-detail';

import { renderWithProviders, screen, waitFor } from '../../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function mockXrpcOnce(payload: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    }) as unknown as Response,
  );
}

describe('RecordDetail', () => {
  it('calls the correct get endpoint for the kind', async () => {
    mockXrpcOnce({
      uri: 'at://did:plc:abc/pub.layers.persona.persona/rk1',
      cid: 'bafyaa',
      did: 'did:plc:abc',
      rkey: 'rk1',
      indexedAt: '2026-04-17T12:00:00Z',
      name: 'Test Persona',
    });

    renderWithProviders(
      <RecordDetail
        slug="persona"
        uri="at://did:plc:abc/pub.layers.persona.persona/rk1"
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/xrpc/pub.layers.persona.getPersona');
    expect(url).toContain('uri=at');
  });

  it('renders each generated field with its label and description', async () => {
    mockXrpcOnce({
      uri: 'at://did:plc:abc/pub.layers.persona.persona/rk1',
      cid: 'bafyaa',
      did: 'did:plc:abc',
      rkey: 'rk1',
      indexedAt: '2026-04-17T12:00:00Z',
      name: 'Syntactician',
      domain: 'linguistics',
      kind: 'human-annotator',
    });

    renderWithProviders(
      <RecordDetail
        slug="persona"
        uri="at://did:plc:abc/pub.layers.persona.persona/rk1"
      />,
    );

    // Once the query resolves, every lexicon field renders with its label.
    expect(await screen.findByText('Name')).toBeInTheDocument();
    expect(await screen.findByText('Domain')).toBeInTheDocument();
    expect(await screen.findByText('Kind')).toBeInTheDocument();
  });

  it('surfaces API errors via ErrorDisplay', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('not found', { status: 404 }) as unknown as Response,
    );
    renderWithProviders(
      <RecordDetail
        slug="persona"
        uri="at://did:plc:abc/pub.layers.persona.persona/missing"
      />,
    );
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows unknown-kind state for a slug not in the registry', () => {
    renderWithProviders(<RecordDetail slug="not-a-kind" uri="at://x/y/z" />);
    expect(screen.getByText('Unknown record kind')).toBeInTheDocument();
  });
});
