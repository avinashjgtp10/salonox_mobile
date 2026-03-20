import React, { useState } from "react";
import type { BlockedTime } from "../../types/scheduler-types";
import { STAFF_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import TimeSelect from "../shared/TimeSelect";

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
    const bt: BlockedTime = {
      id: "bt_" + Date.now(), staffId, date, startTime, endTime, reason,
    };
    addBlockedTime(bt);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,.45)", zIndex: 1000,
        display: "flex", justifyContent: "flex-end",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "min(400px,100vw)", background: "#fff",
        height: "100vh", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 14px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, background: "#fff", zIndex: 5,
        }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>✕</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Blocked Time</h2>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Date */}
          <div style={{ position: "relative" }}>
            <label className="label">Date *</label>
            <input
              readOnly value={date}
              onClick={() => setShowCal(v => !v)}
              className="form-input"
              style={{ cursor: "pointer" }}
            />
            {showCal && (
              <MiniCalendar value={date} onChange={setDate} onClose={() => setShowCal(false)} />
            )}
          </div>

          {/* Staff */}
          <div>
            <label className="label">Staff *</label>
            <select className="form-select" value={staffId} onChange={e => setStaffId(e.target.value)}>
              <option value="">Select Staff</option>
              {STAFF_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Start / End time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Start Time *</label>
              <TimeSelect
                value={startTime} onChange={setStartTime}
                interval={interval}
              />
            </div>
            <div>
              <label className="label">End Time *</label>
              <TimeSelect
                value={endTime} onChange={setEndTime}
                interval={interval}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="label">Reason</label>
            <textarea
              className="form-textarea" rows={4}
              value={reason} onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid #e5e7eb",
          display: "flex", justifyContent: "flex-end",
          position: "sticky", bottom: 0, background: "#fff",
        }}>
          <button
            className="btn-primary"
            style={{ padding: "10px 32px", opacity: canSave ? 1 : 0.5 }}
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockTimeModal;
