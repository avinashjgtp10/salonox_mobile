import { Modal } from "../../../components/ui";
import type { Enquiry } from "../types/enquiry.types";
import { ENQUIRY_SOURCES } from "../types/enquiry.types";
import { formatEnquiryId, formatEnquiryDate, formatFollowUpAt } from "../utils/enquiryFormat";
import "../styles/EnquiryModal.scss";

const sourceLabel = (value: string | null): string =>
  ENQUIRY_SOURCES.find((s) => s.value === value)?.label || "—";

interface Props {
  show: boolean;
  onClose: () => void;
  enquiry: Enquiry | null;
}

export default function EnquiryViewModal({ show, onClose, enquiry }: Props) {
  if (!enquiry) return null;

  return (
    <Modal show={show} onClose={onClose} title="Enquiry Details">
      <div className="enq-view">
        <div className="enq-view__row">
          <span className="enq-view__label">Enquiry ID</span>
          <span className="enq-view__value">{formatEnquiryId(enquiry.enquiry_no)}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Name</span>
          <span className="enq-view__value">{enquiry.name}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Phone</span>
          <span className="enq-view__value">{enquiry.phone}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Service</span>
          <span className="enq-view__value">{enquiry.service_name || "—"}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Staff</span>
          <span className="enq-view__value">{enquiry.staff_name || "—"}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Status</span>
          <span className={`enq-status-badge enq-status-${enquiry.status.toLowerCase().replace(/\s|-/g, "")}`}>
            {enquiry.status}
          </span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Date</span>
          <span className="enq-view__value">{formatEnquiryDate(enquiry.created_at)}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Source</span>
          <span className="enq-view__value">{sourceLabel(enquiry.source)}</span>
        </div>
        <div className="enq-view__row">
          <span className="enq-view__label">Follow-up</span>
          <span className="enq-view__value">{formatFollowUpAt(enquiry.follow_up_at)}</span>
        </div>
        <div className="enq-view__row enq-view__row--notes">
          <span className="enq-view__label">Notes</span>
          <span className="enq-view__value">{enquiry.notes || "—"}</span>
        </div>
      </div>
    </Modal>
  );
}
