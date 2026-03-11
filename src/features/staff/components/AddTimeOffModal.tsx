import React, { useState } from "react";
import "../styles/MemberRowMenu.scss";
export interface TimeOffFormData {
  memberId: number;
  type: string;
  startDate: string;
  startTime: string;
  endTime: string;
  repeat: boolean;
  description: string;
  approved: boolean;
}

interface Member { id: number; name: string; }

interface AddTimeOffModalProps {
  show: boolean;
  members: Member[];
  defaultMemberId?: number;
  defaultDate?: string;
  onClose: () => void;
  onSave: (data: TimeOffFormData) => void;
}

const LEAVE_TYPES = ["Annual leave", "Sick leave", "Personal leave", "Unpaid leave", "Other"];
const TIMES = ["6:00am","7:00am","8:00am","9:00am","10:00am","11:00am","12:00pm",
               "1:00pm","2:00pm","3:00pm","4:00pm","5:00pm","6:00pm","7:00pm","8:00pm"];

const AddTimeOffModal: React.FC<AddTimeOffModalProps> = ({
  show, members, defaultMemberId, defaultDate, onClose, onSave,
}) => {
  const [memberId, setMemberId]       = useState(defaultMemberId ?? members[0]?.id ?? 0);
  const [type, setType]               = useState("Annual leave");
  const [startDate, setStartDate]     = useState(defaultDate ?? "");
  const [startTime, setStartTime]     = useState("9:00am");
  const [endTime, setEndTime]         = useState("5:00pm");
  const [repeat, setRepeat]           = useState(false);
  const [description, setDescription] = useState("");
  const [approved, setApproved]       = useState(false);

  if (!show) return null;

  const handleSave = () => {
    onSave({ memberId, type, startDate, startTime, endTime, repeat, description, approved });
    onClose();
  };

  const startH = parseInt(startTime);
  const endH   = parseInt(endTime);
  const totalH = !isNaN(startH) && !isNaN(endH) ? Math.abs(endH - startH) + "h" : "–";

  return (
    <div className="toff-overlay" onClick={onClose}>
      <div className="toff-modal" onClick={e => e.stopPropagation()}>
        <button className="toff-modal__close" onClick={onClose}>✕</button>
        <h5 className="toff-modal__title">Add time off</h5>

        <div className="toff-modal__grid">
          <div className="toff-modal__field toff-modal__field--wide">
            <label className="toff-modal__label">Team member</label>
            <select className="toff-modal__select" value={memberId} onChange={e => setMemberId(+e.target.value)}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="toff-modal__field">
            <label className="toff-modal__label">Type</label>
            <select className="toff-modal__select" value={type} onChange={e => setType(e.target.value)}>
              {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="toff-modal__field toff-modal__field--date">
            <label className="toff-modal__label">Start date</label>
            <input className="toff-modal__input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className="toff-modal__field">
            <label className="toff-modal__label">Start time</label>
            <select className="toff-modal__select" value={startTime} onChange={e => setStartTime(e.target.value)}>
              {TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="toff-modal__field">
            <label className="toff-modal__label">End time</label>
            <select className="toff-modal__select" value={endTime} onChange={e => setEndTime(e.target.value)}>
              {TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="toff-modal__field toff-modal__field--full">
            <label className="toff-modal__check-label">
              <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} />
              Repeat
            </label>
          </div>

          <div className="toff-modal__field toff-modal__field--full">
            <label className="toff-modal__label toff-modal__label--between">
              <span>Description</span>
              <span className="toff-modal__char-count">{description.length}/100</span>
            </label>
            <textarea
              className="toff-modal__textarea"
              placeholder="Add description or note (optional)"
              maxLength={100}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="toff-modal__field toff-modal__field--full toff-modal__approve-row">
            <label className="toff-modal__check-label">
              <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />
              Approved
            </label>
            <span className="toff-modal__total">Time off total: <strong>{totalH}</strong></span>
          </div>

          <div className="toff-modal__field toff-modal__field--full">
            <p className="toff-modal__note">Online bookings cannot be placed during time off.</p>
          </div>

          <div className="toff-modal__field toff-modal__field--full toff-modal__actions">
            <button className="toff-modal__btn toff-modal__btn--cancel" onClick={onClose}>Cancel</button>
            <button className="toff-modal__btn toff-modal__btn--save" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTimeOffModal;