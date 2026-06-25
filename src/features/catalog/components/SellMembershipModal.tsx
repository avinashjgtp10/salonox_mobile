import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { XLg, CheckCircleFill } from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import type { Membership } from "../../../services/api/endpoints/memberships.endpoints";
import ClientSelectorWithAdd from "../../../components/packages/ClientSelectorWithAdd";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import { purchaseClientMembershipThunk } from "../../../middleware/clientMembership/clientMembership.thunk";
import "./SellMembershipModal.scss";

interface Props {
  membership: Membership | null;
  onClose: () => void;
}

const SellMembershipModal: React.FC<Props> = ({ membership, onClose }) => {
  const dispatch      = useDispatch<AppDispatch>();
  const salonId       = useSelector((s: any) => s.salon?.currentSalon?.id);
  const [client,      setClient]      = useState<ClientSearchResult | null>(null);
  const [selling,     setSelling]     = useState(false);
  const [sellSuccess, setSellSuccess] = useState(false);
  const [sellError,   setSellError]   = useState<string | null>(null);

  // Reset form state when membership changes
  useEffect(() => {
    setClient(null);
    setSellSuccess(false);
    setSellError(null);
    setSelling(false);
  }, [membership?.id]);

  if (!membership) return null;

  const handleSell = async () => {
    if (!client || selling) return;
    setSelling(true);
    setSellError(null);
    const result = await dispatch(purchaseClientMembershipThunk({
      clientId:       String(client.id),
      membershipId:   String(membership.id),
      membershipName: membership.name,
      colour:         membership.colour,
      totalSessions:  membership.sessionType === "unlimited" ? 0 : (membership.numberOfSessions ?? 0),
      pricePaid:      Number(membership.price) || 0,
    }));
    setSelling(false);
    if (purchaseClientMembershipThunk.fulfilled.match(result)) {
      setSellSuccess(true);
      try {
        const cid = String(client.id);
        const ref = String(membership.id);
        const sid = salonId || "g";
        const purchaseKey = `mem2:P:${sid}:${cid}:${ref}`;
        const indexKey    = `mem2:I:${sid}:${cid}`;
        localStorage.setItem(purchaseKey, JSON.stringify({
          membershipName: membership.name,
          pricePaid:      Number(membership.price) || 0,
          colour:         membership.colour || "#1a1a2e",
          membershipId:   ref,
          purchasedAt:    new Date().toISOString(),
          clientName:     `${client.first_name} ${client.last_name ?? ""}`.trim(),
          mobile:         client.phone_number || "",
          clientId:       cid,
        }));
        const idx: string[] = JSON.parse(localStorage.getItem(indexKey) || "[]");
        if (!idx.includes(ref)) { idx.push(ref); localStorage.setItem(indexKey, JSON.stringify(idx)); }
      } catch { /* ignore */ }
      setClient(null);
    } else {
      setSellError((result.payload as string) ?? "Failed to sell membership");
    }
  };

  return createPortal(
    <div className="smm-overlay" onClick={onClose}>
      <div className="smm" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="smm__header">
          <div className="smm__header-info">
            <span
              className="smm__color-dot"
              style={{ background: membership.colour || "#1a1a2e" }}
            />
            <div>
              <h3 className="smm__title">Select Client</h3>
              <p className="smm__sub">
                {membership.name} &middot; ₹{Number(membership.price).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <button className="smm__close" onClick={onClose}>
            <XLg size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="smm__body">
          {sellSuccess && (
            <div className="smm__success">
              <CheckCircleFill size={14} /> Membership sold successfully!
            </div>
          )}
          {sellError && (
            <div className="smm__error">{sellError}</div>
          )}

          <ClientSelectorWithAdd
            placeholder="Search client by name or mobile number..."
            onSelect={c => { setClient(c); setSellSuccess(false); setSellError(null); }}
          />

          {client && (
            <button
              className="smm__sell-btn"
              onClick={handleSell}
              disabled={selling}
            >
              {selling
                ? "Selling…"
                : `Sell ₹${Number(membership.price).toLocaleString("en-IN")} to ${client.first_name} ${client.last_name ?? ""}`.trim()}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default SellMembershipModal;
