import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import { Dropdown } from "../../../components/ui/Dropdown";
import type { AppDispatch } from "../../../store/store";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { selectAllStaff, selectUserProfile } from "../../../store/selectors/slices.selectors";

interface Props {
  mode: "approve" | "reject";
  /** Excluded from the picker — an audit can't be reviewed by its own auditor. */
  auditorId: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (params: { reviewerId: string; reason?: string }) => void | Promise<void>;
}

// Shared "who's reviewing this" dialog for both Approve and Reject — the
// reviewer defaults to the logged-in user but can be reassigned to record a
// different staff member as the one who actually verified the audit (e.g. a
// manager approving on a colleague's behalf). Same staff-picker pattern as
// CreateAuditModal's Auditor field.
export default function ReviewAuditModal({ mode, auditorId, busy, onClose, onConfirm }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const staff = useSelector(selectAllStaff);
  const userProfile = useSelector(selectUserProfile);

  // Undefined = "not yet manually changed", so the default below stays live
  // as the staff list loads instead of a useEffect syncing state a render
  // away — a plain null-coalesce is enough since this only ever needs to
  // read the current logged-in user once staff data arrives.
  const [manualReviewerId, setManualReviewerId] = useState<string | undefined>(undefined);
  const [reason, setReason] = useState("");

  useEffect(() => { dispatch(fetchStaffThunk()); }, [dispatch]);

  const defaultReviewerId = useMemo(() => {
    const self = staff.find((s: any) => s.user_id === userProfile?.id);
    const selfId = self ? String(self.user_id) : (userProfile?.id ? String(userProfile.id) : "");
    // The logged-in user can't review their own audit — leave the field
    // blank so they have to actively pick someone else instead of the
    // dropdown showing an unusable pre-selection.
    return selfId && selfId !== auditorId ? selfId : "";
  }, [staff, userProfile, auditorId]);

  const reviewerId = manualReviewerId ?? defaultReviewerId;

  const staffOptions = useMemo(
    () => staff
      .filter((s: any) => s.user_id && String(s.user_id) !== auditorId)
      .map((s: any) => ({ id: String(s.user_id), name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed" })),
    [staff, auditorId],
  );

  const canConfirm = !!reviewerId && (mode === "approve" || reason.trim().length > 0);

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm({ reviewerId, reason: mode === "reject" ? reason.trim() : undefined });
  };

  return (
    <Modal
      show
      onClose={onClose}
      title={mode === "approve" ? "Approve & Complete Audit" : "Reject Audit"}
      scrollable={false}
      footer={
        <div className="d-flex justify-content-end gap-2 w-100">
          <Button variant="outline-dark" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant={mode === "approve" ? "success" : "danger"}
            onClick={confirm}
            disabled={!canConfirm || busy}
            loading={busy}
          >
            {mode === "approve" ? "Approve & Complete" : "Reject Audit"}
          </Button>
        </div>
      }
    >
      <label className="paudit-label">Reviewed by <span className="paudit-req">*</span></label>
      <Dropdown
        value={reviewerId}
        options={staffOptions}
        placeholder="Select staff member"
        onChange={setManualReviewerId}
      />
      <p className="paudit-hint mt-2">
        Must be a different staff member than the auditor.
      </p>

      {mode === "approve" && (
        <p className="paudit-hint mt-2">
          Approving updates stock to match the counted quantities and records
          the adjustment in Stock Ledger. This can't be undone from here.
        </p>
      )}

      {mode === "reject" && (
        <>
          <label className="paudit-label mt-3">Rejection reason <span className="paudit-req">*</span></label>
          <textarea
            className="paudit-textarea"
            rows={4}
            placeholder="Explain why this audit is being sent back to In Progress"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </>
      )}
    </Modal>
  );
}
