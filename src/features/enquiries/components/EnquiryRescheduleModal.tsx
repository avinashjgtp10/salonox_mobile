import { useEffect, useState } from "react";
import { Modal } from "../../../components/ui";
import type { Enquiry } from "../types/enquiry.types";
import { isoToDatetimeLocal } from "../utils/enquiryFormat";
import "../styles/EnquiryModal.scss";

interface Props {
  show: boolean;
  enquiry: Enquiry | null;
  onClose: () => void;
  onSave: (followUpAt: string) => void;
  saving?: boolean;
}

export default function EnquiryRescheduleModal({ show, enquiry, onClose, onSave, saving }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (show) setValue(isoToDatetimeLocal(enquiry?.follow_up_at ?? null));
  }, [show, enquiry]);

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Reschedule follow-up"
      footer={
        <>
          <button type="button" className="enq-btn enq-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="enq-btn enq-btn--primary"
            disabled={!value || saving}
            onClick={() => onSave(value)}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="enq-form">
        <div className="enq-field">
          <label className="enq-field__label">Follow-up Date &amp; Time</label>
          <input
            type="datetime-local"
            className="enq-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
