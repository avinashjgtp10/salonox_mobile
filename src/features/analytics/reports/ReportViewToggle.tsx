import { ListUl, GraphUp } from "react-bootstrap-icons";

// Explicit "Table View / Chart View" segmented control — makes the current
// mode always visible, instead of a single icon whose meaning depends on
// which view you're already looking at.
export default function ReportViewToggle({
  view, onChange,
}: {
  view: "table" | "chart";
  onChange: (view: "table" | "chart") => void;
}) {
  return (
    <div className="rp-view-toggle" role="group" aria-label="Report view">
      <button
        type="button"
        className={`rp-view-toggle-btn ${view === "table" ? "active" : ""}`}
        onClick={() => onChange("table")}
      >
        <ListUl size={13} /> Table View
      </button>
      <button
        type="button"
        className={`rp-view-toggle-btn ${view === "chart" ? "active" : ""}`}
        onClick={() => onChange("chart")}
      >
        <GraphUp size={13} /> Chart View
      </button>
    </div>
  );
}
