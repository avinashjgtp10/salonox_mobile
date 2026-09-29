import React, { useState } from "react";
import { GripVertical } from "react-bootstrap-icons";
import Modal from "../../../../components/ui/Modal";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useAppDispatch } from "../../../../hooks/useAppRedux";
import { setStaffList } from "../../../../store/schedulerSlice";
import { useStatusOverlay } from "../../../../hooks/useStatusOverlay";
import api from "../../../../services/api/axios";
import { STAFF } from "../../../../services/api/endpoints";
import "../../styles/Scheduler.scss";

interface Props {
  onClose: () => void;
}

/**
 * "Reorder Staff" popup — drags the Scheduler's active staff into whatever
 * column order the salon owner wants. Reordering is local until Save; Save
 * persists it (PUT /staff/scheduler-order) and reorders the live Scheduler's
 * staffList immediately rather than waiting on the next background refetch.
 */
const StaffSequenceModal: React.FC<Props> = ({ onClose }) => {
  const { staffList } = useSchedulerContext();
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [order, setOrder] = useState(() => staffList.slice());
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function moveDraggedBefore(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setOrder((prev) => {
      const from = prev.findIndex((s) => s.id === dragId);
      const to = prev.findIndex((s) => s.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(STAFF.SCHEDULER_ORDER, { staffIds: order.map((s) => s.id) });
      dispatch(setStaffList(order));
      showSuccess("Staff sequence saved");
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      showError(e?.response?.data?.error?.message ?? "Could not save the staff sequence");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {overlay}
      <Modal
        show
        onClose={onClose}
        title="Reorder Staff"
        size="sm"
        footer={
          <>
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || order.length === 0}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {order.length === 0 ? (
          <p className="text-muted mb-0">No active staff to reorder.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {order.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => { e.preventDefault(); moveDraggedBefore(s.id); }}
                onDragEnd={() => setDragId(null)}
                className="d-flex align-items-center gap-2 px-3 py-2 border rounded-3 bg-white"
                style={{ cursor: "grab", opacity: dragId === s.id ? 0.5 : 1 }}
              >
                <GripVertical className="text-muted" />
                <span
                  className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 28, height: 28, background: s.color, color: "#fff", fontSize: 11, fontWeight: 700 }}
                >
                  {s.initials}
                </span>
                <span className="fw-semibold">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};

export default StaffSequenceModal;
