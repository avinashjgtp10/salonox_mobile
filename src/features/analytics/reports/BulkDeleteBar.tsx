import { useState } from "react";
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
  /** Client names of the selected rows — shown in the message when there are few enough to list. */
  names?: string[];
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const CONFIRM_WORD = "DELETE";

// Confirmation dialog shown before the selected appointments are permanently
// (soft-)deleted. Matches the "type DELETE to confirm" pattern already used
// for Delete Service/Category/etc. elsewhere in the app (e.g.
// ServicesListPage.tsx) — the delete button stays disabled until the exact
// word is typed, so there's no accidental delete-on-click.
export function BulkDeleteConfirmModal({ show, count, names, deleting, error, onCancel, onConfirm }: BulkDeleteConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD && !deleting;

  const handleCancel = () => {
    setConfirmText("");
    onCancel();
  };

  const handleConfirm = async () => {
    await onConfirm();
    setConfirmText("");
  };

  const subject = names && names.length > 0 && names.length <= 3
    ? names.map(n => `"${n}"`).join(", ")
    : `${count} appointment${count !== 1 ? "s" : ""}`;

  return (
    <Modal
      show={show}
      onClose={deleting ? () => {} : handleCancel}
      title={count === 1 ? "Delete Appointment" : "Delete Appointments"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleCancel} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} loading={deleting} disabled={!canDelete}>
            Delete {count === 1 ? "Appointment" : "Appointments"}
          </Button>
        </>
      }
    >
      <p className="mb-3">
        Are you sure you want to delete {subject}? This action cannot be undone.
      </p>
      <div className="mb-2">
        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Type DELETE to confirm</label>
        <input
          type="text"
          className="form-control"
          placeholder="DELETE"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          autoFocus
        />
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}
    </Modal>
  );
}
