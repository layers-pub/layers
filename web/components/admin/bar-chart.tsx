/**
 * SVG bar chart for admin dashboard visualizations.
 *
 * @module
 */

// =============================================================================
// TYPES
// =============================================================================

interface BarChartDatum {
  readonly label: string;
  readonly value: number;
}

interface BarChartProps {
  /** Data points to render as bars. */
  readonly data: readonly BarChartDatum[];
  /** Height of the chart in pixels. Defaults to 192. */
  readonly height?: number;
  /** Whether to orient bars horizontally. Defaults to false (vertical). */
  readonly horizontal?: boolean;
  /** Accessible description for screen readers. */
  readonly ariaLabel?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_HEIGHT = 192;
const PADDING = { top: 16, right: 16, bottom: 40, left: 56 };
const HORIZONTAL_PADDING = { top: 8, right: 48, bottom: 8, left: 120 };
const BAR_GAP_RATIO = 0.25;
const TICK_COUNT = 5;

// =============================================================================
// HELPERS
// =============================================================================

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function niceMax(max: number): number {
  if (max <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + '\u2026';
}

// =============================================================================
// VERTICAL BAR CHART
// =============================================================================

function VerticalBars({
  data,
  width,
  height,
}: {
  readonly data: readonly BarChartDatum[];
  readonly width: number;
  readonly height: number;
}): React.JSX.Element {
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const maxValue = niceMax(rawMax);
  const barWidth = chartWidth / data.length;
  const innerBar = barWidth * (1 - BAR_GAP_RATIO);

  return (
    <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
      {/* Y-axis ticks and grid lines */}
      {Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
        const tickValue = (maxValue / TICK_COUNT) * i;
        const y = chartHeight - (tickValue / maxValue) * chartHeight;
        return (
          <g key={i}>
            <line
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              className="stroke-border"
              strokeDasharray={i === 0 ? undefined : '4 4'}
              strokeWidth={0.5}
            />
            <text
              x={-8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatValue(tickValue)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
        const x = i * barWidth + (barWidth - innerBar) / 2;
        const y = chartHeight - barHeight;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={innerBar} height={barHeight} rx={2} className="fill-primary">
              <title>
                {d.label}: {d.value.toLocaleString()}
              </title>
            </rect>
            {/* Value label above bar */}
            {barHeight > 0 && (
              <text
                x={x + innerBar / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {formatValue(d.value)}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={x + innerBar / 2}
              y={chartHeight + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {truncateLabel(d.label, 12)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// =============================================================================
// HORIZONTAL BAR CHART
// =============================================================================

function HorizontalBars({
  data,
  width,
  height,
}: {
  readonly data: readonly BarChartDatum[];
  readonly width: number;
  readonly height: number;
}): React.JSX.Element {
  const pad = HORIZONTAL_PADDING;
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const maxValue = niceMax(rawMax);
  const barHeight = chartHeight / data.length;
  const innerBar = barHeight * (1 - BAR_GAP_RATIO);

  return (
    <g transform={`translate(${pad.left}, ${pad.top})`}>
      {/* Bars */}
      {data.map((d, i) => {
        const barW = maxValue > 0 ? (d.value / maxValue) * chartWidth : 0;
        const y = i * barHeight + (barHeight - innerBar) / 2;
        return (
          <g key={d.label}>
            {/* Label */}
            <text
              x={-8}
              y={y + innerBar / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {truncateLabel(d.label, 16)}
            </text>
            {/* Bar */}
            <rect x={0} y={y} width={barW} height={innerBar} rx={2} className="fill-primary">
              <title>
                {d.label}: {d.value.toLocaleString()}
              </title>
            </rect>
            {/* Value to the right of bar */}
            <text
              x={barW + 6}
              y={y + innerBar / 2}
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatValue(d.value)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function BarChart({
  data,
  height = DEFAULT_HEIGHT,
  horizontal = false,
  ariaLabel = 'Bar chart',
}: BarChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        No data to display.
      </div>
    );
  }

  // Use a fixed internal width for viewBox; the SVG scales responsively
  const viewBoxWidth = 600;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {horizontal ? (
        <HorizontalBars data={data} width={viewBoxWidth} height={height} />
      ) : (
        <VerticalBars data={data} width={viewBoxWidth} height={height} />
      )}
    </svg>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { BarChart };
export type { BarChartDatum, BarChartProps };
