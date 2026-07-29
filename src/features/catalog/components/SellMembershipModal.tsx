import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { XLg, CheckCircleFill } from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import type { Membership } from "../../../services/api/endpoints/memberships.endpoints";
import ClientSelectorWithAdd from "../../../components/packages/ClientSelectorWithAdd";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import { purchaseClientMembershipThunk } from "../../../middleware/clientMembership/clientMembership.thunk";
import { PaymentMethodPicker, type PaymentSplitEntry } from "../../../components/shared/PaymentMethodPicker";
import { buildMethodLabel } from "../../bookings/utils/paymentUtils";
import type { SingleMethod } from "../../bookings/types/payment.types";
import { useCurrency } from "../../../hooks/useCurrency";
import "./SellMembershipModal.scss";

const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];

interface Props {
  membership: Membership | null;
  onClose: () => void;
}

const SellMembershipModal: React.FC<Props> = ({ membership, onClose }) => {
  const dispatch      = useDispatch<AppDispatch>();
  const { formatAmount } = useCurrency();
  const salonId       = useSelector((s: any) => s.salon?.currentSalon?.id);
  const [client,      setClient]      = useState<ClientSearchResult | null>(null);
  const [selling,     setSelling]     = useState(false);
  const [sellSuccess, setSellSuccess] = useState(false);
  const [sellError,   setSellError]   = useState<string | null>(null);

  const [paymentMode,    setPaymentMode]    = useState<"single" | "split">("single");
  const [singleMethod,   setSingleMethod]   = useState<SingleMethod | null>(null);
  const [splitEntries,   setSplitEntries]   = useState<PaymentSplitEntry[]>([]);
  const [payMethodError, setPayMethodError] = useState(false);
  const [partialAmtInput, setPartialAmtInput] = useState("");
  const [printAfterPayment, setPrintAfterPayment] = useState(false);

  // Reset form state when membership changes
  useEffect(() => {
    setClient(null);
    setSellSuccess(false);
    setSellError(null);
    setSelling(false);
    setPaymentMode("single");
    setSingleMethod(null);
    setSplitEntries([]);
    setPayMethodError(false);
    setPartialAmtInput("");
  }, [membership?.id]);

  if (!membership) return null;

  const price = Number(membership.price) || 0;

  const handleSell = async () => {
    if (!client || selling) return;

    if (paymentMode === "single" && !singleMethod) {
      setPayMethodError(true);
      return;
    }
    const splitTotal = splitEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    if (paymentMode === "split" && splitTotal < price) {
      setPayMethodError(true);
      return;
    }

    const methodsMap: Record<string, number> = paymentMode === "split"
      ? splitEntries.reduce((acc, e) => {
          const amt = parseFloat(e.amount) || 0;
          if (amt > 0) acc[e.method] = (acc[e.method] || 0) + amt;
          return acc;
        }, {} as Record<string, number>)
      : {};
    const methodLabel = buildMethodLabel(paymentMode, singleMethod, methodsMap);

    setSelling(true);
    setSellError(null);
    setPayMethodError(false);
    const result = await dispatch(purchaseClientMembershipThunk({
      clientId:       String(client.id),
      membershipId:   String(membership.id),
      membershipName: membership.name,
      colour:         membership.colour,
      totalSessions:  membership.sessionType === "unlimited" ? 0 : (membership.numberOfSessions ?? 0),
      pricePaid:      price,
      paymentMethod:  methodLabel,
      splitDetails:   paymentMode === "split" ? methodsMap : undefined,
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
      setSingleMethod(null);
      setSplitEntries([]);
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
                {membership.name} &middot; {formatAmount(Number(membership.price))}
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
            <>
              <PaymentMethodPicker
                methods={SINGLE_METHODS}
                paymentMode={paymentMode}
                onSetPaymentMode={setPaymentMode}
                singleMethod={singleMethod}
                onSetSingleMethod={(m) => { setSingleMethod(m as SingleMethod); setPayMethodError(false); }}
                splitEntries={splitEntries}
                onSetSplitEntries={setSplitEntries}
                payMethodError={payMethodError}
                totalToCollect={price}
                partialAmtInput={partialAmtInput}
                onSetPartialAmt={setPartialAmtInput}
                printAfterPayment={printAfterPayment}
                onTogglePrint={setPrintAfterPayment}
                showDueRow={false}
                showPrintOption={false}
              />
              <button
                className="smm__sell-btn"
                onClick={handleSell}
                disabled={selling}
              >
                {selling
                  ? "Selling…"
                  : `Sell ${formatAmount(Number(membership.price))} to ${client.first_name} ${client.last_name ?? ""}`.trim()}
              </button>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default SellMembershipModal;
