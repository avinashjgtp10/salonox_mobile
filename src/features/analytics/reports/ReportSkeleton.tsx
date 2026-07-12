// Placeholder blocks shaped like each report's real layout (stat cards, table
// rows, chart) shown while data is loading — instead of a blank area or a
// bare spinner, so the layout doesn't visibly pop in once data arrives.
import "./ReportSkeleton.scss";

export function SkeletonStatCards({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div className={`rp-sra-summary-row ${className}`.trim()}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rp-sra-summary-card rp-skel-card">
          <div className="rp-skel-bar rp-skel-bar--val" />
          <div className="rp-skel-bar rp-skel-bar--label" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="rp-skel-row">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c}><div className="rp-skel-bar" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonChartBlock({ height = 280 }: { height?: number }) {
  return <div className="rp-skel-chart" style={{ height }} />;
}

export function SkeletonLine({ width }: { width?: string | number }) {
  return <div className="rp-skel-bar" style={width ? { width } : undefined} />;
}
