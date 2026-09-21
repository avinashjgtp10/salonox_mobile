import Button from "../../../components/ui/Button";

interface SendCampaignBarProps {
  count: number;
  onSendClick: () => void;
  /** Total rows matching the report's current filter (the server-side
   *  pagination total), not just what's loaded on this page. Omit to keep
   *  this bar exactly as before (no "Select all" link) — used by reports
   *  that haven't wired up the matching-filter fetch yet. */
  totalMatching?: number;
  /** Fetches every row matching the current filter (bypassing the page/
   *  limit cap) and selects all of them. Required when totalMatching is
   *  passed and exceeds count. */
  onSelectAllClick?: () => void;
  /** Shows a busy state on the "Select all" link while that fetch is in flight. */
  selectingAll?: boolean;
}

// Small toolbar that appears above a report table once at least one row
// checkbox is selected — mirrors BulkDeleteBar.tsx's shape, reused across
// every report wired up to SendCampaignModal.
export function SendCampaignBar({ count, onSendClick, totalMatching, onSelectAllClick, selectingAll }: SendCampaignBarProps) {
  if (count === 0) return null;
  // "Select all" only makes sense once there's more matching this filter
  // than what's already selected — page selection alone can't reach more
  // than what's currently loaded (max page size), so this is the only way
  // to select beyond that.
  const showSelectAll = typeof totalMatching === "number" && totalMatching > count && !!onSelectAllClick;
  return (
    <div className="rp-bulk-bar rp-bulk-bar--campaign">
      <span>
        {count} client{count !== 1 ? "s" : ""} selected
        {showSelectAll && (
          <button
            type="button"
            className="rp-select-all-matching-link"
            onClick={onSelectAllClick}
            disabled={selectingAll}
          >
            {selectingAll ? "Selecting…" : `Select all ${totalMatching.toLocaleString()} matching this filter`}
          </button>
        )}
      </span>
      <Button variant="success" className="rp-bulk-delete-btn" onClick={onSendClick}>
        Send Campaign
      </Button>
    </div>
  );
}
