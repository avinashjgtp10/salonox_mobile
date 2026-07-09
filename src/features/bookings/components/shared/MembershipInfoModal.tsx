import React from "react";
import type { ClientMembership } from "../../../../services/api/endpoints/clientMemberships.endpoints";

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "N/A";
  try {
    return new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return raw; }
}

interface Props {
  clientName: string;
  memberships: ClientMembership[];
  onClose: () => void;
}

export const MembershipInfoModal: React.FC<Props> = ({ clientName, memberships, onClose }) => {
  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>

        <div className="pkg-modal__header">
          <span className="pkg-modal__title">Membership Details</span>
          <button className="pkg-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="pkg-modal__body">
          <p className="pkg-modal__guest">Guest Name: <strong>{clientName}</strong></p>

          <div className="pkg-modal__cards">
            {memberships.map((m) => (
              <div key={m.id} className="pkg-card">
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Active Membership:</span>
                  <span className="pkg-card__val">{m.membershipName}</span>
                </div>
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Status:</span>
                  <span className="pkg-card__val">{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span>
                </div>
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Price:</span>
                  <span className="pkg-card__val">₹{Number(m.pricePaid ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Purchase Date:</span>
                  <span className="pkg-card__val">{fmtDate(m.purchasedAt)}</span>
                </div>
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Expiry Date:</span>
                  <span className="pkg-card__val">{fmtDate(m.expiresAt)}</span>
                </div>
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Sessions:</span>
                  <span className="pkg-card__val">
                    {m.totalSessions === 0 ? "Unlimited" : `${m.usedSessions} used / ${m.totalSessions} total`}
                  </span>
                </div>
                <div className="pkg-card__row">
                  <span className="pkg-card__lbl">Balance Amount:</span>
                  <span className="pkg-card__val">₹{Number(m.membershipWalletBalance ?? 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipInfoModal;
