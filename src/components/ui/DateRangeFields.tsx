interface DateRangeFieldsProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Overrides the default "From Date" label, e.g. for a non-primary range like "Last Visit". */
  label?: string;
  /** Hides the label entirely (the field group still renders, just without the <label>). */
  hideLabel?: boolean;
  containerClassName?: string;
  /** Skips the outer .rp-detail-filter-group wrapper — use when nesting inside a caller-provided group (e.g. below a preset dropdown in the same field group). */
  bare?: boolean;
}

/**
 * Reusable From Date / To Date filter pair, used consistently across every
 * report page. Enforces "To Date >= From Date" two ways at once: native
 * min/max attributes disable the invalid dates directly in each date
 * picker, and an inline message explains why if a value somehow ends up
 * invalid anyway (e.g. typed directly rather than picked).
 */
export default function DateRangeFields({
  from, to, onFromChange, onToChange,
  label = "From Date", hideLabel = false, containerClassName = "", bare = false,
}: DateRangeFieldsProps) {
  const error = from && to && to < from
    ? "To Date must be greater than or equal to From Date"
    : "";

  const content = (
    <>
      {!hideLabel && <label className="rp-detail-filter-label">{label}</label>}
      <div className="rp-detail-date-range">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={e => onFromChange(e.target.value)}
          className="rp-detail-date-input"
          aria-label="From Date"
        />
        <span className="rp-detail-date-sep">-</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={e => onToChange(e.target.value)}
          className="rp-detail-date-input"
          aria-label="To Date"
        />
      </div>
      {error && <div className="rp-detail-date-error">{error}</div>}
    </>
  );

  if (bare) return content;
  return <div className={`rp-detail-filter-group ${containerClassName}`.trim()}>{content}</div>;
}

/** Standalone validity check, for reports that need to gate fetch/export on the same rule without rendering the fields (e.g. checking a second date-range filter). */
export function getDateRangeError(from: string, to: string): string {
  return from && to && to < from
    ? "To Date must be greater than or equal to From Date"
    : "";
}
