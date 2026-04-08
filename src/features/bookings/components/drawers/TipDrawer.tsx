import { useState } from "react";
import "../../styles/TipDrawer.scss";

interface Props {
  open: boolean;
  subtotal: number;
  onBack: () => void;
  onClose: () => void;
  onContinue: (total: number) => void;
}

export default function TipDrawer({
  open,
  subtotal,
  onBack,
  onClose,
  onContinue,
}: Props) {
  const [tipPercent, setTipPercent] = useState(0);

  if (!open) return null;

  const total = subtotal + (subtotal * tipPercent) / 100;

  return (
    <>
      {/* Overlay */}
      <div className="tip-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="tip-drawer">
        {/* HEADER */}
        <div className="drawer-header d-flex justify-content-between align-items-center">
          <button className="btn btn-link p-0" onClick={onBack}>
            ← Back
          </button>

          <span className="fw-semibold fs-5">Select Tip</span>

          <div style={{ width: "50px" }} />
        </div>

        {/* BODY */}
        <div className="drawer-body">
          {[0, 10, 18, 25].map((p) => (
            <div
              key={p}
              onClick={() => setTipPercent(p)}
              className={`tip-option ${tipPercent === p ? "active" : ""}`}
            >
              {p === 0
                ? "No tip"
                : `${p}% (₹${((subtotal * p) / 100).toFixed(0)})`}
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="drawer-footer">
          <div className="d-flex justify-content-between fw-semibold fs-5 mb-3">
            <span>Total</span>

            <span>₹{total}</span>
          </div>

          <button
            className="btn btn-dark w-100"
            onClick={() => onContinue(total)}
          >
            Continue to payment
          </button>
        </div>
      </div>
    </>
  );
}
