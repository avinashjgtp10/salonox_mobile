import React, { useState, useRef } from "react";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "dark"
    | "light"
    | "outline-primary"
    | "outline-secondary"
    | "outline-success"
    | "outline-danger"
    | "outline-warning"
    | "outline-info"
    | "outline-dark"
    | "outline-light"
    | "outline"
    | "ghost"
    | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  pill?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  // Auto-disable-after-click: prevents double submission, shows spinner, locks on success
  autoDisable?: boolean;
  successLabel?: string;
  onError?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  pill = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  className = "",
  children,
  disabled,
  onClick,
  autoDisable = false,
  successLabel = "✓ Done",
  onError,
  ...props
}) => {
  const clickedRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!autoDisable) {
      onClick?.(e);
      return;
    }
    if (clickedRef.current) return; // double-click guard (sync ref, not state)
    clickedRef.current = true;
    setIsProcessing(true);
    try {
      await onClick?.(e);
      setIsProcessing(false);
      setIsSuccess(true);
    } catch {
      clickedRef.current = false;
      setIsProcessing(false);
      onError?.();
    }
  }

  const isDisabled = disabled || loading || (autoDisable && (isProcessing || isSuccess));
  const showLoading = loading || isProcessing;
  const label = autoDisable && isSuccess ? successLabel : children;
  const activeVariant = autoDisable && isSuccess ? "success" : variant;

  const baseClass =
    "btn d-inline-flex align-items-center justify-content-center gap-2 transition-all";
  const variantClass = `btn-${activeVariant}`;
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const widthClass = fullWidth ? "w-100" : "";
  const roundedClass = pill ? "rounded-pill" : "rounded-3";

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${roundedClass} ${className}`}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {showLoading && (
        <span
          className="spinner-border spinner-border-sm"
          role="status"
          aria-hidden="true"
        />
      )}
      {!showLoading && iconLeft}
      {label}
      {!showLoading && iconRight}
    </button>
  );
};

export default Button;
