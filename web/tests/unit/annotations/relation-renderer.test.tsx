/**
 * Tests for the RelationRenderer component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { RelationRenderer } from '@/components/annotations/renderers/relation-renderer';
import type { AnnotationItem, AnnotationLayerData, Token } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

vi.mock('@/components/ui/tooltip', async () => {
  const R = await import('react');
  return {
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({
      children,
      render,
    }: {
      children: React.ReactNode;
      render?: React.ReactElement;
    }) => {
      if (render && R.isValidElement(render)) {
        return R.cloneElement(render, {}, children);
      }
      return <span data-testid="tooltip-trigger">{children}</span>;
    },
    TooltipContent: () => null,
  };
});

const tokens: Token[] = [
  { text: 'The', index: 0, start: 0, end: 3 },
  { text: 'cat', index: 1, start: 4, end: 7 },
  { text: 'sat', index: 2, start: 8, end: 11 },
];
const color = 'oklch(0.65 0.20 25)';

function makeLayer(items: AnnotationItem[]): AnnotationLayerData {
  return {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/rel1',
    kind: 'relation',
    subkind: 'srl',
    items,
  };
}

function makeItem(overrides: Partial<AnnotationItem> & { id: string }): AnnotationItem {
  return {
    label: '',
    ...overrides,
  };
}

describe('RelationRenderer', () => {
  it('renders relation cards with predicate and arguments', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: 'agent', label: 'cat', value: 'cat' }),
      makeItem({ id: 'patient', label: 'mat', value: 'mat' }),
      makeItem({
        id: 'rel1',
        label: 'sit-on',
        arguments: [
          { role: 'Agent', targetId: 'agent' },
          { role: 'Patient', targetId: 'patient' },
        ],
      }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<RelationRenderer layer={layer} tokens={tokens} color={color} />);

    // Predicate label should appear as card title
    expect(screen.getByText('sit-on')).toBeInTheDocument();
    // Role labels should appear
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Patient')).toBeInTheDocument();
    // Target labels resolved from item map (value preferred)
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('mat')).toBeInTheDocument();
  });

  it('renders role labels', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: 'rel1',
        label: 'cause',
        arguments: [
          { role: 'Cause', targetId: 'x', targetLabel: 'fire' },
          { role: 'Effect', targetId: 'y', targetLabel: 'damage' },
        ],
      }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<RelationRenderer layer={layer} tokens={tokens} color={color} />);

    expect(screen.getByText('Cause')).toBeInTheDocument();
    expect(screen.getByText('Effect')).toBeInTheDocument();
    expect(screen.getByText('fire')).toBeInTheDocument();
    expect(screen.getByText('damage')).toBeInTheDocument();
  });

  it('handles empty items', () => {
    const layer = makeLayer([]);

    renderWithProviders(<RelationRenderer layer={layer} tokens={tokens} color={color} />);

    expect(screen.getByText('No relation annotations in this layer.')).toBeInTheDocument();
  });

  it('handles items without arguments', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: '1', label: 'orphan' }),
      makeItem({ id: '2', label: 'also-orphan' }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<RelationRenderer layer={layer} tokens={tokens} color={color} />);

    // Items with no arguments are filtered out, so empty state shows
    expect(screen.getByText('No relation annotations in this layer.')).toBeInTheDocument();
  });

  it('resolves targetLabel from itemMap when targetLabel is not provided', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: 'tok-cat', label: 'NN', value: 'feline' }),
      makeItem({
        id: 'rel1',
        label: 'describe',
        arguments: [{ role: 'Theme', targetId: 'tok-cat' }],
      }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<RelationRenderer layer={layer} tokens={tokens} color={color} />);

    // Should resolve to the value ("feline") of the target item
    expect(screen.getByText('feline')).toBeInTheDocument();
  });

  it('falls back to targetId when target item is not found', () => {
    const items: AnnotationItem[] = [
      makeItem({
        id: 'rel1',
        label: 'unknown-rel',
        arguments: [{ role: 'Arg0', targetId: 'missing-item' }],
      }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<RelationRenderer layer={layer} tokens={tokens} color={color} />);

    expect(screen.getByText('missing-item')).toBeInTheDocument();
  });
});
