import { describe, expect, it } from 'vitest';

import { FieldValue } from '@/components/records/field-value';
import type { FieldMeta } from '@/lib/generated/record-registry';

import { render, screen } from '../../test-utils';

function field(overrides: Partial<FieldMeta> = {}): FieldMeta {
  return {
    name: 'x',
    label: 'X',
    kind: 'string',
    required: false,
    description: null,
    format: null,
    enumValues: null,
    itemKind: null,
    itemRefTarget: null,
    refTarget: null,
    ...overrides,
  };
}

describe('FieldValue', () => {
  it('renders em-dash for null/empty values', () => {
    render(<FieldValue field={field()} value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders ref fields as record links', () => {
    render(
      <FieldValue
        field={field({ kind: 'ref' })}
        value="at://did:plc:abc/pub.layers.persona.persona/rk1"
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('/persona/'));
  });

  it('renders datetime as time element with formatted text', () => {
    const iso = '2026-04-17T12:00:00Z';
    render(<FieldValue field={field({ kind: 'datetime' })} value={iso} />);
    const time = screen.getByRole('time', { hidden: true }) ?? screen.getByText(/2026/);
    expect(time).toBeDefined();
  });

  it('renders enum values as badges', () => {
    render(<FieldValue field={field({ kind: 'enum' })} value="token-tag" />);
    expect(screen.getByText('token-tag')).toBeInTheDocument();
  });

  it('renders boolean values as true/false badges', () => {
    render(<FieldValue field={field({ kind: 'boolean' })} value={true} />);
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('renders arrays with first N items and overflow count', () => {
    const big = Array.from({ length: 15 }, (_, i) => `item-${i}`);
    render(<FieldValue field={field({ kind: 'array', itemKind: 'string' })} value={big} />);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('renders long strings inside a collapsible details element', () => {
    const long = 'x'.repeat(200);
    render(<FieldValue field={field({ kind: 'string' })} value={long} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('renders objects as JSON inside a pre block', () => {
    render(
      <FieldValue field={field({ kind: 'object' })} value={{ foo: 'bar', n: 1 }} />,
    );
    expect(screen.getByText(/"foo": "bar"/)).toBeInTheDocument();
  });
});
