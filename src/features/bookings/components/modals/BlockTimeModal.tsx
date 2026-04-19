import React, { useState } from "react";
import type { BlockedTime } from "../../types/scheduler-types";
import { STAFF_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import TimeSelect from "../shared/TimeSelect";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";

interface Props {
  onClose: () => void;
  defaultStaffId?: string;
}

const BlockTimeModal: React.FC<Props> = ({ onClose, defaultStaffId }) => {
  const { addBlockedTime, currentDate, interval } = useSchedulerContext();

  const [date,      setDate]      = useState(currentDate);
  const [staffId,   setStaffId]   = useState(defaultStaffId || "");
  const [startTime, setStartTime] = useState("");
  const [endTime,   setEndTime]   = useState("");
  const [reason,    setReason]    = useState("");
  const [showCal,   setShowCal]   = useState(false);

  const canSave = !!staffId && !!startTime && !!endTime;

  function handleSave() {
    if (!canSave) return;
    const bt: BlockedTime = { id: "bt_" + Date.now(), staffId, date, startTime, endTime, reason };
    addBlockedTime(bt);
    onClose();
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-end"
      style={{ background: "rgba(0,0,0,.45)", zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="d-flex flex-column bg-white h-100" style={{ width: "min(400px,100vw)", overflowY: "auto" }}>

        {/* Header */}
        <div className="d-flex align-items-center gap-2 px-4 py-3 border-bottom sticky-top bg-white" style={{ zIndex: 5 }}>
          <button className="btn btn-sm btn-link text-dark p-0 text-decoration-none fs-5" onClick={onClose}>✕</button>
          <h5 className="mb-0 fw-bold">New Blocked Time</h5>
        </div>

        {/* Body */}
        <div className="p-4 d-flex flex-column gap-3 flex-grow-1">

          {/* Date */}
          <div className="position-relative">
            <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Date *</label>
            <input
              readOnly
              value={date}
              onClick={() => setShowCal((v) => !v)}
              className="form-control"
              style={{ cursor: "pointer" }}
            />
            {showCal && (
              <div className="position-absolute" style={{ top: "100%", left: 0, zIndex: 400 }}>
                <MiniCalendar value={date} onChange={(d) => { setDate(d); setShowCal(false); }} onClose={() => setShowCal(false)} />
              </div>
            )}
          </div>

          {/* Staff */}
          <div>
            <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Staff *</label>
            <select className="form-select" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Select Staff</option>
              {STAFF_LIST.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Start / End time */}
          <div className="row g-3">
            <div className="col">
              <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Start Time *</label>
              <TimeSelect value={startTime} onChange={setStartTime} interval={interval} className="form-select" />
            </div>
            <div className="col">
              <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>End Time *</label>
              <TimeSelect value={endTime} onChange={setEndTime} interval={interval} className="form-select" />
            </div>
          </div>

          {/* Reason */}
          <Input
            label="Reason"
            multiline
            rows={4}
            value={reason}
            onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)}
            placeholder="e.g. Staff on leave"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-top sticky-bottom bg-white d-flex justify-content-end">
          <Button variant="dark" disabled={!canSave} onClick={handleSave} style={{ opacity: canSave ? 1 : 0.5 }}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BlockTimeModal;