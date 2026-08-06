// src/features/clients/components/EwalletTopupModal.tsx
//
// Manual eWallet adjustment — the only path allowed to directly credit or
// debit ewallet_balance by hand (reward points and referral credit are
// separate, own-redemption balances). Supports both directions so staff can
// correct a mistake (e.g. topped up the wrong amount) without inventing a
// fake "negative topup" or losing the record of what happened — both
// directions go through the same server-side ledger (ewallet_ledger) as
// every other credit/debit on this wallet.
// Popup-over-calendar pattern, same shell as ClientHistoryModal.
import { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { EWALLET } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/ClientHistoryModal.scss";
import "./EwalletTopupModal.scss";

interface Props {
  clientId: string;
  clientName?: string;
  /** Current wallet balance, if known — enables client-side validation so a
   *  debit can never be entered larger than what's actually available. */
  currentBalance?: number;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

type Direction = "credit" | "debit";

export default function EwalletTopupModal({ clientId, clientName, currentBalance, onClose, onSuccess }: Props) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [direction, setDirection]   = useState<Direction>("credit");
  const [amount, setAmount]         = useState("");
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const isDebit = direction === "debit";
  // A debit is specifically for correcting a mistake, so — unlike a topup —
  // it must always carry a reason for the audit trail. A topup's note stays
  // optional (it's just extra context on real money that was actually handed over).
  const reasonMissing = isDebit && !note.trim();
  const debitExceedsBalance = isDebit && currentBalance != null && amountNum > currentBalance;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Switching direction invalidates whatever error was showing for the other mode.
  function handleSetDirection(next: Direction) {
    setDirection(next);
    setError(null);
  }

  const handleSubmit = async () => {
    if (amountNum <= 0) { setError("Enter an amount greater than 0."); return; }
    if (reasonMissing) { setError("A reason is required to debit the wallet."); return; }
    if (debitExceedsBalance) { setError(`Cannot debit more than the available balance (${currencySymbol}${(currentBalance ?? 0).toFixed(2)}).`); return; }
    setSubmitting(true);
    setError(null);
    try {
      let balance: number;
      if (isDebit) {
        const res = await api.post(EWALLET.ADJUST(clientId), {
          direction: "debit",
          amount: amountNum,
          reason: note.trim(),
        });
        balance = Number(res.data?.data?.balance ?? res.data?.balance) || 0;
      } else {
        // No payment-method step here — this just credits the wallet directly.
        // The backend requires a value from {cash,card,upi}, so this is a fixed
        // placeholder rather than something staff choose.
        const res = await api.post(EWALLET.TOPUP(clientId), {
          amount: amountNum,
          payment_method: "cash",
          note: note.trim() || undefined,
        });
        balance = Number(res.data?.data?.balance ?? res.data?.balance) || 0;
      }
      onSuccess?.(balance);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || `Failed to ${isDebit ? "debit" : "top up"} eWallet.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chm-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="chm-panel ewtm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ewtm-header">
          <h3>Adjust eWallet{clientName ? ` — ${clientName}` : ""}</h3>
          <button className="ewtm-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="ewtm-body">
          <div className="ewtm-direction-toggle">
            <button
              type="button"
              className={`ewtm-direction-btn${!isDebit ? " ewtm-direction-btn--active" : ""}`}
              onClick={() => handleSetDirection("credit")}
            >
              + Add
            </button>
            <button
              type="button"
              className={`ewtm-direction-btn ewtm-direction-btn--debit${isDebit ? " ewtm-direction-btn--active" : ""}`}
              onClick={() => handleSetDirection("debit")}
            >
              − Deduct
            </button>
          </div>

          {currentBalance != null && (
            <p className="ewtm-balance-hint">Available balance: {currencySymbol}{currentBalance.toFixed(2)}</p>
          )}

          <label className="ewtm-label">Amount</label>
          <div className="ewtm-input-wrap">
            <span className="ewtm-pfx">{currencySymbol}</span>
            <input
              type="number" min={0} step={1} autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>

          <label className="ewtm-label">
            {isDebit ? "Reason" : "Note (optional)"}
            {isDebit && <span className="ewtm-req-star">*</span>}
          </label>
          <input
            type="text"
            className="ewtm-input"
            placeholder={isDebit ? "e.g. Corrected an incorrect top-up" : "e.g. Cash top-up at front desk"}
            value={note}
            onChange={(e) => { setNote(e.target.value); setError(null); }}
          />

          {error && <p className="ewtm-error">{error}</p>}
        </div>

        <div className="ewtm-actions">
          <button className="ewtm-btn ewtm-btn--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className={`ewtm-btn ${isDebit ? "ewtm-btn--danger" : "ewtm-btn--dark"}`}
            onClick={handleSubmit}
            disabled={submitting || amountNum <= 0 || reasonMissing || debitExceedsBalance}
          >
            {submitting
              ? (isDebit ? "Deducting…" : "Adding…")
              : amountNum > 0
                ? `${isDebit ? "Deduct" : "Add"} ${formatAmount(amountNum)}`
                : (isDebit ? "Deduct from Wallet" : "Add to Wallet")}
          </button>
        </div>
      </div>
    </div>
  );
}
