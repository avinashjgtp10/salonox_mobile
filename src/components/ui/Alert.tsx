import React from "react";

type AlertVariant = "danger" | "success" | "warning" | "info" | "primary" | "secondary";

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({
  variant = "danger",
  message,
  className = "",
  onClose,
}) => {
  return (
    <div
      className={`alert alert-${variant} rounded-3 d-flex align-items-center justify-content-between mb-4 ${className}`}
      role="alert"
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={onClose}
        />
      )}
    </div>
  );
};

export default Alert;
