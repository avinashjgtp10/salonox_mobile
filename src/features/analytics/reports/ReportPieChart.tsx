// Shared Pie Chart for every Report's Chart tab — built once so individual
// report tickets consume this instead of each hand-rolling their own
// PieChart/Pie/Cell/Tooltip/Legend wiring (percentages, colors, no-data
// state, and responsiveness all differ subtly between hand-rolled copies).
//
// Usage: pass raw { name, value }[] slices — this component derives
// percentages, applies the fixed categorical color order, folds any slice
// past MAX_VISIBLE_SLICES into "Other" (see dataviz guidance: past ~6-7
// segments adjacent classes blur and stop being readable at a glance), and
// renders the legend/tooltip/empty state consistently everywhere it's used.
import { useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import "./ReportPieChart.scss";

export interface PieChartSlice {
  name: string;
  value: number;
}

export interface ReportPieChartProps {
  /** Raw slices — need not be pre-sorted or pre-capped, this component handles both. */
  data: PieChartSlice[];
  /** Formats a raw value for the tooltip/legend (e.g. currency or a plain number). Defaults to a plain locale-formatted number. */
  formatValue?: (value: number) => string;
  /** Chart title shown above the plot (optional — omit when the surrounding page already labels it). */
  title?: string;
  /** Fixed pixel height for the ResponsiveContainer. */
  height?: number;
  /** Renders an inner radius, turning the pie into a donut. 0 (default) = solid pie. */
  innerRadiusRatio?: number;
  /** Text shown in the empty state when data has no positive-value slices. */
  emptyMessage?: string;
  /** Skeleton/placeholder mode — shows a loading block instead of the chart. */
  loading?: boolean;
  /** Error message — shown instead of the chart when set. */
  error?: string | null;
}

// Fixed categorical hue order (not cycled/generated) — same order the
// dataviz color-formula uses, chosen so adjacent slices stay visually
// distinct at a glance and under common color-vision deficiencies. "Other"
// (the fold-in bucket for anything past MAX_VISIBLE_SLICES) always renders
// in the trailing neutral gray, never one of the identity hues, since it
// isn't a real single category.
const SLICE_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#4a3aa7", // violet
  "#e34948", // red
];
const OTHER_COLOR = "#94a3b8"; // neutral gray — reserved for the folded "Other" bucket only

// Past this many slices, adjacent segments blur together and stop being
// readable at a glance (dataviz guidance: ≤6-7 categorical classes) — the
// smallest excess slices are folded into a single trailing "Other" bucket
// instead of piling on more generated hues.
const MAX_VISIBLE_SLICES = 6;

const defaultFormatValue = (v: number) => v.toLocaleString("en-IN");

function buildChartSlices(data: PieChartSlice[]) {
  const positive = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
  const sorted = [...positive].sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_VISIBLE_SLICES) return sorted;

  const visible = sorted.slice(0, MAX_VISIBLE_SLICES);
  const rest = sorted.slice(MAX_VISIBLE_SLICES);
  const otherTotal = rest.reduce((sum, s) => sum + s.value, 0);
  return [...visible, { name: `Other (${rest.length})`, value: otherTotal }];
}

export default function ReportPieChart({
  data,
  formatValue = defaultFormatValue,
  title,
  height = 360,
  innerRadiusRatio = 0,
  emptyMessage = "No data available.",
  loading = false,
  error = null,
}: ReportPieChartProps) {
  const slices = useMemo(() => buildChartSlices(data), [data]);
  const total = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices]);

  const colorFor = (index: number, name: string) =>
    name.startsWith("Other (") ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length];

  return (
    <div className="rp-pie-chart">
      {title && <div className="rp-pie-chart__title">{title}</div>}

      {loading ? (
        <div className="rp-pie-chart__skel" style={{ height }} />
      ) : error ? (
        <div className="rp-pie-chart__state rp-pie-chart__state--error" style={{ height }}>{error}</div>
      ) : total <= 0 ? (
        <div className="rp-pie-chart__state rp-pie-chart__state--empty" style={{ height }}>{emptyMessage}</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="78%"
              innerRadius={innerRadiusRatio > 0 ? `${Math.round(innerRadiusRatio * 78)}%` : 0}
              paddingAngle={slices.length > 1 ? 1.5 : 0}
              // Selective direct labels — only percentage on the slice itself
              // (never every raw value crammed onto the pie), full detail
              // moves to the tooltip/legend instead.
              label={({ percent }: { percent?: number }) =>
                percent && percent >= 0.05 ? `${Math.round(percent * 100)}%` : ""
              }
              labelLine={false}
            >
              {slices.map((s, i) => (
                // Index, not name, as the key — callers aren't guaranteed to
                // pass unique slice names (e.g. two genuinely distinct
                // categories that happen to share a label upstream).
                <Cell key={i} fill={colorFor(i, s.name)} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                return [`${formatValue(value)} (${pct}%)`, name];
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              // recharts hands back the legend payload (one entry per Cell,
              // in slice order) rather than just the bare name — used here
              // instead of a name lookup so slices with duplicate labels
              // still each show their own correct percentage.
              formatter={(value: string, _entry: unknown, index: number) => {
                const slice = slices[index];
                const pct = slice && total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
                return `${value} — ${pct}%`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
