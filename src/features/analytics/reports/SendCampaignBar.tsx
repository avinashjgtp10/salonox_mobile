import { Send } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";

interface SendCampaignBarProps {
  count: number;
  onSendClick: () => void;
}

// Small toolbar that appears above a report table once at least one row
// checkbox is selected — mirrors BulkDeleteBar.tsx's shape, reused across
// every report wired up to SendCampaignModal.
export function SendCampaignBar({ count, onSendClick }: SendCampaignBarProps) {
  if (count === 0) return null;
  return (
    <div className="rp-bulk-bar rp-bulk-bar--campaign">
      <span>{count} client{count !== 1 ? "s" : ""} selected</span>
      <Button variant="success" className="rp-bulk-delete-btn" onClick={onSendClick}>
        <Send size={14} /> Send Campaign
      </Button>
    </div>
  );
}
