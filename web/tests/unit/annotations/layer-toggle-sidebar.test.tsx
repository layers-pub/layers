/**
 * Tests for the LayerToggleSidebar component.
 *
 * @module
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { LayerToggleSidebar } from '@/components/annotations/composition/layer-toggle-sidebar';
import type { AnnotationLayerData } from '@/components/annotations/types';
import { renderWithProviders } from '@/tests/test-utils';

// Mock ScrollArea to avoid Base UI getAnimations error in jsdom
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const color1 = 'oklch(0.65 0.20 25)';
const color2 = 'oklch(0.70 0.15 145)';

function makeLayer(
  kind: string,
  uri: string,
  overrides?: Partial<AnnotationLayerData>,
): AnnotationLayerData {
  return {
    uri,
    kind: kind as AnnotationLayerData['kind'],
    items: [],
    color: color1,
    ...overrides,
  };
}

describe('LayerToggleSidebar', () => {
  it('renders toggle for each layer', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1'),
      makeLayer('span', 'at://test/layer2'),
      makeLayer('relation', 'at://test/layer3'),
    ];
    const visibleLayers = new Set(['at://test/layer1', 'at://test/layer2', 'at://test/layer3']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const layers = [makeLayer('token-tag', 'at://test/layer1')];
    const visibleLayers = new Set(['at://test/layer1']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={onToggle} />,
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith('at://test/layer1');
  });

  it('shows color indicator for each layer', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1', { color: color1 }),
      makeLayer('span', 'at://test/layer2', { color: color2 }),
    ];
    const visibleLayers = new Set(['at://test/layer1', 'at://test/layer2']);

    const { container } = renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    // Color indicators are rendered as small round spans with background color
    const colorDots = container.querySelectorAll('.rounded-full');
    expect(colorDots.length).toBeGreaterThanOrEqual(2);

    // Verify colors are present (jsdom may normalize oklch precision)
    const dotStyles = Array.from(colorDots).map(
      (dot) => (dot as HTMLElement).getAttribute('style') ?? '',
    );
    const allStyles = dotStyles.join(' ');
    expect(allStyles).toContain('0.65');
    expect(allStyles).toContain('0.7');
  });

  it('displays layer label', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1', { label: 'POS Tags' }),
    ];
    const visibleLayers = new Set(['at://test/layer1']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('POS Tags')).toBeInTheDocument();
  });

  it('shows kind badge for each layer', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1'),
      makeLayer('document-tag', 'at://test/layer2'),
    ];
    const visibleLayers = new Set(['at://test/layer1', 'at://test/layer2']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    // formatKind converts "token-tag" to "Token Tag"
    expect(screen.getByText('Token Tag')).toBeInTheDocument();
    expect(screen.getByText('Document Tag')).toBeInTheDocument();
  });

  it('shows subkind text when present', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1', { subkind: 'pos' }),
    ];
    const visibleLayers = new Set(['at://test/layer1']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('pos')).toBeInTheDocument();
  });

  it('renders empty state when no layers', () => {
    renderWithProviders(
      <LayerToggleSidebar layers={[]} visibleLayers={new Set()} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('No annotation layers')).toBeInTheDocument();
  });

  it('shows layer count in header', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1'),
      makeLayer('span', 'at://test/layer2'),
    ];
    const visibleLayers = new Set(['at://test/layer1', 'at://test/layer2']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    expect(screen.getByText('Layers (2)')).toBeInTheDocument();
  });

  it('reflects visibility state in checkbox checked attribute', () => {
    const layers = [
      makeLayer('token-tag', 'at://test/layer1'),
      makeLayer('span', 'at://test/layer2'),
    ];
    // Only layer1 is visible
    const visibleLayers = new Set(['at://test/layer1']);

    renderWithProviders(
      <LayerToggleSidebar layers={layers} visibleLayers={visibleLayers} onToggle={vi.fn()} />,
    );

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes[0]!.checked).toBe(true);
    expect(checkboxes[1]!.checked).toBe(false);
  });
});
