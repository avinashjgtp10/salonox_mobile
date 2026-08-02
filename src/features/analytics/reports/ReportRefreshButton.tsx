import { ArrowClockwise } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";

interface ReportRefreshButtonProps {
  /** Re-fetches the report with whatever filters/pagination are currently applied. */
  onClick: () => void | Promise<void>;
  loading: boolean;
  className?: string;
}

// Single reusable "Refresh" control for every report's filter bar — replaces
// each report's own copy of <Button className="rp-detail-refresh-btn">
// (previously labelled "Run Report" on most, "Refresh" on a couple, and
// styled inconsistently — Sales Summary alone used a solid black button
// while every other report used the light/outlined "ghost" style). Solid
// black (variant="dark") everywhere now, per request. Button's own `loading`
// prop already disables the control and swaps in a spinner (see
// components/ui/Button.tsx), so this component doesn't need to re-implement
// the double-click guard — it only needs to standardize the label/icon/color
// every report shows.
export default function ReportRefreshButton({ onClick, loading, className = "" }: ReportRefreshButtonProps) {
  return (
    <Button
      variant="dark"
      className={`rp-detail-refresh-btn ${className}`.trim()}
      onClick={onClick}
      loading={loading}
      iconLeft={<ArrowClockwise size={14} />}
    >
      Refresh
    </Button>
  );
}
