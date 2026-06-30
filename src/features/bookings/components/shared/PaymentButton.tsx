import React, { useRef, useState } from "react";
import { CheckCircleFill, RecordCircle } from "react-bootstrap-icons";
import { currencySymbol } from "../../../../utils/currency";
import "../../styles/PaymentButton.scss";

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

  const displayLabel = label ?? (isPartial
    ? <><RecordCircle size={13} className="pay-btn__icon-partial" style={{ marginRight: 4, verticalAlign: "middle" }} />Confirm Partial — {currencySymbol}{amount.toFixed(2)}</>
    : <><CheckCircleFill size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Confirm &amp; Pay — {currencySymbol}{amount.toFixed(2)}</>);

  async function handleClick() {
    if (clickedRef.current || isPaying) return;
    clickedRef.current = true;
    setIsPaying(true);
    try {
      await onClick();
    } catch {
      clickedRef.current = false;
      setIsPaying(false);
    }
  }

  const isDisabled = disabled || isPaying;

  const btnClass = [
    "pay-btn",
    fullWidth ? "pay-btn--full" : "pay-btn--auto",
    isPartial ? "pay-btn--purple" : "pay-btn--green",
    isDisabled ? "pay-btn--disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={btnClass}
    >
      {isPaying && (
        <span
          className="spinner-border spinner-border-sm pay-btn__spinner"
          role="status"
          aria-hidden="true"
        />
      )}
      {isPaying ? "Processing..." : displayLabel}
    </button>
  );
};

export default PaymentButton;
