import { describe, expect, it } from 'vitest';

import { RecordLink } from '@/components/records/record-link';

import { render, screen } from '../../test-utils';

describe('RecordLink', () => {
  it('renders a link for known record NSIDs', () => {
    render(<RecordLink uri="at://did:plc:abc/pub.layers.persona.persona/rk1" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      `/persona/${encodeURIComponent('at://did:plc:abc/pub.layers.persona.persona/rk1')}`,
    );
  });

  it('resolves irregular-plural collections correctly', () => {
    render(<RecordLink uri="at://did:plc:abc/pub.layers.corpus.corpus/rk1" />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining('/corpus/'),
    );
  });

  it('falls back to raw URI span when NSID is unknown', () => {
    render(<RecordLink uri="at://did:plc:abc/org.unknown.record/rk1" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('at://did:plc:abc/org.unknown.record/rk1')).toBeInTheDocument();
  });

  it('honors a custom display label when provided', () => {
    render(
      <RecordLink uri="at://did:plc:abc/pub.layers.persona.persona/rk1" label="Alice" />,
    );
    expect(screen.getByRole('link')).toHaveTextContent('Alice');
  });
});
