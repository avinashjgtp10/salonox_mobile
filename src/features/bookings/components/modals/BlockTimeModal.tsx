import React, { useState, useRef, useEffect } from "react";
import type { BlockedTime } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { DatePicker } from "../../../../components/ui";
import TimeSelect from "../shared/TimeSelect";
import Dropdown from "../../../../components/ui/Dropdown";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import { useFocusTrap } from "../../../../hooks/useFocusTrap";
import "../../styles/Scheduler.scss";

interface Props {
  onClose: () => void;
  defaultStaffId?: string;
  editingBlock?: BlockedTime;
}

const BlockTimeModal: React.FC<Props> = ({ onClose, defaultStaffId, editingBlock }) => {
  const { addBlockedTime, updateBlockedTime, deleteBlockedTime, currentDate, interval, staffList, bookings } = useSchedulerContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  const isEdit = !!editingBlock;

  const [date,      setDate]      = useState(editingBlock?.date      || currentDate);
  const [staffId,   setStaffId]   = useState(editingBlock?.staffId   || defaultStaffId || "");
  const [startTime, setStartTime] = useState(editingBlock?.startTime || "");
  const [endTime,   setEndTime]   = useState(editingBlock?.endTime   || "");
  const [reason,    setReason]    = useState(editingBlock?.reason    || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [conflictError, setConflictError] = useState("");

  // Auto-dismiss after a few seconds, same as the rest of the app's transient
  // validation messages — this one previously stuck around indefinitely until
  // the user happened to change a field.
  useEffect(() => {
    if (!conflictError) return;
    const t = setTimeout(() => setConflictError(""), 4000);
    return () => clearTimeout(t);
  }, [conflictError]);

  const canSave = !!staffId && !!startTime && !!endTime && startTime < endTime;

  function hasAppointmentConflict(): boolean {
    return bookings.some((b) => {
      if (b.staffId !== staffId || b.date !== date) return false;
      if (isEdit && String(b.id) === String(editingBlock!.id)) return false;
      return startTime < b.endTime && endTime > b.startTime;
    });
  }

  function handleSave() {
    if (!canSave) return;
    if (hasAppointmentConflict()) {
      setConflictError("An appointment is already scheduled at this time. Cannot add block time here.");
      return;
    }
    setConflictError("");
    if (isEdit) {
      updateBlockedTime({ ...editingBlock!, staffId, date, startTime, endTime, reason });
    } else {
      const bt: BlockedTime = { id: "bt_" + Date.now(), staffId, date, startTime, endTime, reason };
      addBlockedTime(bt);
    }
    onClose();
  }

  function handleDelete() {
    if (!editingBlock) return;
    deleteBlockedTime(editingBlock.id);
    onClose();
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-end btm-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="d-flex flex-column bg-white h-100 btm-drawer" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isEdit ? "Edit Blocked Time" : "New Blocked Time"}>

        {/* Header */}
        <div className="d-flex align-items-center gap-2 px-4 py-3 border-bottom sticky-top bg-white btm-sticky-hdr">
          <button className="btn btn-sm btn-link text-dark p-0 text-decoration-none fs-5" onClick={onClose}>✕</button>
          <h5 className="mb-0 fw-bold">{isEdit ? "Edit Blocked Time" : "New Blocked Time"}</h5>
        </div>

        {/* Body */}
        <div className="p-4 d-flex flex-column gap-3 flex-grow-1">

          {/* Date */}
          <div className="position-relative">
            <label className="form-label fw-semibold text-uppercase text-muted btm-label">Date *</label>
            <DatePicker
              value={date}
              onChange={(d) => { setDate(d); setConflictError(""); }}
            />
          </div>

          {/* Staff */}
          <div>
            <label className="form-label fw-semibold text-uppercase text-muted btm-label">Staff *</label>
            <Dropdown
              className="form-select"
              placeholder="Select Staff"
              value={staffId}
              options={(staffList || []).map((s: { id: string; name: string }) => ({
                id: s.id,
                name: s.name.includes(" ") ? s.name : s.name.replace(/([a-z])([A-Z])/g, "$1 $2"),
              }))}
              onChange={(id) => { setStaffId(id); setConflictError(""); }}
            />
          </div>

          {/* Start / End time */}
          <div className="row g-3">
            <div className="col">
              <label className="form-label fw-semibold text-uppercase text-muted btm-label">Start Time *</label>
              <TimeSelect value={startTime} onChange={(v) => { setStartTime(v); setConflictError(""); }} interval={interval} className="form-select" />
            </div>
            <div className="col">
              <label className="form-label fw-semibold text-uppercase text-muted btm-label">End Time *</label>
              <TimeSelect value={endTime} onChange={(v) => { setEndTime(v); setConflictError(""); }} interval={interval} className="form-select" />
            </div>
          </div>

          {startTime && endTime && startTime >= endTime && (
            <div className="alert alert-warning py-2 px-3 mb-0" style={{ fontSize: 12 }}>
              End time must be after start time.
            </div>
          )}

          {conflictError && (
            <div className="alert alert-danger py-2 px-3 mb-0" style={{ fontSize: 12 }}>
              {conflictError}
            </div>
          )}

          {/* Reason */}
          <Input
            label="Reason"
            multiline
            rows={4}
            value={reason}
            onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)}
            placeholder="e.g. Staff on leave"
          />

          {/* Delete confirmation */}
          {isEdit && confirmDelete && (
            <div className="alert alert-danger py-2 px-3" style={{ fontSize: 13 }}>
              <div className="fw-semibold mb-2">Delete this block time?</div>
              <div className="d-flex gap-2">
                <Button variant="dark" onClick={handleDelete} style={{ background: "#dc2626", borderColor: "#dc2626" }}>
                  Yes, Delete
                </Button>
                <Button variant="outline-secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-top sticky-bottom bg-white d-flex justify-content-between align-items-center gap-2">
          {isEdit && !confirmDelete && (
            <Button
              variant="outline-secondary"
              onClick={() => setConfirmDelete(true)}
              style={{ color: "#dc2626", borderColor: "#dc2626" }}
            >
              🗑 Delete
            </Button>
          )}
          <div className="ms-auto">
            <Button variant="dark" disabled={!canSave} onClick={handleSave} style={{ opacity: canSave ? 1 : 0.5 }}>
              {isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockTimeModal;
