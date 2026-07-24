import { Trash } from "react-bootstrap-icons";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";

interface BulkDeleteBarProps {
  count: number;
  onDeleteClick: () => void;
}

// Small toolbar that appears above a report table once at least one row
// checkbox is selected. Shared by every appointment-linked report.
export function BulkDeleteBar({ count, onDeleteClick }: BulkDeleteBarProps) {
  if (count === 0) return null;
  return (
    <div className="rp-bulk-bar">
      <span>{count} appointment{count !== 1 ? "s" : ""} selected</span>
      <Button variant="danger" className="rp-bulk-delete-btn" onClick={onDeleteClick}>
        <Trash size={14} /> Delete Selected
      </Button>
    </div>
  );
}

interface BulkDeleteConfirmModalProps {
  show: boolean;
  count: number;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// Confirmation dialog shown before the selected appointments are permanently
// (soft-)deleted. Deliberately requires an explicit confirm click — no
// accidental delete-on-click.
export function BulkDeleteConfirmModal({ show, count, deleting, error, onCancel, onConfirm }: BulkDeleteConfirmModalProps) {
  return (
    <Modal
      show={show}
      onClose={deleting ? () => {} : onCancel}
      title="Delete selected appointments?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>
            Delete {count} appointment{count !== 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      <p style={{ marginBottom: error ? 10 : 0 }}>
        This will permanently delete {count} selected appointment{count !== 1 ? "s" : ""}.
        This action cannot be undone from this screen.
      </p>
      {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}
    </Modal>
  );
}
