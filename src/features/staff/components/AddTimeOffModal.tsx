import React, { useState } from "react";
import "../styles/AddTimeOffModal.scss";

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

interface Member {
  id: number;
  name: string;
}

interface AddTimeOffModalProps {
  show: boolean;
  members: Member[];
  defaultMemberId?: number;
  defaultDate?: string;
  onClose: () => void;
  onSave: (data: TimeOffFormData) => void;
}

const LEAVE_TYPES = [
  "Annual leave",
  "Sick leave",
  "Personal leave",
  "Unpaid leave",
  "Other",
];
const TIMES = [
  "12:00 AM",
  "1:00 AM",
  "2:00 AM",
  "3:00 AM",
  "4:00 AM",
  "5:00 AM",
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
];

const AddTimeOffModal: React.FC<AddTimeOffModalProps> = ({
  show,
  members,
  defaultMemberId,
  defaultDate,
  onClose,
  onSave,
}) => {
  const [memberId, setMemberId] = useState(
    defaultMemberId ?? members[0]?.id ?? 0,
  );
  const [type, setType] = useState("Annual leave");
  const [startDate, setStartDate] = useState(defaultDate ?? "");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("7:00 PM");
  const [repeat, setRepeat] = useState(false);
  const [description, setDescription] = useState("");
  const [approved, setApproved] = useState(false);

  if (!show) return null;

  const handleSave = () => {
    onSave({
      memberId,
      type,
      startDate,
      startTime,
      endTime,
      repeat,
      description,
      approved,
    });
    onClose();
  };

  return (
    <div className="toff-overlay" onClick={onClose}>
      <div className="toff-modal" onClick={(e) => e.stopPropagation()}>
        <button className="toff-modal__close" onClick={onClose}>
          ✕
        </button>
        <h5 className="toff-modal__title">Add time off</h5>

        <div className="toff-modal__grid">
          <div className="toff-modal__row">
            <div className="toff-modal__field">
              <label className="toff-modal__label">Team member</label>
              <select
                className="toff-modal__select"
                value={memberId}
                onChange={(e) => setMemberId(+e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="toff-modal__field">
              <label className="toff-modal__label">Type</label>
              <select
                className="toff-modal__select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="toff-modal__row toff-modal__row--three">
            <div className="toff-modal__field">
              <label className="toff-modal__label">Start date</label>
              <input
                className="toff-modal__input"
                type="text"
                value={startDate || "Mon, Mar 23, 2026"}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="toff-modal__field">
              <label className="toff-modal__label">Start time</label>
              <select
                className="toff-modal__select"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {TIMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="toff-modal__field">
              <label className="toff-modal__label">End time</label>
              <select
                className="toff-modal__select"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {TIMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="toff-modal__field">
            <label className="toff-modal__check-label">
              <input
                type="checkbox"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
              />
              Repeat
            </label>
          </div>

          <div className="toff-modal__field">
            <label className="toff-modal__label">
              <span>Description</span>
              <span className="toff-modal__char-count">
                {description.length}/100
              </span>
            </label>
            <textarea
              className="toff-modal__textarea"
              placeholder="Add description or note (optional)"
              maxLength={100}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="toff-modal__approve-row">
            <label className="toff-modal__check-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              Approved
            </label>
            <span className="toff-modal__total">
              Time off total: <strong>9 hr</strong>
            </span>
          </div>

          <p className="toff-modal__note">
            Online bookings cannot be placed during time off.
          </p>

          <div className="toff-modal__actions">
            <button
              className="toff-modal__btn toff-modal__btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="toff-modal__btn toff-modal__btn--save"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTimeOffModal;
