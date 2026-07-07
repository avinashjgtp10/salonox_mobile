import React, { useState } from "react";
import api from "../../../../services/api/axios";
import { currencySymbol } from "../../utils/currency";

interface Props {
  clientId: string;
  clientName: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export const EwalletTopUpModal: React.FC<Props> = ({ clientId, clientName, currentBalance, onClose, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/api/v1/ewallet/${clientId}/topup`, { amount: parsed, note: note || undefined });
      const newBalance = Number(res.data?.data?.balance ?? currentBalance + parsed);
      onSuccess(newBalance);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to top up eWallet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>

        <div className="pkg-modal__header">
          <span className="pkg-modal__title">Top Up eWallet</span>
          <button className="pkg-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="pkg-modal__body">
          <p className="pkg-modal__guest">Guest Name: <strong>{clientName}</strong></p>
          <p className="pkg-modal__guest">Current Balance: <strong>{currencySymbol}{currentBalance.toFixed(2)}</strong></p>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Amount to add ({currencySymbol})
              </label>
              <input
                type="number" min={1} step="0.01" autoFocus
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
                placeholder="e.g. 500"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
                placeholder="e.g. Cash deposit"
              />
            </div>
            {error && <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{error}</div>}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                background: "#111827", color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Adding…" : "Add to eWallet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EwalletTopUpModal;
