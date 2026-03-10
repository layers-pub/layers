/**
 * Tests for the DocumentTagRenderer component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DocumentTagRenderer } from '@/components/annotations/renderers/document-tag-renderer';
import type { AnnotationItem, AnnotationLayerData } from '@/components/annotations/types';
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

const color = 'oklch(0.65 0.20 25)';

function makeLayer(items: AnnotationItem[]): AnnotationLayerData {
  return {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/doc1',
    kind: 'document-tag',
    subkind: 'sentiment',
    items,
  };
}

function makeItem(overrides: Partial<AnnotationItem> & { id: string }): AnnotationItem {
  return {
    label: '',
    ...overrides,
  };
}

describe('DocumentTagRenderer', () => {
  it('renders document-level tags as badges', () => {
    const items: AnnotationItem[] = [
      makeItem({ id: '1', label: 'positive' }),
      makeItem({ id: '2', label: 'neutral' }),
    ];
    const layer = makeLayer(items);

    renderWithProviders(<DocumentTagRenderer layer={layer} color={color} />);

    expect(screen.getByText('positive')).toBeInTheDocument();
    expect(screen.getByText('neutral')).toBeInTheDocument();
  });

  it('renders tag values (value preferred over label)', () => {
    const items: AnnotationItem[] = [makeItem({ id: '1', label: 'SENTIMENT', value: 'positive' })];
    const layer = makeLayer(items);

    renderWithProviders(<DocumentTagRenderer layer={layer} color={color} />);

    // The AnnotationBadge displays value ?? label, so "positive" should appear
    expect(screen.getByText('positive')).toBeInTheDocument();
  });

  it('handles empty items', () => {
    const layer = makeLayer([]);

    renderWithProviders(<DocumentTagRenderer layer={layer} color={color} />);

    expect(screen.getByText('No document-level tags in this layer.')).toBeInTheDocument();
  });

  it('applies color to badges', () => {
    const items: AnnotationItem[] = [makeItem({ id: '1', label: 'joy' })];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(<DocumentTagRenderer layer={layer} color={color} />);

    // The AnnotationBadge uses color-mix with the provided oklch color
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).not.toBeNull();
    const style = (badge as HTMLElement).getAttribute('style') ?? '';
    // Check for the oklch color value (jsdom may normalize 0.20 to 0.2)
    expect(style).toContain('oklch');
    expect(style).toContain('0.65');
  });

  it('shows confidence indicator when confidence is present', () => {
    const items: AnnotationItem[] = [makeItem({ id: '1', label: 'positive', confidence: 850 })];
    const layer = makeLayer(items);

    const { container } = renderWithProviders(<DocumentTagRenderer layer={layer} color={color} />);

    // The ConfidenceIndicator renders a meter role element via the render prop
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter).toHaveAttribute('aria-valuenow', '850');
  });
});
