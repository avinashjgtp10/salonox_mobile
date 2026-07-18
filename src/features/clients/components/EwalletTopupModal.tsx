// src/features/clients/components/EwalletTopupModal.tsx
//
// Manual eWallet top-up — the only path allowed to credit ewallet_balance
// (reward points and referral credit are separate, own-redemption balances).
// Popup-over-calendar pattern, same shell as ClientHistoryModal/SellPackageModal.
import { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { EWALLET } from "../../../services/api/endpoints";
import { PaymentMethodPicker, type PaymentSplitEntry } from "../../../components/shared/PaymentMethodPicker";
import "../styles/ClientHistoryModal.scss";
import "./EwalletTopupModal.scss";

const TOPUP_METHODS = ["Cash", "Card", "UPI"];

interface Props {
  clientId: string;
  clientName?: string;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

export default function EwalletTopupModal({ clientId, clientName, onClose, onSuccess }: Props) {
  const [amount, setAmount]         = useState("");
  const [note, setNote]             = useState("");
  const [singleMethod, setSingleMethod] = useState<string | null>(null);
  const [payMethodError, setPayMethodError] = useState(false);
  // Unused in single-only mode, but required by PaymentMethodPicker's props.
  const [splitEntries, setSplitEntries] = useState<PaymentSplitEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const amountNum = parseFloat(amount) || 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleTopup = async () => {
    if (amountNum <= 0) { setError("Enter an amount greater than 0."); return; }
    if (!singleMethod) { setPayMethodError(true); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post(EWALLET.TOPUP(clientId), {
        amount: amountNum,
        payment_method: singleMethod.toLowerCase(),
        note: note.trim() || undefined,
      });
      const balance = res.data?.data?.balance ?? res.data?.balance;
      onSuccess?.(Number(balance) || 0);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to top up eWallet.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chm-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="chm-panel ewtm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ewtm-header">
          <h3>Top Up eWallet{clientName ? ` — ${clientName}` : ""}</h3>
          <button className="ewtm-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="ewtm-body">
          <label className="ewtm-label">Amount</label>
          <div className="ewtm-input-wrap">
            <span className="ewtm-pfx">₹</span>
            <input
              type="number" min={0} step={1} autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleTopup(); }}
            />
          </div>

          <PaymentMethodPicker
            methods={TOPUP_METHODS}
            paymentMode="single"
            onSetPaymentMode={() => {}}
            singleMethod={singleMethod}
            onSetSingleMethod={(m) => { setSingleMethod(m); setPayMethodError(false); }}
            splitEntries={splitEntries}
            onSetSplitEntries={setSplitEntries}
            payMethodError={payMethodError}
            totalToCollect={amountNum}
            partialAmtInput=""
            onSetPartialAmt={() => {}}
            printAfterPayment={false}
            onTogglePrint={() => {}}
            showSplitMode={false}
            showDueRow={false}
            showPrintOption={false}
          />

          <label className="ewtm-label">Note (optional)</label>
          <input
            type="text"
            className="ewtm-input"
            placeholder="e.g. Cash top-up at front desk"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && <p className="ewtm-error">{error}</p>}
        </div>

        <div className="ewtm-actions">
          <button className="ewtm-btn ewtm-btn--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="ewtm-btn ewtm-btn--dark"
            onClick={handleTopup}
            disabled={submitting || amountNum <= 0}
          >
            {submitting ? "Adding…" : amountNum > 0 ? `Add ₹${amountNum.toLocaleString("en-IN")}` : "Add to Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}
