import Button from "../../../components/ui/Button";

interface ReportFiltersModalProps {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  /** Report-specific class prefix, e.g. "rp-ds" or "rp-ss" — reuses each
   * report's existing SCSS (overlay/modal/body/actions/close), so this
   * component doesn't force a visual rewrite of any report. */
  classPrefix: string;
  children: React.ReactNode;
}

// Shared shell for every report's Filters modal: overlay, header with a ×
// close button, body (report-specific filter fields passed as children), and
// a Clear/Apply footer. Pair with useDraftFilters for the actual state
// lifecycle — this component only renders the chrome around it.
export default function ReportFiltersModal({
  open, onClose, onClear, onApply, classPrefix, children,
}: ReportFiltersModalProps) {
  if (!open) return null;

  return (
    <div className={`${classPrefix}-filters-overlay`} onClick={onClose}>
      <div className={`${classPrefix}-filters-modal`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Filters</h3>
          <button
            type="button"
            aria-label="Close"
            className={`${classPrefix}-filters-close`}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={`${classPrefix}-filters-body`}>
          {children}
        </div>

        <div className={`${classPrefix}-filters-actions`}>
          <Button variant="ghost" onClick={onClear}>Clear</Button>
          <Button variant="dark" onClick={onApply}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
