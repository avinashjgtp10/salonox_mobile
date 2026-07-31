import { useNavigate } from "react-router-dom";
import { ChevronRight } from "react-bootstrap-icons";

// Each report lives at its own URL (/reports/:category/:reportSlug). "Reports"
// navigates back via onBack (same destination as /reports, but lets each
// report page run its own cleanup first). The category segment links to
// /reports?expand=<categoryKey> — ReportsPage reads that on mount and
// pre-expands the matching category so it's not just a dead label.
export default function Breadcrumb({
  current, category, categoryKey, onBack,
}: { current: string; category: string; categoryKey: string; onBack: () => void }) {
  const navigate = useNavigate();

  return (
    <nav className="rp-breadcrumb" aria-label="Breadcrumb">
      <button type="button" className="rp-breadcrumb-link" onClick={onBack}>
        Reports
      </button>
      <ChevronRight size={11} className="rp-breadcrumb-sep" />
      <button type="button" className="rp-breadcrumb-link" onClick={() => navigate(`/reports?expand=${categoryKey}`)}>
        {category}
      </button>
      <ChevronRight size={11} className="rp-breadcrumb-sep" />
      <span className="rp-breadcrumb-current">{current}</span>
    </nav>
  );
}
