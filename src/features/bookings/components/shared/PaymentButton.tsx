import React, { useRef, useState } from "react";
import { CheckCircleFill, RecordCircle } from "react-bootstrap-icons";

interface PaymentButtonProps {
  amount: number;
  onClick: () => Promise<void>;
  disabled?: boolean;
  isPartial?: boolean;
  label?: React.ReactNode;
  fullWidth?: boolean;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  onClick,
  disabled = false,
  isPartial = false,
  label,
  fullWidth = true,
}) => {
  const clickedRef = useRef(false);
  const [isPaying, setIsPaying] = useState(false);

  const bg = isPartial
    ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
    : "linear-gradient(135deg,#10b981,#059669)";
  const shadow = isPartial
    ? "0 4px 14px rgba(124,58,237,0.35)"
    : "0 4px 14px rgba(16,185,129,0.35)";

  const displayLabel = label ?? (isPartial
    ? <><RecordCircle size={13} style={{ marginRight: 4, verticalAlign: "middle", color: "#c4b5fd" }} />Confirm Partial — ₹{amount.toFixed(2)}</>
    : <><CheckCircleFill size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Confirm &amp; Pay — ₹{amount.toFixed(2)}</>);

  async function handleClick() {
    if (clickedRef.current || isPaying) return;
    clickedRef.current = true;
    setIsPaying(true);
    try {
      await onClick();
    } catch {
      // Validation failed or network error — re-enable so user can retry
      clickedRef.current = false;
      setIsPaying(false);
    }
  }

  const isDisabled = disabled || isPaying;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      style={{
        width: fullWidth ? "100%" : undefined,
        background: isDisabled ? "#d1d5db" : bg,
        boxShadow: isDisabled ? "none" : shadow,
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        fontWeight: 700,
        fontSize: 15,
        padding: "10px 20px",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.65 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "opacity 0.15s, box-shadow 0.15s",
      }}
    >
      {isPaying && (
        <span
          className="spinner-border spinner-border-sm"
          role="status"
          aria-hidden="true"
          style={{ width: 16, height: 16, borderWidth: 2 }}
        />
      )}
      {isPaying ? "Processing..." : displayLabel}
    </button>
  );
};

export default PaymentButton;
