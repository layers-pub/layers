import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordBrowser } from '@/components/records/record-browser';

import { fireEvent, renderWithProviders, screen, waitFor } from '../../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function mockXrpcOnce(payload: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as unknown as Response,
  );
}

describe('RecordBrowser', () => {
  it('shows required-filter prompt when a list endpoint has a required param and none supplied', async () => {
    renderWithProviders(<RecordBrowser slug="persona" />);
    expect(await screen.findByText('Filter required')).toBeInTheDocument();
    expect(screen.getAllByText(/repo/i).length).toBeGreaterThan(0);
  });

  it('fires the correct XRPC list call once required filters are supplied', async () => {
    mockXrpcOnce({
      records: [
        {
          uri: 'at://did:plc:abc/pub.layers.persona.persona/rk1',
          cid: 'bafyaa',
          did: 'did:plc:abc',
          rkey: 'rk1',
          indexedAt: '2026-04-17T12:00:00Z',
          name: 'Syntactician',
        },
      ],
    });

    renderWithProviders(<RecordBrowser slug="persona" />);
    const repoInput = await screen.findByLabelText(/repo/);
    fireEvent.change(repoInput, { target: { value: 'did:plc:abc' } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/xrpc/pub.layers.persona.listPersonas');
    expect(url).toContain('repo=did%3Aplc%3Aabc');
    expect(url).toContain('limit=25');
  });

  it('renders an EmptyState when the list is empty', async () => {
    // persona has required repo; set it via defaultValue via re-render trick is awkward.
    // Instead use a slug whose list has no required params if any exist — otherwise we skip.
    // For this project all 26 list endpoints have required params, so exercise empty-state
    // via the ResponsiveList branch: provide the required filter then return empty records.
    mockXrpcOnce({ records: [] });
    renderWithProviders(<RecordBrowser slug="persona" />);
    const repoInput = await screen.findByLabelText(/repo/);
    fireEvent.change(repoInput, { target: { value: 'did:plc:abc' } });
    expect(await screen.findByText('No records yet')).toBeInTheDocument();
  });

  it('displays an ErrorDisplay when the XRPC call fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('boom', { status: 500 }) as unknown as Response,
    );
    renderWithProviders(<RecordBrowser slug="persona" />);
    const repoInput = await screen.findByLabelText(/repo/);
    fireEvent.change(repoInput, { target: { value: 'did:plc:abc' } });
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows unknown-kind state for a slug that does not map to any record', async () => {
    renderWithProviders(<RecordBrowser slug="not-a-kind" />);
    expect(await screen.findByText('Unknown record kind')).toBeInTheDocument();
  });
});
