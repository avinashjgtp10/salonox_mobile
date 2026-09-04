import React, { useEffect, useRef, useState } from "react";
import { usePosPayment } from "../../hooks/usePosPayment";
import type { CreatePosPaymentPayload, PosPaymentRequest } from "../../types";

interface Props {
  isOpen: boolean;
  createPayload: CreatePosPaymentPayload | null;
  amount: number;
  currencySymbol: string;
  invoiceNumber?: string | null;
  onClose: () => void;
  onSuccess: (request: PosPaymentRequest) => void;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
};
const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 26px", width: 360,
  maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center",
};

export const POSPaymentModal: React.FC<Props> = ({
  isOpen, createPayload, amount, currencySymbol, invoiceNumber, onClose, onSuccess,
}) => {
  const { request, phase, error, start, cancel, confirmManual, reset } = usePosPayment();
  const [manualTxnId, setManualTxnId] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (isOpen && createPayload && !startedRef.current) {
      startedRef.current = true;
      void start(createPayload, onSuccess);
    }
    if (!isOpen) {
      startedRef.current = false;
      setManualTxnId("");
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, createPayload]);

  if (!isOpen) return null;

  const isManual = request?.provider === "manual";
  const isWaiting = phase === "creating" || phase === "waiting";

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {isWaiting && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
              {phase === "creating" ? "Sending to terminal…" : "Waiting for payment…"}
            </div>
            <div style={{
              width: 44, height: 44, margin: "14px auto",
              border: "4px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%",
              animation: "pos-spin 0.9s linear infinite",
            }} />
            <style>{"@keyframes pos-spin { to { transform: rotate(360deg); } }"}</style>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 8 }}>
              {currencySymbol}{amount.toFixed(2)}
            </div>
            {request?.payment_reference && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Reference: <strong>{request.payment_reference}</strong>
              </div>
            )}

            {isManual ? (
              <div style={{ marginTop: 18, textAlign: "left" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  Transaction ID from the machine
                </label>
                <input
                  className="form-control-custom"
                  style={{ width: "100%", marginTop: 4 }}
                  placeholder="e.g. TXN987654"
                  value={manualTxnId}
                  onChange={(e) => setManualTxnId(e.target.value)}
                />
                {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{error}</div>}
                <button
                  className="btn btn-dark"
                  style={{ width: "100%", marginTop: 10 }}
                  disabled={!manualTxnId.trim()}
                  onClick={() => void confirmManual(manualTxnId)}
                >
                  Confirm Payment
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#374151", marginTop: 14 }}>
                Please complete payment on the payment machine.
              </div>
            )}

            <button
              className="btn btn-outline-secondary"
              style={{ width: "100%", marginTop: 14 }}
              onClick={() => void cancel()}
            >
              Cancel Payment
            </button>
          </>
        )}

        {phase === "success" && (
          <>
            <div style={{ fontSize: 32, color: "#16a34a" }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 4 }}>Payment Successful</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#16a34a", marginTop: 8 }}>
              {currencySymbol}{amount.toFixed(2)} Paid
            </div>
            {request?.provider_transaction_id && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                Transaction: <strong>{request.provider_transaction_id}</strong>
              </div>
            )}
            {invoiceNumber && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                Invoice: <strong>{invoiceNumber}</strong>
              </div>
            )}
            <button className="btn btn-dark" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>
              Done
            </button>
          </>
        )}

        {(phase === "failed" || phase === "cancelled") && (
          <>
            <div style={{ fontSize: 32, color: "#dc2626" }}>✕</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 4 }}>
              {phase === "cancelled" ? "Payment Cancelled" : "Payment Failed"}
            </div>
            {(request?.review_reason || error) && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>{request?.review_reason || error}</div>
            )}
            <button
              className="btn btn-outline-secondary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={onClose}
            >
              Choose Another Method
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default POSPaymentModal;
