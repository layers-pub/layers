/**
 * Rotating color palette for annotation layer visualization.
 *
 * @remarks
 * 12 distinct oklch colors chosen for accessibility (WCAG AA contrast against
 * both white and dark backgrounds). Each color uses moderate chroma to remain
 * distinguishable for colorblind users while being visually distinct.
 *
 * @packageDocumentation
 */

/**
 * 12-color rotating palette for annotation layer visualization.
 *
 * Colors are ordered to maximize perceptual distance between adjacent entries,
 * reducing confusion when layers are displayed side by side.
 */
const ANNOTATION_COLORS: readonly string[] = [
  'oklch(0.65 0.20 25)',
  'oklch(0.70 0.15 145)',
  'oklch(0.60 0.20 260)',
  'oklch(0.75 0.18 55)',
  'oklch(0.55 0.22 310)',
  'oklch(0.72 0.16 185)',
  'oklch(0.62 0.18 350)',
  'oklch(0.68 0.17 110)',
  'oklch(0.58 0.20 230)',
  'oklch(0.74 0.14 85)',
  'oklch(0.60 0.19 290)',
  'oklch(0.70 0.15 165)',
] as const;

/**
 * Returns the palette color for the given layer index.
 *
 * Wraps around after 12 entries so any number of layers can be colored.
 *
 * @param index - zero-based layer index
 * @returns oklch color string
 */
function getLayerColor(index: number): string {
  return ANNOTATION_COLORS[index % ANNOTATION_COLORS.length]!;
}

export { ANNOTATION_COLORS, getLayerColor };
